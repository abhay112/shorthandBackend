import mongoose from 'mongoose';

const adminSchema = new mongoose.Schema({
  name: String,
  email: String,
  passwordHash: String,
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model('Admin', adminSchema);
