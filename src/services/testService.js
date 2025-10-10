import Test from '../models/Test.js';
import Batch from '../models/Batch.js';
import { AppError } from '../utils/AppError.js';

const testService = {
  createTest: async (title, audioURL, referenceText, adminId, options = {}) => {
    const {
      description,
      testType = 'practice',
      difficulty = 'intermediate',
      category = 'comprehensive',
      duration = 300,
      maxRetakes = 3,
      availableFrom,
      availableUntil,
      assignedDays = [],
      assignedBatches = []
    } = options;

    const testData = {
      title,
      audioURL,
      referenceText,
      description,
      testType,
      difficulty,
      category,
      duration,
      maxRetakes,
      uploadedBy: adminId,
      availableFrom,
      availableUntil,
      assignedDays,
      assignedBatches,
      isActive: true,
      isPublished: true,
      publishedAt: new Date()
    };

    const test = await Test.create(testData);

    // If there are batch assignments, update the batch documents to maintain bidirectional relationships
    if (assignedBatches.length > 0) {
      await Batch.updateMany(
        { _id: { $in: assignedBatches } },
        { $addToSet: { tests: test._id } }
      );
    }

    return await test.populate([
      { path: 'uploadedBy', select: 'name email' },
      { path: 'assignedBatches', select: 'name description' },
      { path: 'assignedDays.batchId', select: 'name description' },
      { path: 'assignedDays.assignedBy', select: 'name email' }
    ]);
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
  },

  // Block/Unblock test functionality
  blockTest: async (testId, adminId, reason = '') => {
    const test = await Test.findById(testId);
    if (!test) {
      throw new AppError('Test not found', 404);
    }

    if (test.isBlocked) {
      throw new AppError('Test is already blocked', 400);
    }

    const updatedTest = await Test.findByIdAndUpdate(
      testId,
      {
        isBlocked: true,
        blockedBy: adminId,
        blockedAt: new Date(),
        blockReason: reason
      },
      { new: true }
    )
      .populate('uploadedBy', 'name email')
      .populate('blockedBy', 'name email');

    return updatedTest;
  },

  unblockTest: async (testId, adminId) => {
    const test = await Test.findById(testId);
    if (!test) {
      throw new AppError('Test not found', 404);
    }

    if (!test.isBlocked) {
      throw new AppError('Test is not blocked', 400);
    }

    const updatedTest = await Test.findByIdAndUpdate(
      testId,
      {
        isBlocked: false,
        blockedBy: null,
        blockedAt: null,
        blockReason: null
      },
      { new: true }
    )
      .populate('uploadedBy', 'name email');

    return updatedTest;
  },

  // Get tests for a specific date and batch
  getTestsForDate: async (date, batchId) => {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const tests = await Test.find({
      $or: [
        // Day-specific assignments
        {
          'assignedDays': {
            $elemMatch: {
              batchId: batchId,
              assignedDate: {
                $gte: startOfDay,
                $lte: endOfDay
              },
              isActive: true
            }
          }
        },
        // General batch assignments
        {
          assignedBatches: batchId,
          $or: [
            { availableFrom: { $lte: new Date() } },
            { availableFrom: null }
          ],
          $or: [
            { availableUntil: { $gte: new Date() } },
            { availableUntil: null }
          ]
        }
      ],
      isActive: true,
      isPublished: true
    })
      .populate('uploadedBy', 'name email')
      .populate('assignedDays.batchId', 'name')
      .populate('assignedBatches', 'name')
      .sort({ 'assignedDays.priority': -1, createdAt: -1 });

    return tests;
  },

  // Assign test to specific dates for batches
  assignTestToDates: async (testId, dateAssignments, adminId) => {
    const test = await Test.findById(testId);
    if (!test) {
      throw new AppError('Test not found', 404);
    }

    // Validate date assignments
    for (const assignment of dateAssignments) {
      if (!assignment.batchId || !assignment.assignedDate) {
        throw new AppError('Each assignment must have batchId and assignedDate', 400);
      }
      
      // Add metadata
      assignment.assignedBy = adminId;
      assignment.assignedAt = new Date();
      assignment.isActive = assignment.isActive !== false;
      assignment.priority = assignment.priority || 1;
    }

    // Add new assignments to existing ones
    const updatedTest = await Test.findByIdAndUpdate(
      testId,
      { $push: { assignedDays: { $each: dateAssignments } } },
      { new: true }
    )
      .populate('uploadedBy', 'name email')
      .populate('assignedDays.batchId', 'name')
      .populate('assignedDays.assignedBy', 'name email');

    return updatedTest;
  },

  // Remove test from specific dates
  removeTestFromDates: async (testId, assignmentIds) => {
    const test = await Test.findById(testId);
    if (!test) {
      throw new AppError('Test not found', 404);
    }

    const updatedTest = await Test.findByIdAndUpdate(
      testId,
      { $pull: { assignedDays: { _id: { $in: assignmentIds } } } },
      { new: true }
    )
      .populate('uploadedBy', 'name email')
      .populate('assignedDays.batchId', 'name');

    return updatedTest;
  }
};

export default testService;
