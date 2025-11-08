import Result from '../models/Result.js';

const resultService = {
  submitResult: async (data) => {
    return await Result.create(data);
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
  }
};

export default resultService;
