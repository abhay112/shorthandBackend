import AuditLog from '../models/AuditLog.js';
import logger from '../utils/logger.js';
import { v4 as uuidv4 } from 'uuid';

class AuditService {
  /**
   * Log an action to the audit trail
   * @param {Object} auditData - The audit data
   * @returns {Promise<AuditLog>} The created audit log
   */
  static async logAction({
    entityType,
    entityId,
    action,
    performedBy,
    changes = {},
    metadata = {},
    reason = null,
    severity = 'MEDIUM',
    batchId = null,
    testId = null,
    tags = [],
    category = null
  }) {
    try {
      // Ensure we have required user context
      if (!performedBy || !performedBy.userId) {
        logger.warn('Audit log attempted without user context', { action, entityType, entityId });
        return null;
      }

      const auditLog = new AuditLog({
        entityType,
        entityId,
        action,
        performedBy: {
          userId: performedBy.userId,
          userType: performedBy.userType || (performedBy.role === 'student' ? 'Student' : 'Admin'),
          userName: performedBy.userName || performedBy.name,
          userEmail: performedBy.userEmail || performedBy.email
        },
        changes,
        metadata: {
          ...metadata,
          requestId: metadata.requestId || uuidv4()
        },
        reason,
        severity,
        batchId,
        testId,
        tags,
        category
      });

      await auditLog.save();
      
      // Log critical actions to application logs as well
      if (severity === 'CRITICAL' || severity === 'HIGH') {
        logger.warn(`AUDIT: ${action}`, {
          entityType,
          entityId,
          performedBy: auditLog.performedBy.userEmail,
          severity,
          reason
        });
      }

      return auditLog;
    } catch (error) {
      logger.error('Failed to create audit log', { 
        error: error.message, 
        action, 
        entityType, 
        entityId 
      });
      // Don't throw - audit logging shouldn't break main functionality
      return null;
    }
  }

  /**
   * Get history for a specific entity
   * @param {string} entityType - Type of entity
   * @param {string} entityId - ID of entity
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Paginated audit logs
   */
  static async getEntityHistory(entityType, entityId, options = {}) {
    try {
      const { 
        page = 1, 
        limit = 50, 
        action = null,
        startDate = null,
        endDate = null,
        severity = null
      } = options;
      
      const query = { entityType, entityId };
      
      if (action) query.action = action;
      if (severity) query.severity = severity;
      
      if (startDate || endDate) {
        query.timestamp = {};
        if (startDate) query.timestamp.$gte = new Date(startDate);
        if (endDate) query.timestamp.$lte = new Date(endDate);
      }

      const logs = await AuditLog.find(query)
        .sort({ timestamp: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit)
        .populate('performedBy.userId', 'name email')
        .lean();

      const total = await AuditLog.countDocuments(query);

      return {
        logs,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      logger.error('Failed to get entity history', { error: error.message, entityType, entityId });
      throw error;
    }
  }

  /**
   * Get activity for a specific user
   * @param {string} userId - User ID
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Paginated audit logs
   */
  static async getUserActivity(userId, options = {}) {
    try {
      const { 
        page = 1, 
        limit = 50, 
        startDate = null, 
        endDate = null,
        action = null,
        category = null
      } = options;
      
      const query = { 'performedBy.userId': userId };
      
      if (action) query.action = action;
      if (category) query.category = category;
      
      if (startDate || endDate) {
        query.timestamp = {};
        if (startDate) query.timestamp.$gte = new Date(startDate);
        if (endDate) query.timestamp.$lte = new Date(endDate);
      }

      const logs = await AuditLog.find(query)
        .sort({ timestamp: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit)
        .lean();

      const total = await AuditLog.countDocuments(query);

      // Get activity summary
      const activitySummary = await AuditLog.aggregate([
        { $match: { 'performedBy.userId': userId } },
        {
          $group: {
            _id: '$action',
            count: { $sum: 1 },
            lastAction: { $max: '$timestamp' }
          }
        },
        { $sort: { count: -1 } }
      ]);

      return {
        logs,
        summary: activitySummary,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      logger.error('Failed to get user activity', { error: error.message, userId });
      throw error;
    }
  }

  /**
   * Get system-wide activity
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Paginated audit logs
   */
  static async getSystemActivity(options = {}) {
    try {
      const { 
        page = 1, 
        limit = 100, 
        action = null, 
        severity = null,
        category = null,
        startDate = null, 
        endDate = null,
        entityType = null
      } = options;
      
      const query = {};
      
      if (action) query.action = action;
      if (severity) query.severity = severity;
      if (category) query.category = category;
      if (entityType) query.entityType = entityType;
      
      if (startDate || endDate) {
        query.timestamp = {};
        if (startDate) query.timestamp.$gte = new Date(startDate);
        if (endDate) query.timestamp.$lte = new Date(endDate);
      }

      const logs = await AuditLog.find(query)
        .sort({ timestamp: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit)
        .populate('performedBy.userId', 'name email')
        .lean();

      const total = await AuditLog.countDocuments(query);

      return {
        logs,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      logger.error('Failed to get system activity', { error: error.message });
      throw error;
    }
  }

  /**
   * Get critical actions (HIGH and CRITICAL severity)
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Critical audit logs
   */
  static async getCriticalActions(options = {}) {
    try {
      const { hours = 24, limit = 100 } = options;
      
      const query = {
        severity: { $in: ['HIGH', 'CRITICAL'] },
        timestamp: {
          $gte: new Date(Date.now() - hours * 60 * 60 * 1000)
        }
      };

      const logs = await AuditLog.find(query)
        .sort({ timestamp: -1 })
        .limit(limit)
        .populate('performedBy.userId', 'name email')
        .lean();

      return logs;
    } catch (error) {
      logger.error('Failed to get critical actions', { error: error.message });
      throw error;
    }
  }

  /**
   * Get audit statistics
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Audit statistics
   */
  static async getAuditStatistics(options = {}) {
    try {
      const { days = 30 } = options;
      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      const stats = await AuditLog.aggregate([
        { $match: { timestamp: { $gte: startDate } } },
        {
          $group: {
            _id: null,
            totalActions: { $sum: 1 },
            uniqueUsers: { $addToSet: '$performedBy.userId' },
            actionBreakdown: {
              $push: {
                action: '$action',
                severity: '$severity',
                category: '$category'
              }
            }
          }
        },
        {
          $project: {
            totalActions: 1,
            uniqueUserCount: { $size: '$uniqueUsers' },
            actionBreakdown: 1
          }
        }
      ]);

      // Get daily activity
      const dailyActivity = await AuditLog.aggregate([
        { $match: { timestamp: { $gte: startDate } } },
        {
          $group: {
            _id: {
              year: { $year: '$timestamp' },
              month: { $month: '$timestamp' },
              day: { $dayOfMonth: '$timestamp' }
            },
            count: { $sum: 1 },
            criticalCount: {
              $sum: {
                $cond: [
                  { $in: ['$severity', ['HIGH', 'CRITICAL']] },
                  1,
                  0
                ]
              }
            }
          }
        },
        { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
      ]);

      return {
        summary: stats[0] || {
          totalActions: 0,
          uniqueUserCount: 0,
          actionBreakdown: []
        },
        dailyActivity
      };
    } catch (error) {
      logger.error('Failed to get audit statistics', { error: error.message });
      throw error;
    }
  }

  /**
   * Archive old audit logs
   * @param {number} olderThanDays - Archive logs older than this many days
   * @returns {Promise<Object>} Archive result
   */
  static async archiveOldLogs(olderThanDays = 2555) { // ~7 years
    try {
      const cutoffDate = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000);
      
      const result = await AuditLog.updateMany(
        { 
          timestamp: { $lt: cutoffDate }, 
          isArchived: false 
        },
        { 
          isArchived: true,
          $unset: { 
            'changes.before': '',
            'changes.after': '',
            'metadata.userAgent': ''
          }
        }
      );

      logger.info(`Archived ${result.modifiedCount} audit logs older than ${olderThanDays} days`);
      
      return {
        archivedCount: result.modifiedCount,
        cutoffDate
      };
    } catch (error) {
      logger.error('Failed to archive old logs', { error: error.message });
      throw error;
    }
  }

  /**
   * Delete archived logs (for compliance)
   * @param {number} olderThanDays - Delete archived logs older than this many days
   * @returns {Promise<Object>} Deletion result
   */
  static async deleteArchivedLogs(olderThanDays = 2920) { // ~8 years
    try {
      const cutoffDate = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000);
      
      const result = await AuditLog.deleteMany({
        timestamp: { $lt: cutoffDate },
        isArchived: true
      });

      logger.info(`Deleted ${result.deletedCount} archived audit logs older than ${olderThanDays} days`);
      
      return {
        deletedCount: result.deletedCount,
        cutoffDate
      };
    } catch (error) {
      logger.error('Failed to delete archived logs', { error: error.message });
      throw error;
    }
  }

  /**
   * Quick helper methods for common audit actions
   */
  static async logLogin(user, metadata = {}) {
    return this.logAction({
      entityType: user.role === 'student' ? 'Student' : 'Admin',
      entityId: user.id,
      action: 'LOGIN',
      performedBy: user,
      metadata,
      severity: 'LOW',
      category: 'AUTHENTICATION'
    });
  }

  static async logLogout(user, metadata = {}) {
    return this.logAction({
      entityType: user.role === 'student' ? 'Student' : 'Admin',
      entityId: user.id,
      action: 'LOGOUT',
      performedBy: user,
      metadata,
      severity: 'LOW',
      category: 'AUTHENTICATION'
    });
  }

  static async logStudentApproval(studentId, isApproved, performedBy, metadata = {}) {
    return this.logAction({
      entityType: 'Student',
      entityId: studentId,
      action: isApproved ? 'APPROVE' : 'DISAPPROVE',
      performedBy,
      metadata,
      severity: 'HIGH',
      category: 'AUTHORIZATION',
      reason: `Student ${isApproved ? 'approved' : 'disapproved'} for test access`
    });
  }

  static async logTestSubmission(result, performedBy, metadata = {}) {
    return this.logAction({
      entityType: 'Result',
      entityId: result._id,
      action: 'SUBMIT_RESULT',
      performedBy,
      metadata,
      severity: 'MEDIUM',
      category: 'TEST_ACTIVITY',
      testId: result.testId,
      batchId: result.batchId,
      changes: {
        after: {
          wpm: result.wpm,
          accuracy: result.accuracy,
          attemptNumber: result.attemptNumber
        }
      }
    });
  }

  static async logTestSessionStart(session, performedBy, metadata = {}) {
    return this.logAction({
      entityType: 'TestSession',
      entityId: session._id,
      action: 'START_TEST_SESSION',
      performedBy,
      metadata,
      severity: 'MEDIUM',
      category: 'TEST_ACTIVITY',
      testId: session.testId,
      batchId: session.batchId
    });
  }
}

export default AuditService;
