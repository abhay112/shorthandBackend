import mongoose from 'mongoose';

const shiftSchema = new mongoose.Schema({
  name: String,
  startTime: Date,
  durationMinutes: Number,
  students: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Student' }],
  test: { type: mongoose.Schema.Types.ObjectId, ref: 'Test' },
  date: Date
});

export default mongoose.model('Shift', shiftSchema);
