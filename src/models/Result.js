import mongoose from 'mongoose';

const resultSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student' },
  shiftId: { type: mongoose.Schema.Types.ObjectId, ref: 'Shift' },
  testId: { type: mongoose.Schema.Types.ObjectId, ref: 'Test' },
  wpm: Number,
  accuracy: Number,
  mistakes: [
    {
      word: String,
      expected: String,
      typed: String
    }
  ],
  submittedAt: { type: Date, default: Date.now }
});

export default mongoose.model('Result', resultSchema);
