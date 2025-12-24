import Result from '../models/Result.js';
import TestSession from '../models/TestSession.js';
import TestContent from '../models/TestContent.js';
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
      .populate('batchId', '_id name')
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
      .populate('testId', 'title category difficulty duration maxRetakes currentContent')
      .populate('batchId', 'name description');

    if (!result) {
      throw new AppError('Result not found', 404);
    }

    const session = await TestSession.findOne({ sessionId: result.sessionId })
      .select('sessionId currentAttempt totalAttempts status timeStarted timeCompleted timeExpires maxRetakes sessionData');

    // Get test content (published version)
    let testContent = null;
    if (result.testId && result.testId.currentContent) {
      testContent = await TestContent.findById(result.testId.currentContent)
        .select('version status referenceText audio metadata publishedAt');
      
      // If currentContent doesn't exist or is not published, try to find published content
      if (!testContent || testContent.status !== 'published') {
        testContent = await TestContent.findOne({
          testId: result.testId._id || result.testId,
          status: 'published'
        })
        .select('version status referenceText audio metadata publishedAt')
        .sort({ version: -1 }); // Get latest published version
      }
    } else if (result.testId) {
      // Fallback: try to find any published content for this test
      testContent = await TestContent.findOne({
        testId: result.testId._id || result.testId,
        status: 'published'
      })
      .select('version status referenceText audio metadata publishedAt')
      .sort({ version: -1 });
    }

    // Extract submitted text - check result object first, then session data
    let submittedText = null;
    
    // First, check if typedText exists in the result object itself
    const resultObj = result.toObject({ virtuals: true });
    if (resultObj.typedText) {
      submittedText = resultObj.typedText;
    } else if (session && session.sessionData) {
      // Fallback: check various possible field names in session data
      submittedText = session.sessionData.submittedText || 
                     session.sessionData.text || 
                     session.sessionData.transcription ||
                     session.sessionData.studentText ||
                     session.sessionData.typedText ||
                     null;
    }

    const detailedResult = resultObj;
    detailedResult.sessionDetails = session ? session.toObject({ virtuals: true }) : null;
    
    // Add test content
    detailedResult.testContent = testContent ? {
      version: testContent.version,
      status: testContent.status,
      referenceText: testContent.referenceText || '',
      audio: testContent.audio || null,
      metadata: testContent.metadata || {},
      publishedAt: testContent.publishedAt
    } : null;

    // Add submitted text by student (use submittedText field, keep typedText in result for backward compatibility)
    detailedResult.submittedText = submittedText;

    return detailedResult;
  }
};

export default resultService;
