import mongoose from 'mongoose';

const testSchema = new mongoose.Schema({
  title: String,
  audioURL: String,
  referenceText: String,
  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model('Test', testSchema);
