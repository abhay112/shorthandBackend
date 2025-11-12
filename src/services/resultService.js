import Result from '../models/Result.js';
import TestSession from '../models/TestSession.js';
import { AppError } from '../utils/AppError.js';
import { processResultSideEffects } from './utils/resultUtils.js';

const resultService = {
  submitResult: async (data, options = {}) => {
    const requiredFields = [
      'studentId',
      'batchId',
      'testId',
      'sessionId',
      'wpm',
      'accuracy',
      'speed',
      'totalWords',
      'correctWords',
      'incorrectWords',
      'totalCharacters',
      'correctCharacters',
      'incorrectCharacters'
    ];

    const missingFields = requiredFields.filter((field) => data[field] === undefined || data[field] === null);
    if (missingFields.length > 0) {
      throw new AppError(`Missing required result fields: ${missingFields.join(', ')}`, 400);
    }

    const result = await Result.create({
      ...data,
      submittedAt: data.submittedAt ? new Date(data.submittedAt) : new Date()
    });

    if (options.processSideEffects !== false) {
      await processResultSideEffects({
        studentId: result.studentId,
        batchId: result.batchId,
        testId: result.testId,
        result
      });
    }

    await result
      .populate('studentId', 'name email')
      .populate('testId', 'title category difficulty')
      .populate('batchId', 'name description');

    return result;
  },

  getResultsByShift: async (shiftId) => {
    return await Result.find({ shiftId }).populate('studentId testId');
  },

  getAllResults: async (options) => {
    const { page, limit, studentId, testId, batchId, startDate, endDate } = options;
    
    // Build filter object
    const filter = {};
    if (studentId) filter.studentId = studentId;
    if (testId) filter.testId = testId;
    if (batchId) filter.batchId = batchId;
    
    // Date range filter
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = startDate;
      if (endDate) filter.createdAt.$lte = endDate;
    }

    // Calculate pagination
    const skip = (page - 1) * limit;
    
    // Get total count
    const totalItems = await Result.countDocuments(filter);
    const totalPages = Math.ceil(totalItems / limit);

    // Get results with pagination
    const results = await Result.find(filter)
      .populate('studentId', 'name email')
      .populate('testId', 'title category difficulty')
      .populate('batchId', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    return {
      results,
      pagination: {
        currentPage: page,
        totalPages,
        totalItems,
        itemsPerPage: limit
      }
    };
  },

  getResultById: async (resultId) => {
    const result = await Result.findById(resultId)
      .populate('studentId', 'name email phoneNumber rollNumber')
      .populate('testId', 'title category difficulty duration maxRetakes')
      .populate('batchId', 'name description');

    if (!result) {
      throw new AppError('Result not found', 404);
    }

    const session = await TestSession.findOne({ sessionId: result.sessionId })
      .select('sessionId currentAttempt totalAttempts status timeStarted timeCompleted timeExpires maxRetakes results');

    const detailedResult = result.toObject({ virtuals: true });
    detailedResult.sessionDetails = session ? session.toObject({ virtuals: true }) : null;

    return detailedResult;
  }
};

export default resultService;
