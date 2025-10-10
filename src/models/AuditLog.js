import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema({
  // Core identification
  entityType: { 
    type: String, 
    required: true,
    enum: ['Student', 'Admin', 'Test', 'Batch', 'Result', 'TestSession'],
    index: true
  },
  entityId: { 
    type: mongoose.Schema.Types.ObjectId, 
    required: true,
    index: true
  },
  
  // Action details
  action: { 
    type: String, 
    required: true,
    enum: [
      'CREATE', 'UPDATE', 'DELETE', 
      'LOGIN', 'LOGOUT', 
      'APPROVE', 'DISAPPROVE', 'BLOCK', 'UNBLOCK', 
      'ASSIGN_BATCH', 'REMOVE_BATCH',
      'ASSIGN_TEST', 'REMOVE_TEST',
      'START_TEST_SESSION', 'END_TEST_SESSION', 'PAUSE_TEST_SESSION', 'RESUME_TEST_SESSION',
      'SUBMIT_RESULT', 'UPDATE_RESULT',
      'PUBLISH_TEST', 'UNPUBLISH_TEST',
      'ACTIVATE', 'DEACTIVATE'
    ],
    index: true
  },
  
  // User context
  performedBy: {
    userId: { 
      type: mongoose.Schema.Types.ObjectId, 
      required: true,
      index: true
    },
    userType: { 
      type: String, 
      enum: ['Student', 'Admin'], 
      required: true 
    },
    userName: String,
    userEmail: String
  },
  
  // Change tracking
  changes: {
    before: mongoose.Schema.Types.Mixed,  // Previous state
    after: mongoose.Schema.Types.Mixed,   // New state
    fieldsChanged: [String]               // List of changed fields
  },
  
  // Request context
  metadata: {
    ipAddress: String,
    userAgent: String,
    requestId: String,
    sessionId: String,
    endpoint: String,
    method: String,
    responseTime: Number,     // in milliseconds
    statusCode: Number
  },
  
  // Additional context
  reason: String,        // Why the change was made
  severity: { 
    type: String, 
    enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'], 
    default: 'MEDIUM',
    index: true
  },
  
  // Business context
  batchId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Batch',
    sparse: true,
    index: true
  },
  testId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Test',
    sparse: true,
    index: true
  },
  
  timestamp: { 
    type: Date, 
    default: Date.now,
    index: true
  },
  
  // For compliance and data retention
  retentionDate: Date,   // When this log can be deleted
  isArchived: { 
    type: Boolean, 
    default: false,
    index: true
  },
  
  // Search and categorization
  tags: [String],        // For categorizing logs
  category: {
    type: String,
    enum: ['AUTHENTICATION', 'AUTHORIZATION', 'DATA_CHANGE', 'SYSTEM', 'TEST_ACTIVITY', 'ADMIN_ACTION'],
    default: 'DATA_CHANGE'
  }
});

// Compound indexes for common queries
auditLogSchema.index({ entityType: 1, entityId: 1, timestamp: -1 });
auditLogSchema.index({ 'performedBy.userId': 1, timestamp: -1 });
auditLogSchema.index({ action: 1, timestamp: -1 });
auditLogSchema.index({ severity: 1, timestamp: -1 });
auditLogSchema.index({ category: 1, timestamp: -1 });
auditLogSchema.index({ batchId: 1, timestamp: -1 });
auditLogSchema.index({ testId: 1, timestamp: -1 });

// TTL index for automatic cleanup (optional - can be handled by archiving process)
auditLogSchema.index({ retentionDate: 1 }, { expireAfterSeconds: 0 });

// Virtual for human-readable timestamp
auditLogSchema.virtual('formattedTimestamp').get(function() {
  return this.timestamp.toISOString();
});

// Static methods for common queries
auditLogSchema.statics.findByEntity = function(entityType, entityId, options = {}) {
  const { limit = 50, skip = 0, action = null } = options;
  
  const query = { entityType, entityId };
  if (action) query.action = action;
  
  return this.find(query)
    .sort({ timestamp: -1 })
    .limit(limit)
    .skip(skip)
    .lean();
};

auditLogSchema.statics.findByUser = function(userId, options = {}) {
  const { limit = 50, skip = 0, startDate = null, endDate = null } = options;
  
  const query = { 'performedBy.userId': userId };
  
  if (startDate || endDate) {
    query.timestamp = {};
    if (startDate) query.timestamp.$gte = new Date(startDate);
    if (endDate) query.timestamp.$lte = new Date(endDate);
  }
  
  return this.find(query)
    .sort({ timestamp: -1 })
    .limit(limit)
    .skip(skip)
    .lean();
};

auditLogSchema.statics.findCriticalActions = function(options = {}) {
  const { limit = 100, skip = 0, hours = 24 } = options;
  
  const query = {
    severity: { $in: ['HIGH', 'CRITICAL'] },
    timestamp: {
      $gte: new Date(Date.now() - hours * 60 * 60 * 1000)
    }
  };
  
  return this.find(query)
    .sort({ timestamp: -1 })
    .limit(limit)
    .skip(skip)
    .lean();
};

// Pre-save middleware for automatic field population
auditLogSchema.pre('save', function(next) {
  // Set retention date if not provided (7 years default)
  if (!this.retentionDate) {
    this.retentionDate = new Date(Date.now() + 7 * 365 * 24 * 60 * 60 * 1000);
  }
  
  // Auto-categorize based on action
  if (!this.category) {
    if (['LOGIN', 'LOGOUT'].includes(this.action)) {
      this.category = 'AUTHENTICATION';
    } else if (['APPROVE', 'DISAPPROVE', 'BLOCK', 'UNBLOCK'].includes(this.action)) {
      this.category = 'AUTHORIZATION';
    } else if (['START_TEST_SESSION', 'END_TEST_SESSION', 'SUBMIT_RESULT'].includes(this.action)) {
      this.category = 'TEST_ACTIVITY';
    } else if (this.performedBy.userType === 'Admin') {
      this.category = 'ADMIN_ACTION';
    } else {
      this.category = 'DATA_CHANGE';
    }
  }
  
  // Auto-tag based on action and context
  if (!this.tags || this.tags.length === 0) {
    const tags = [];
    
    if (this.batchId) tags.push('batch-related');
    if (this.testId) tags.push('test-related');
    if (['HIGH', 'CRITICAL'].includes(this.severity)) tags.push('high-priority');
    if (this.action.includes('TEST')) tags.push('testing');
    if (this.action.includes('BLOCK') || this.action.includes('APPROVE')) tags.push('access-control');
    
    this.tags = tags;
  }
  
  next();
});

export default mongoose.model('AuditLog', auditLogSchema);
