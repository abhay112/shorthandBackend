import mongoose from 'mongoose';

const adminSchema = new mongoose.Schema({
  firebaseUid: { type: String, unique: true, required: true },
  name: String,
  email: { type: String, unique: true, required: true },
  role: { type: String, enum: ['admin', 'super_admin'], default: 'admin' },
  isActive: { type: Boolean, default: true },
  lastLogin: { type: Date },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Update the updatedAt field before saving
adminSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

export default mongoose.model('Admin', adminSchema);
