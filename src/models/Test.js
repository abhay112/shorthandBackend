import mongoose from 'mongoose';

const testSchema = new mongoose.Schema({
  title: { 
    type: String, 
    required: true, 
    trim: true 
  },
  description: { 
    type: String, 
    trim: true 
  },
  audioURL: { 
    type: String, 
    required: false 
  },
  referenceText: { 
    type: String, 
    required: true 
  },
  
  // Test metadata
  difficulty: { 
    type: String, 
    enum: ['beginner', 'intermediate', 'advanced', 'expert'], 
    default: 'intermediate' 
  },
  category: { 
    type: String, 
    enum: ['dictation', 'transcription', 'speed_test', 'accuracy_test', 'comprehensive'], 
    default: 'comprehensive' 
  },
  
  // Test configuration
  duration: { 
    type: Number, 
    default: 300, // 5 minutes in seconds
    min: 60,
    max: 1800 // max 30 minutes
  },
  maxRetakes: { 
    type: Number, 
    default: 3,
    min: 1,
    max: 5 
  },
  
  // Day-wise assignment
  assignedDays: [{
    batchId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'Batch' 
    },
    day: { 
      type: Number, 
      min: 1,
      max: 365 
    },
    date: Date,
    isActive: { 
      type: Boolean, 
      default: true 
    }
  }],
  
  // Legacy support
  assignedBatches: [{ 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Batch' 
  }],
  
  // Test settings
  settings: {
    allowPause: { 
      type: Boolean, 
      default: true 
    },
    maxPauses: { 
      type: Number, 
      default: 3 
    },
    showTimer: { 
      type: Boolean, 
      default: true 
    },
    showProgress: { 
      type: Boolean, 
      default: true 
    },
    autoSubmit: { 
      type: Boolean, 
      default: true 
    }
  },
  
  // Test statistics
  statistics: {
    totalAttempts: { 
      type: Number, 
      default: 0 
    },
    averageWpm: { 
      type: Number, 
      default: 0 
    },
    averageAccuracy: { 
      type: Number, 
      default: 0 
    },
    completionRate: { 
      type: Number, 
      default: 0 
    }
  },
  
  // Admin information
  uploadedBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Admin', 
    required: true 
  },
  
  // Status and validation
  isActive: { 
    type: Boolean, 
    default: true 
  },
  isPublished: { 
    type: Boolean, 
    default: false 
  },
  publishedAt: Date,
  
  // Test availability
  availableFrom: Date,
  availableUntil: Date,
  
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
testSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Indexes for better query performance
testSchema.index({ title: 1 });
testSchema.index({ difficulty: 1 });
testSchema.index({ category: 1 });
testSchema.index({ isActive: 1, isPublished: 1 });
testSchema.index({ 'assignedDays.batchId': 1, 'assignedDays.day': 1 });
testSchema.index({ availableFrom: 1, availableUntil: 1 });

// Virtual for checking if test is currently available
testSchema.virtual('isCurrentlyAvailable').get(function() {
  const now = new Date();
  if (!this.isActive || !this.isPublished) return false;
  if (this.availableFrom && now < this.availableFrom) return false;
  if (this.availableUntil && now > this.availableUntil) return false;
  return true;
});

export default mongoose.model('Test', testSchema);
