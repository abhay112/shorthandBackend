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
  testImageUrl: {
    type: String,
    required: false
  },
  testImageUrls: {
    type: [String],
    default: []
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
  category: {
    type: String,
    enum: ['dictation', 'transcription', 'speed_test', 'accuracy_test', 'comprehensive'],
    default: 'comprehensive'
  },
  testType: {
    type: String,
    enum: ['curriculum', 'practice', 'assessment', 'special'],
    default: 'practice'
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

  // Test configuration
  duration: {
    type: Number,
    default: 300 // 5 minutes in seconds
  },
  maxRetakes: {
    type: Number,
    default: 3
  },

  // Test settings (stored as JSON in Prisma)
  settings: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },

  // Test statistics (stored as JSON in Prisma)
  statistics: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
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
    default: false
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
}, {
  collection: 'tests'
});

// Update the updatedAt field before saving
testSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

// Indexes matching Prisma schema
testSchema.index({ uploadedBy: 1 });
testSchema.index({ isActive: 1, isPublished: 1, isBlocked: 1 });
testSchema.index({ testType: 1, difficulty: 1, category: 1 });
testSchema.index({ availableFrom: 1, availableUntil: 1 });

export default mongoose.model('Test', testSchema);
