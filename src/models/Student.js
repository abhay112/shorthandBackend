import mongoose from 'mongoose';

const studentSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  isApproved: { type: Boolean, default: false },
  isOnlineMode: { type: Boolean, default: true },
  assignedShifts: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Shift' }],
  results: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Result' }],
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model('Student', studentSchema);
