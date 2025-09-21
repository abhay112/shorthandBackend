import mongoose from 'mongoose';

const testSchema = new mongoose.Schema({
  title: { 
    type: String, 
    required: true, 
    trim: true 
  },
  audioURL: { 
    type: String, 
    required: true 
  },
  referenceText: { 
    type: String, 
    required: true 
  },
  uploadedBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Admin', 
    required: true 
  },
  assignedBatches: [{ 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Batch' 
  }],
  isActive: { 
    type: Boolean, 
    default: true 
  },
  duration: { 
    type: Number, 
    default: 300 // 5 minutes in seconds
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
testSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

export default mongoose.model('Test', testSchema);
