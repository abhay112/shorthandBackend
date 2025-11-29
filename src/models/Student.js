import mongoose from 'mongoose';

const studentSchema = new mongoose.Schema({
  firebaseUid: { type: String, unique: true, required: true },
  name: String,
  email: { type: String, unique: true, required: true },
  role: { type: String, enum: ['student', 'admin'], default: 'student' },
  isApproved: { type: Boolean, default: false },
  isBlocked: { type: Boolean, default: false },
  isOnlineMode: { type: Boolean, default: true },
  
  // Admin relationship fields (matching Prisma schema)
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
  approvedAt: { type: Date },
  managedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
  
  lastLogin: { type: Date },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, {
  collection: 'students'
});

// Update the updatedAt field before saving
studentSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Indexes matching Prisma schema
studentSchema.index({ approvedBy: 1 });
studentSchema.index({ managedBy: 1 });
studentSchema.index({ isApproved: 1, isBlocked: 1 });

export default mongoose.model('Student', studentSchema);
