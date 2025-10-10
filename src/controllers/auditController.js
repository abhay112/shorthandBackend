import AuditService from '../services/auditService.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { sendResponse } from '../utils/sendResponse.js';
import { AppError } from '../utils/AppError.js';

/**
 * Get audit history for a specific entity
 */
export const getEntityAuditHistory = asyncHandler(async (req, res) => {
  const { entityType, entityId } = req.params;
  const { 
    page = 1, 
    limit = 50, 
    action = null,
    startDate = null,
    endDate = null,
    severity = null
  } = req.query;

  // Validate entity type
  const validEntityTypes = ['Student', 'Admin', 'Test', 'Batch', 'Result', 'TestSession'];
  if (!validEntityTypes.includes(entityType)) {
    throw new AppError('Invalid entity type', 400);
  }

  const options = {
    page: parseInt(page),
    limit: parseInt(limit),
    action,
    startDate,
    endDate,
    severity
  };

  const history = await AuditService.getEntityHistory(entityType, entityId, options);

  return sendResponse(res, 200, true, 'Entity audit history retrieved successfully', history, {
    adminId: req.user.id,
    entityType,
    entityId,
    recordCount: history.logs.length
  });
});

/**
 * Get user activity audit logs
 */
export const getUserAuditActivity = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { 
    page = 1, 
    limit = 50, 
    startDate = null, 
    endDate = null,
    action = null,
    category = null
  } = req.query;

  // Check if user can access this data
  if (req.user.role === 'student' && req.user.id !== userId) {
    throw new AppError('You can only access your own audit history', 403);
  }

  const options = {
    page: parseInt(page),
    limit: parseInt(limit),
    startDate,
    endDate,
    action,
    category
  };

  const activity = await AuditService.getUserActivity(userId, options);

  return sendResponse(res, 200, true, 'User audit activity retrieved successfully', activity, {
    adminId: req.user.id,
    targetUserId: userId,
    recordCount: activity.logs.length
  });
});

/**
 * Get system-wide audit activity (Admin only)
 */
export const getSystemAuditActivity = asyncHandler(async (req, res) => {
  const { 
    page = 1, 
    limit = 100, 
    action = null, 
    severity = null,
    category = null,
    startDate = null, 
    endDate = null,
    entityType = null
  } = req.query;

  const options = {
    page: parseInt(page),
    limit: parseInt(limit),
    action,
    severity,
    category,
    startDate,
    endDate,
    entityType
  };

  const activity = await AuditService.getSystemActivity(options);

  return sendResponse(res, 200, true, 'System audit activity retrieved successfully', activity, {
    adminId: req.user.id,
    recordCount: activity.logs.length
  });
});

/**
 * Get critical audit actions (Admin only)
 */
export const getCriticalAuditActions = asyncHandler(async (req, res) => {
  const { hours = 24, limit = 100 } = req.query;

  const options = {
    hours: parseInt(hours),
    limit: parseInt(limit)
  };

  const criticalActions = await AuditService.getCriticalActions(options);

  return sendResponse(res, 200, true, 'Critical audit actions retrieved successfully', {
    actions: criticalActions,
    count: criticalActions.length,
    timeframe: `${hours} hours`
  }, {
    adminId: req.user.id,
    criticalActionCount: criticalActions.length
  });
});

/**
 * Get audit statistics (Admin only)
 */
export const getAuditStatistics = asyncHandler(async (req, res) => {
  const { days = 30 } = req.query;

  const options = {
    days: parseInt(days)
  };

  const statistics = await AuditService.getAuditStatistics(options);

  return sendResponse(res, 200, true, 'Audit statistics retrieved successfully', {
    ...statistics,
    timeframe: `${days} days`
  }, {
    adminId: req.user.id,
    totalActions: statistics.summary.totalActions
  });
});

/**
 * Archive old audit logs (Super Admin only)
 */
export const archiveOldAuditLogs = asyncHandler(async (req, res) => {
  if (req.user.role !== 'super_admin') {
    throw new AppError('Only super admins can archive audit logs', 403);
  }

  const { olderThanDays = 2555 } = req.body; // ~7 years default

  const result = await AuditService.archiveOldLogs(olderThanDays);

  return sendResponse(res, 200, true, 'Audit logs archived successfully', result, {
    adminId: req.user.id,
    archivedCount: result.archivedCount,
    severity: 'HIGH'
  });
});

/**
 * Delete archived audit logs (Super Admin only)
 */
export const deleteArchivedAuditLogs = asyncHandler(async (req, res) => {
  if (req.user.role !== 'super_admin') {
    throw new AppError('Only super admins can delete audit logs', 403);
  }

  const { olderThanDays = 2920 } = req.body; // ~8 years default

  const result = await AuditService.deleteArchivedLogs(olderThanDays);

  return sendResponse(res, 200, true, 'Archived audit logs deleted successfully', result, {
    adminId: req.user.id,
    deletedCount: result.deletedCount,
    severity: 'CRITICAL'
  });
});

/**
 * Get current user's audit activity
 */
export const getMyAuditActivity = asyncHandler(async (req, res) => {
  const { 
    page = 1, 
    limit = 50, 
    startDate = null, 
    endDate = null,
    action = null
  } = req.query;

  const options = {
    page: parseInt(page),
    limit: parseInt(limit),
    startDate,
    endDate,
    action
  };

  const activity = await AuditService.getUserActivity(req.user.id, options);

  return sendResponse(res, 200, true, 'Your audit activity retrieved successfully', activity, {
    userId: req.user.id,
    recordCount: activity.logs.length
  });
});

/**
 * Export audit logs (Admin only)
 */
export const exportAuditLogs = asyncHandler(async (req, res) => {
  const { 
    startDate, 
    endDate, 
    entityType = null,
    action = null,
    severity = null,
    format = 'json'
  } = req.query;

  if (!startDate || !endDate) {
    throw new AppError('Start date and end date are required for export', 400);
  }

  const options = {
    page: 1,
    limit: 10000, // Large limit for export
    startDate,
    endDate,
    entityType,
    action,
    severity
  };

  const activity = await AuditService.getSystemActivity(options);

  if (format === 'csv') {
    // Convert to CSV format
    const csvData = convertToCSV(activity.logs);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=audit-logs-${startDate}-to-${endDate}.csv`);
    return res.send(csvData);
  }

  // Default JSON format
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', `attachment; filename=audit-logs-${startDate}-to-${endDate}.json`);
  
  return sendResponse(res, 200, true, 'Audit logs exported successfully', {
    logs: activity.logs,
    exportInfo: {
      startDate,
      endDate,
      recordCount: activity.logs.length,
      exportedAt: new Date().toISOString(),
      exportedBy: req.user.email
    }
  }, {
    adminId: req.user.id,
    exportRecordCount: activity.logs.length
  });
});

/**
 * Helper function to convert audit logs to CSV
 */
function convertToCSV(logs) {
  if (!logs || logs.length === 0) return '';

  const headers = [
    'Timestamp',
    'Action',
    'Entity Type',
    'Entity ID',
    'Performed By',
    'User Email',
    'Severity',
    'Category',
    'IP Address',
    'Reason'
  ];

  const csvRows = [headers.join(',')];

  logs.forEach(log => {
    const row = [
      log.timestamp,
      log.action,
      log.entityType,
      log.entityId,
      log.performedBy.userName || '',
      log.performedBy.userEmail || '',
      log.severity,
      log.category,
      log.metadata.ipAddress || '',
      log.reason || ''
    ].map(field => `"${String(field).replace(/"/g, '""')}"`);
    
    csvRows.push(row.join(','));
  });

  return csvRows.join('\n');
}
