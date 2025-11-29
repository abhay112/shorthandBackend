import mongoose from 'mongoose';

const batchTestAssignmentSchema = new mongoose.Schema({
  batchId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Batch',
    required: true
  },
  testId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Test',
    required: true
  },
  assignedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    required: true
  },
  assignedAt: {
    type: Date,
    default: Date.now
  },
  assignedDate: {
    type: Date,
    required: true
  },
  dayNumber: {
    type: Number
  },
  priority: {
    type: Number,
    default: 1
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'completed', 'cancelled'],
    default: 'active'
  },
  availableFrom: {
    type: Date
  },
  availableUntil: {
    type: Date
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isClosed: {
    type: Boolean,
    default: false
  },
  closedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin'
  },
  closedAt: {
    type: Date
  },
  closureReason: {
    type: String
  },
  rankingsGenerated: {
    type: Boolean,
    default: false
  },
  rankingsGeneratedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin'
  },
  rankingsGeneratedAt: {
    type: Date
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
  collection: 'batch_test_assignments'
});

// Update the updatedAt field before saving
batchTestAssignmentSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Unique constraint matching Prisma schema
batchTestAssignmentSchema.index({ batchId: 1, testId: 1, assignedDate: 1 }, { unique: true });
batchTestAssignmentSchema.index({ batchId: 1, assignedDate: 1, priority: -1 });
batchTestAssignmentSchema.index({ testId: 1, assignedDate: 1 });
batchTestAssignmentSchema.index({ assignedDate: 1, isActive: 1 });
batchTestAssignmentSchema.index({ status: 1, isActive: 1 });
batchTestAssignmentSchema.index({ assignedBy: 1 });

export default mongoose.model('BatchTestAssignment', batchTestAssignmentSchema);

