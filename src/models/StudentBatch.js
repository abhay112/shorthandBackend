import mongoose from 'mongoose';

const studentBatchSchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true
  },
  batchId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Batch',
    required: true
  },
  enrolledBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    required: true
  },
  enrolledAt: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['active', 'completed', 'dropped', 'suspended'],
    default: 'active'
  },
  enrolledUntil: {
    type: Date
  },
  notes: {
    type: String
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  collection: 'student_batches'
});

// Update the updatedAt field before saving
studentBatchSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Unique constraint matching Prisma schema
studentBatchSchema.index({ studentId: 1, batchId: 1 }, { unique: true });
studentBatchSchema.index({ studentId: 1, status: 1 });
studentBatchSchema.index({ batchId: 1, status: 1 });
studentBatchSchema.index({ enrolledBy: 1 });
studentBatchSchema.index({ enrolledAt: -1 });

export default mongoose.model('StudentBatch', studentBatchSchema);

