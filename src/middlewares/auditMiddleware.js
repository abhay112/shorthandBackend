import AuditService from '../services/auditService.js';
import logger from '../utils/logger.js';

/**
 * Middleware to automatically audit actions
 * @param {string} action - The action being performed
 * @param {string} entityType - The type of entity being acted upon
 * @param {Object} options - Additional options
 * @returns {Function} Express middleware function
 */
export const auditMiddleware = (action, entityType, options = {}) => {
  return async (req, res, next) => {
    // Store original response methods
    const originalSend = res.send;
    const originalJson = res.json;
    
    // Track request start time
    const startTime = Date.now();
    
    // Override response methods to capture response data
    let responseData = null;
    let statusCode = null;

    res.send = function(data) {
      responseData = data;
      statusCode = res.statusCode;
      return originalSend.call(this, data);
    };

    res.json = function(data) {
      responseData = data;
      statusCode = res.statusCode;
      return originalJson.call(this, data);
    };

    // Continue with the request
    res.on('finish', async () => {
      try {
        // Only audit successful operations (2xx status codes)
        if (statusCode >= 200 && statusCode < 300) {
          const responseTime = Date.now() - startTime;
          
          // Extract entity ID from various sources
          const entityId = options.getEntityId 
            ? options.getEntityId(req, res, responseData)
            : req.params.id || req.params.studentId || req.params.testId || req.params.batchId || req.body.id;

          // Extract changes if available
          const changes = options.getChanges 
            ? options.getChanges(req, res, responseData)
            : extractChangesFromRequest(req, action);

          // Extract business context
          const batchId = options.getBatchId 
            ? options.getBatchId(req, res, responseData)
            : req.params.batchId || req.body.batchId || extractFromResponse(responseData, 'batchId');

          const testId = options.getTestId 
            ? options.getTestId(req, res, responseData)
            : req.params.testId || req.body.testId || extractFromResponse(responseData, 'testId');

          const auditData = {
            entityType,
            entityId,
            action,
            performedBy: {
              userId: req.user?.id,
              userType: req.user?.role === 'student' ? 'Student' : 'Admin',
              userName: req.user?.name,
              userEmail: req.user?.email
            },
            changes,
            metadata: {
              ipAddress: req.ip,
              userAgent: req.get('User-Agent'),
              requestId: req.id || req.headers['x-request-id'],
              sessionId: req.sessionID,
              endpoint: req.originalUrl,
              method: req.method,
              responseTime,
              statusCode
            },
            reason: req.body.reason || options.reason,
            severity: options.severity || determineSeverity(action),
            batchId,
            testId,
            tags: options.tags || [],
            category: options.category || determineCategory(action)
          };

          // Fire and forget - don't await to avoid slowing down response
          AuditService.logAction(auditData).catch(err => {
            logger.error('Audit logging failed:', { 
              error: err.message, 
              action, 
              entityType,
              entityId 
            });
          });
        }
      } catch (error) {
        logger.error('Audit middleware error:', { 
          error: error.message, 
          action, 
          entityType 
        });
      }
    });

    next();
  };
};

/**
 * Specialized audit middleware for authentication events
 */
export const auditAuthMiddleware = (action) => {
  return auditMiddleware(action, 'Student', {
    severity: 'LOW',
    category: 'AUTHENTICATION',
    getEntityId: (req, res, responseData) => {
      return req.user?.id || extractFromResponse(responseData, 'user.id');
    }
  });
};

/**
 * Specialized audit middleware for admin actions
 */
export const auditAdminMiddleware = (action, entityType, options = {}) => {
  return auditMiddleware(action, entityType, {
    ...options,
    severity: options.severity || 'HIGH',
    category: 'ADMIN_ACTION'
  });
};

/**
 * Specialized audit middleware for test activities
 */
export const auditTestMiddleware = (action, options = {}) => {
  return auditMiddleware(action, 'TestSession', {
    ...options,
    severity: 'MEDIUM',
    category: 'TEST_ACTIVITY',
    getTestId: (req, res, responseData) => {
      return req.params.testId || extractFromResponse(responseData, 'testId');
    },
    getBatchId: (req, res, responseData) => {
      return req.user?.assignedBatches?.[0] || extractFromResponse(responseData, 'batchId');
    }
  });
};

/**
 * Helper function to extract changes from request
 */
function extractChangesFromRequest(req, action) {
  const changes = {};
  
  if (action === 'UPDATE' && req.body) {
    // For updates, the request body contains the new values
    changes.after = { ...req.body };
    // Note: 'before' values would need to be captured in the controller
    // by fetching the entity before updating
  }
  
  if (action === 'CREATE' && req.body) {
    changes.after = { ...req.body };
  }
  
  if (action === 'APPROVE' || action === 'DISAPPROVE') {
    changes.after = {
      isApproved: action === 'APPROVE',
      approvedAt: new Date()
    };
  }
  
  if (action === 'BLOCK' || action === 'UNBLOCK') {
    changes.after = {
      isBlocked: action === 'BLOCK',
      blockedAt: action === 'BLOCK' ? new Date() : null
    };
  }

  return changes;
}

/**
 * Helper function to extract values from response data
 */
function extractFromResponse(responseData, path) {
  if (!responseData || typeof responseData !== 'object') return null;
  
  try {
    const parsedData = typeof responseData === 'string' 
      ? JSON.parse(responseData) 
      : responseData;
    
    return path.split('.').reduce((obj, key) => obj?.[key], parsedData?.data);
  } catch (error) {
    return null;
  }
}

/**
 * Determine severity based on action
 */
function determineSeverity(action) {
  const criticalActions = ['DELETE', 'BLOCK', 'DISAPPROVE'];
  const highActions = ['APPROVE', 'ASSIGN_BATCH', 'REMOVE_BATCH', 'PUBLISH_TEST'];
  const mediumActions = ['UPDATE', 'SUBMIT_RESULT', 'START_TEST_SESSION', 'END_TEST_SESSION'];
  
  if (criticalActions.includes(action)) return 'CRITICAL';
  if (highActions.includes(action)) return 'HIGH';
  if (mediumActions.includes(action)) return 'MEDIUM';
  return 'LOW';
}

/**
 * Determine category based on action
 */
function determineCategory(action) {
  if (['LOGIN', 'LOGOUT'].includes(action)) return 'AUTHENTICATION';
  if (['APPROVE', 'DISAPPROVE', 'BLOCK', 'UNBLOCK'].includes(action)) return 'AUTHORIZATION';
  if (action.includes('TEST') || action.includes('RESULT')) return 'TEST_ACTIVITY';
  if (['CREATE', 'UPDATE', 'DELETE'].includes(action)) return 'DATA_CHANGE';
  return 'SYSTEM';
}

/**
 * Manual audit logging helper for complex scenarios
 */
export const logAuditAction = async (req, auditData) => {
  try {
    const fullAuditData = {
      ...auditData,
      performedBy: auditData.performedBy || {
        userId: req.user?.id,
        userType: req.user?.role === 'student' ? 'Student' : 'Admin',
        userName: req.user?.name,
        userEmail: req.user?.email
      },
      metadata: {
        ...auditData.metadata,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        requestId: req.id || req.headers['x-request-id'],
        sessionId: req.sessionID,
        endpoint: req.originalUrl,
        method: req.method
      }
    };

    return await AuditService.logAction(fullAuditData);
  } catch (error) {
    logger.error('Manual audit logging failed:', { error: error.message });
    return null;
  }
};

export default {
  auditMiddleware,
  auditAuthMiddleware,
  auditAdminMiddleware,
  auditTestMiddleware,
  logAuditAction
};
