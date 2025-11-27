import mongoose from 'mongoose';

const batchSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true, 
    unique: true,
    trim: true,
    index: true
  },
  description: { 
    type: String, 
    trim: true 
  },
  createdBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Admin', 
    required: true 
  },
  isActive: { 
    type: Boolean, 
    default: true 
  },
  startDate: { 
    type: Date 
  },
  endDate: { 
    type: Date 
  },
  maxStudents: { 
    type: Number, 
    default: 50 
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
  collection: 'batches'
});

// Update the updatedAt field before saving
batchSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Indexes matching Prisma schema
batchSchema.index({ createdBy: 1 });
batchSchema.index({ isActive: 1, startDate: 1, endDate: 1 });

export default mongoose.model('Batch', batchSchema);
