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
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Update the updatedAt field before saving
studentSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

export default mongoose.model('Student', studentSchema);
