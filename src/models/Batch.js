import mongoose from 'mongoose';

const batchSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true, 
    unique: true,
    trim: true 
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
  students: [{ 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Student' 
  }],
  tests: [{ 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Test' 
  }],
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
});

// Update the updatedAt field before saving
batchSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Index for better query performance
batchSchema.index({ name: 1 });
batchSchema.index({ createdBy: 1 });
batchSchema.index({ isActive: 1 });

export default mongoose.model('Batch', batchSchema);
