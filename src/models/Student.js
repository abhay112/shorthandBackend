import mongoose from 'mongoose';

const studentSchema = new mongoose.Schema({
  firebaseUid: { type: String, unique: true, required: true },
  name: String,
  email: { type: String, unique: true, required: true },
  role: { type: String, enum: ['student', 'admin'], default: 'student' },
  isApproved: { type: Boolean, default: false },
  isBlocked: { type: Boolean, default: false },
  isOnlineMode: { type: Boolean, default: true },
  assignedBatches: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Batch' }],
  results: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Result' }],
  lastLogin: { type: Date },
  
  // Admin notes
  notes: { type: String, default: '' },
  notesUpdatedAt: { type: Date },
  notesUpdatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
  
  // Student settings
  settings: {
    notifications: {
      emailNotifications: { type: Boolean, default: true },
      testReminders: { type: Boolean, default: true },
      resultNotifications: { type: Boolean, default: true },
      batchUpdates: { type: Boolean, default: true }
    },
    preferences: {
      theme: { type: String, default: 'light' },
      language: { type: String, default: 'en' },
      timezone: { type: String, default: 'UTC' }
    },
    permissions: {
      canViewResults: { type: Boolean, default: true },
      canViewRankings: { type: Boolean, default: true },
      canRetakeTests: { type: Boolean, default: true }
    },
    restrictions: {
      maxDailyTests: { type: Number, default: 5 },
      allowedTestTypes: [{ type: String }],
      blockedCategories: [{ type: String }]
    }
  },
  settingsUpdatedAt: { type: Date },
  
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Update the updatedAt field before saving
studentSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

export default mongoose.model('Student', studentSchema);
