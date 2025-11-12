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
  
  // Session data
  sessionData: {
    currentPosition: { type: Number, default: 0 },
    lastActivity: Date,
    isPaused: { type: Boolean, default: false },
    pauseCount: { type: Number, default: 0 },
    maxPauses: { type: Number, default: 3 }
  },
  
  // Results reference
  results: [{ 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Result' 
  }],
  
  // Metadata
  ipAddress: String,
  userAgent: String,
  deviceInfo: {
    type: String,
    os: String,
    browser: String
  },
  
  createdAt: { 
    type: Date, 
    default: Date.now 
  },
  updatedAt: { 
    type: Date, 
    default: Date.now 
  }
});

// Update the updatedAt field before saving
testSessionSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Indexes for better query performance
testSessionSchema.index({ studentId: 1, testId: 1 });
testSessionSchema.index({ status: 1 });
testSessionSchema.index({ timeExpires: 1 });
testSessionSchema.index({ createdAt: -1 });

// Virtual for checking if session is expired
testSessionSchema.virtual('isExpired').get(function() {
  return this.timeExpires && new Date() > this.timeExpires;
});

// Virtual for checking if student can retake
testSessionSchema.virtual('canRetakeTest').get(function() {
  return this.totalAttempts < this.maxRetakes && this.status !== 'completed';
});

export default mongoose.model('TestSession', testSessionSchema);
