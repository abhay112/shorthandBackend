import mongoose from 'mongoose';

const testSessionSchema = new mongoose.Schema({
  studentId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Student',
    required: true 
  },
  batchId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Batch',
    required: true 
  },
  testId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Test',
    required: true 
  },
  
  // Session tracking
  sessionId: { 
    type: String, 
    required: true,
    unique: true,
    index: true
  },
  
  // Attempt tracking
  currentAttempt: { 
    type: Number, 
    default: 1,
    min: 1,
    validate: {
      validator: function (value) {
        if (this.maxRetakes === undefined || this.maxRetakes === null) {
          return true;
        }
        return value <= this.maxRetakes;
      },
      message: 'Current attempt exceeds allowed maximum'
    }
  },
  totalAttempts: { 
    type: Number, 
    default: 0,
    min: 0,
    validate: {
      validator: function (value) {
        if (this.maxRetakes === undefined || this.maxRetakes === null) {
          return true;
        }
        return value <= this.maxRetakes;
      },
      message: 'Total attempts exceeds allowed maximum'
    }
  },
  
  // Session status
  status: { 
    type: String, 
    enum: ['not_started', 'in_progress', 'completed', 'abandoned', 'expired'], 
    default: 'not_started' 
  },
  
  // Time tracking
  timeStarted: Date,
  timeCompleted: Date,
  timeExpires: Date,
  
  // Test access control
  canRetake: { 
    type: Boolean, 
    default: true 
  },
  maxRetakes: { 
    type: Number, 
    default: 3 
  },
  
  // Session data (stored as JSON in Prisma)
  sessionData: {
    type: mongoose.Schema.Types.Mixed
  },
  
  // Metadata
  ipAddress: String,
  userAgent: String,
  deviceInfo: {
    type: mongoose.Schema.Types.Mixed
  },
  
  createdAt: { 
    type: Date, 
    default: Date.now 
  },
  updatedAt: { 
    type: Date, 
    default: Date.now 
  }
}, {
  collection: 'test_sessions'
});

// Update the updatedAt field before saving
testSessionSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Indexes matching Prisma schema
testSessionSchema.index({ studentId: 1, testId: 1 });
testSessionSchema.index({ status: 1, timeExpires: 1 });
testSessionSchema.index({ createdAt: -1 });

// Virtual for checking if session is expired
testSessionSchema.virtual('isExpired').get(function() {
  return this.timeExpires && new Date() > this.timeExpires;
});

export default mongoose.model('TestSession', testSessionSchema);
