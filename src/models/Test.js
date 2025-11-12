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
    required: false,
    default: ''
  },
  
  // Test metadata
  difficulty: { 
    type: String, 
    enum: ['beginner', 'intermediate', 'advanced', 'expert'], 
    default: 'intermediate' 
  },

  // Content version pointers
  currentContent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'TestContent'
  },
  draftContent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'TestContent'
  },
  latestVersion: {
    type: Number,
    default: 0
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
  
  // Test type and availability strategy
  testType: {
    type: String,
    enum: ['curriculum', 'practice', 'assessment', 'special'],
    default: 'practice',
    index: true
  },

  // Enhanced day-wise assignment with multiple tests per day support
  assignedDays: [{
    batchId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'Batch',
      required: true
    },
    assignedDate: {
      type: Date,
      required: true,
      index: true
    },
    dayNumber: { 
      type: Number, 
      min: 1,
      max: 365,
      index: true
    },
    priority: {
      type: Number,
      default: 1,
      min: 1,
      max: 10 // Higher number = higher priority
    },
    isActive: { 
      type: Boolean, 
      default: true 
    },
    // Time window for this specific assignment
    availableFrom: {
      type: Date // Optional: specific time when test becomes available
    },
    availableUntil: {
      type: Date // Optional: specific time when test expires
    },
    // Assignment metadata
    assignedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin'
    },
    assignedAt: {
      type: Date,
      default: Date.now
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

  // Admin blocking functionality
  isBlocked: {
    type: Boolean,
    default: false,
    index: true
  },
  blockedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin'
  },
  blockedAt: {
    type: Date
  },
  blockReason: {
    type: String,
    trim: true
  },
  // When blocked, students can only view content, not take the test
  allowViewWhenBlocked: {
    type: Boolean,
    default: true
  },
  
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
testSchema.index({ testType: 1 });
testSchema.index({ isActive: 1, isPublished: 1, isBlocked: 1 });
testSchema.index({ 'assignedDays.batchId': 1, 'assignedDays.assignedDate': 1 });
testSchema.index({ 'assignedDays.dayNumber': 1, 'assignedDays.priority': -1 });
testSchema.index({ availableFrom: 1, availableUntil: 1 });
testSchema.index({ createdAt: -1 });
testSchema.index({ currentContent: 1 });
testSchema.index({ draftContent: 1 });

// Virtual for checking if test is currently available
testSchema.virtual('isCurrentlyAvailable').get(function() {
  const now = new Date();
  if (!this.isActive || !this.isPublished) return false;
  if (this.isBlocked) return false; // Blocked tests are not available for taking
  if (this.availableFrom && now < this.availableFrom) return false;
  if (this.availableUntil && now > this.availableUntil) return false;
  return true;
});

// Virtual for checking if test content can be viewed (even when blocked)
testSchema.virtual('canViewContent').get(function() {
  if (!this.isActive || !this.isPublished) return false;
  if (this.isBlocked && !this.allowViewWhenBlocked) return false;
  return true;
});

// Virtual for getting test status
testSchema.virtual('status').get(function() {
  if (!this.isActive) return 'inactive';
  if (!this.isPublished) return 'draft';
  if (this.isBlocked) return 'blocked';
  if (!this.isCurrentlyAvailable) return 'unavailable';
  return 'available';
});

// Method to check if test is available for a specific date
testSchema.methods.isAvailableOnDate = function(date, batchId) {
  const targetDate = new Date(date);
  const startOfDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
  const endOfDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate() + 1);

  // Check if test is generally available
  if (!this.isCurrentlyAvailable) return false;

  // Check day-specific assignments
  const dayAssignment = this.assignedDays.find(ad => {
    const assignedDate = new Date(ad.assignedDate);
    const matchesDate = assignedDate >= startOfDay && assignedDate < endOfDay;
    const matchesBatch = !batchId || ad.batchId.toString() === batchId.toString();
    return matchesDate && matchesBatch && ad.isActive;
  });

  if (dayAssignment) {
    // Check time window for this specific assignment
    const now = new Date();
    if (dayAssignment.availableFrom && now < dayAssignment.availableFrom) return false;
    if (dayAssignment.availableUntil && now > dayAssignment.availableUntil) return false;
    return true;
  }

  // Check general batch assignment
  if (batchId && this.assignedBatches.includes(batchId)) {
    return true;
  }

  return false;
};

export default mongoose.model('Test', testSchema);

