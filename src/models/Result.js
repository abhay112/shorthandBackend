import mongoose from 'mongoose';

const resultSchema = new mongoose.Schema({
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
  
  // Stenography-specific metrics
  wpm: { 
    type: Number, 
    required: true,
    min: 0 
  },
  accuracy: { 
    type: Number, 
    required: true,
    min: 0,
    max: 100 
  },
  speed: { 
    type: Number, 
    required: true,
    min: 0 
  },
  
  // Detailed metrics
  totalWords: { 
    type: Number, 
    required: true,
    min: 0 
  },
  correctWords: { 
    type: Number, 
    required: true,
    min: 0 
  },
  incorrectWords: { 
    type: Number, 
    required: true,
    min: 0 
  },
  totalCharacters: { 
    type: Number, 
    required: true,
    min: 0 
  },
  correctCharacters: { 
    type: Number, 
    required: true,
    min: 0 
  },
  incorrectCharacters: { 
    type: Number, 
    required: true,
    min: 0 
  },
  
  // Time metrics
  timeTaken: { 
    type: Number, 
    required: true,
    min: 0 // in seconds
  },
  timeStarted: { 
    type: Date, 
    required: true 
  },
  timeCompleted: { 
    type: Date, 
    required: true 
  },
  
  // Retake information
  attemptNumber: { 
    type: Number, 
    required: true,
    min: 1
    // No max constraint - validated by TestSession.maxRetakes instead
  },
  isRetake: { 
    type: Boolean, 
    default: false 
  },
  
  // Detailed mistakes tracking (stored as JSON in Prisma)
  mistakes: {
    type: mongoose.Schema.Types.Mixed
  },
  
  // Stenography-specific errors (stored as JSON in Prisma)
  stenographyErrors: {
    type: mongoose.Schema.Types.Mixed
  },
  
  // Test session information
  sessionId: { 
    type: String, 
    required: true 
  },
  
  // Status and validation
  status: { 
    type: String, 
    enum: ['in_progress', 'completed', 'abandoned'], 
    default: 'completed' 
  },
  isValid: { 
    type: Boolean, 
    default: true 
  },
  
  // Ranking data (calculated after submission)
  rank: Number,
  percentile: Number,
  
  submittedAt: { 
    type: Date, 
    default: Date.now 
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
  collection: 'results'
});

// Update the updatedAt field before saving
resultSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Indexes matching Prisma schema
resultSchema.index({ studentId: 1, testId: 1 });
resultSchema.index({ batchId: 1, testId: 1 });
resultSchema.index({ studentId: 1, batchId: 1 });
resultSchema.index({ submittedAt: -1 });
resultSchema.index({ wpm: -1 });
resultSchema.index({ accuracy: -1 });
resultSchema.index({ rank: -1 });
resultSchema.index({ testId: 1, batchId: 1, wpm: -1, accuracy: -1 });

export default mongoose.model('Result', resultSchema);
