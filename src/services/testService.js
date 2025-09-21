import Test from '../models/Test.js';
import Batch from '../models/Batch.js';
import { AppError } from '../utils/AppError.js';

const testService = {
  createTest: async (title, audioURL, referenceText, adminId, duration = 300) => {
    return await Test.create({
      title,
      audioURL,
      referenceText,
      uploadedBy: adminId,
      duration
    });
  },
  
  attachTextToTest: async (testId, referenceText) => {
    return await Test.findByIdAndUpdate(
      testId,
      { referenceText },
      { new: true }
    );
  },
  
  getAllTests: async () => {
    return await Test.find()
      .populate('uploadedBy', 'name email')
      .populate('assignedBatches', 'name description')
      .sort({ createdAt: -1 });
  },
  
  getTestById: async (id) => {
    const test = await Test.findById(id)
      .populate('uploadedBy', 'name email')
      .populate('assignedBatches', 'name description students');
    
    if (!test) {
      throw new AppError('Test not found', 404);
    }
    
    return test;
  },
  
  updateTest: async (id, updateData) => {
    const { title, audioURL, referenceText, duration, isActive } = updateData;
    
    const test = await Test.findByIdAndUpdate(
      id,
      {
        ...(title && { title }),
        ...(audioURL && { audioURL }),
        ...(referenceText !== undefined && { referenceText }),
        ...(duration !== undefined && { duration }),
        ...(isActive !== undefined && { isActive }),
      },
      { new: true, runValidators: true }
    )
      .populate('uploadedBy', 'name email')
      .populate('assignedBatches', 'name description');
    
    if (!test) {
      throw new AppError('Test not found', 404);
    }
    
    return test;
  },
  
  deleteTest: async (id) => {
    const test = await Test.findById(id);
    if (!test) {
      throw new AppError('Test not found', 404);
    }
    
    // Remove test from all batches
    await Batch.updateMany(
      { tests: id },
      { $pull: { tests: id } }
    );
    
    return await Test.findByIdAndDelete(id);
  },
  
  assignTestToBatches: async (testId, batchIds) => {
    const test = await Test.findById(testId);
    if (!test) {
      throw new AppError('Test not found', 404);
    }
    
    // Verify all batches exist
    const batches = await Batch.find({ _id: { $in: batchIds } });
    if (batches.length !== batchIds.length) {
      throw new AppError('Some batches not found', 400);
    }
    
    // Add test to batches
    await Batch.updateMany(
      { _id: { $in: batchIds } },
      { $addToSet: { tests: testId } }
    );
    
    // Add batches to test
    await Test.findByIdAndUpdate(
      testId,
      { $addToSet: { assignedBatches: { $each: batchIds } } },
      { new: true }
    );
    
    return await this.getTestById(testId);
  },
  
  removeTestFromBatches: async (testId, batchIds) => {
    const test = await Test.findById(testId);
    if (!test) {
      throw new AppError('Test not found', 404);
    }
    
    // Remove test from batches
    await Batch.updateMany(
      { _id: { $in: batchIds } },
      { $pull: { tests: testId } }
    );
    
    // Remove batches from test
    await Test.findByIdAndUpdate(
      testId,
      { $pull: { assignedBatches: { $in: batchIds } } },
      { new: true }
    );
    
    return await this.getTestById(testId);
  },
  
  getTestsForBatch: async (batchId) => {
    const tests = await Test.find({ assignedBatches: batchId })
      .populate('uploadedBy', 'name email')
      .sort({ createdAt: -1 });
    
    return tests;
  }
};

export default testService;
