import StudentRanking from '../models/StudentRanking.js';

const rankingService = {
  getAllRankings: async (options) => {
    const { page, limit, studentId, batchId, testId, startDate, endDate, sortBy } = options;
    
    // Build filter object
    const filter = {};
    if (studentId) filter.studentId = studentId;
    if (batchId) filter.batchId = batchId;
    if (testId) filter.testId = testId;
    
    // Date range filter
    if (startDate || endDate) {
      filter.testDate = {};
      if (startDate) filter.testDate.$gte = startDate;
      if (endDate) filter.testDate.$lte = endDate;
    }

    // Calculate pagination
    const skip = (page - 1) * limit;
    
    // Get total count
    const totalItems = await StudentRanking.countDocuments(filter);
    const totalPages = Math.ceil(totalItems / limit);

    // Build sort object
    let sort = {};
    switch (sortBy) {
      case 'wpm':
        sort = { wpm: -1 };
        break;
      case 'accuracy':
        sort = { accuracy: -1 };
        break;
      case 'speed':
        sort = { speed: -1 };
        break;
      case 'rank':
      default:
        sort = { rank: 1 };
        break;
    }

    // Get rankings with pagination
    const rankings = await StudentRanking.find(filter)
      .populate('studentId', 'name email')
      .populate('batchId', '_id name')
      .populate('testId', 'title category difficulty')
      .sort(sort)
      .skip(skip)
      .limit(limit);

    return {
      rankings,
      pagination: {
        currentPage: page,
        totalPages,
        totalItems,
        itemsPerPage: limit
      }
    };
  },

  getRankingsByBatch: async (options) => {
    const { page, limit, batchId, testId } = options;
    
    const filter = { batchId };
    if (testId) filter.testId = testId;

    const skip = (page - 1) * limit;
    const totalItems = await StudentRanking.countDocuments(filter);
    const totalPages = Math.ceil(totalItems / limit);

    const rankings = await StudentRanking.find(filter)
      .populate('studentId', 'name email')
      .populate('batchId', '_id name')
      .populate('testId', 'title category difficulty')
      .sort({ rank: 1 })
      .skip(skip)
      .limit(limit);

    return {
      rankings,
      pagination: {
        currentPage: page,
        totalPages,
        totalItems,
        itemsPerPage: limit
      }
    };
  },

  getRankingsByTest: async (options) => {
    const { page, limit, testId, batchId } = options;
    
    const filter = { testId };
    if (batchId) filter.batchId = batchId;

    const skip = (page - 1) * limit;
    const totalItems = await StudentRanking.countDocuments(filter);
    const totalPages = Math.ceil(totalItems / limit);

    const rankings = await StudentRanking.find(filter)
      .populate('studentId', 'name email')
      .populate('batchId', '_id name')
      .populate('testId', 'title category difficulty')
      .sort({ rank: 1 })
      .skip(skip)
      .limit(limit);

    return {
      rankings,
      pagination: {
        currentPage: page,
        totalPages,
        totalItems,
        itemsPerPage: limit
      }
    };
  },

  getStudentRankingHistory: async (options) => {
    const { page, limit, studentId, batchId, testId } = options;
    
    const filter = { studentId };
    if (batchId) filter.batchId = batchId;
    if (testId) filter.testId = testId;

    const skip = (page - 1) * limit;
    const totalItems = await StudentRanking.countDocuments(filter);
    const totalPages = Math.ceil(totalItems / limit);

    const rankings = await StudentRanking.find(filter)
      .populate('batchId', '_id name')
      .populate('testId', 'title category difficulty')
      .sort({ testDate: -1 })
      .skip(skip)
      .limit(limit);

    return {
      rankings,
      pagination: {
        currentPage: page,
        totalPages,
        totalItems,
        itemsPerPage: limit
      }
    };
  }
};

export default rankingService;
