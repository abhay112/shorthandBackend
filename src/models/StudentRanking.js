import mongoose from 'mongoose';

const studentRankingSchema = new mongoose.Schema({
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
  
  // Ranking metrics
  rank: { 
    type: Number, 
    required: true,
    min: 1 
  },
  percentile: { 
    type: Number, 
    required: true,
    min: 0,
    max: 100 
  },
  
  // Performance metrics for ranking
  wpm: { 
    type: Number, 
    required: true 
  },
  accuracy: { 
    type: Number, 
    required: true 
  },
  speed: { 
    type: Number, 
    required: true 
  },
  
  // Ranking context
  totalStudents: { 
    type: Number, 
    required: true,
    min: 1 
  },
  totalAttempts: { 
    type: Number, 
    required: true,
    min: 1 
  },
  
  // Ranking calculation metadata
  rankingCriteria: {
    primary: { 
      type: String, 
      enum: ['wpm', 'accuracy', 'speed', 'combined'], 
      default: 'combined' 
    },
    weights: {
      wpm: { type: Number, default: 0.4 },
      accuracy: { type: Number, default: 0.4 },
      speed: { type: Number, default: 0.2 }
    }
  },
  
  // Historical ranking data
  previousRank: Number,
  rankChange: Number, // positive = improved, negative = declined
  
  // Batch-specific ranking
  batchRank: Number,
  overallRank: Number,
  
  // Timestamps
  testDate: { 
    type: Date, 
    required: true 
  },
  rankingCalculatedAt: { 
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
});

// Update the updatedAt field before saving
studentRankingSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Compound indexes for better query performance
studentRankingSchema.index({ studentId: 1, batchId: 1, testId: 1 }, { unique: true });
studentRankingSchema.index({ batchId: 1, testId: 1, rank: 1 });
studentRankingSchema.index({ studentId: 1, batchId: 1 });
studentRankingSchema.index({ testDate: -1 });
studentRankingSchema.index({ wpm: -1 });
studentRankingSchema.index({ accuracy: -1 });

// Virtual for rank change direction
studentRankingSchema.virtual('rankChangeDirection').get(function() {
  if (!this.previousRank) return 'new';
  if (this.rank < this.previousRank) return 'improved';
  if (this.rank > this.previousRank) return 'declined';
  return 'same';
});

export default mongoose.model('StudentRanking', studentRankingSchema);
