import studentService from '../services/studentService.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { createError } from '../utils/AppError.js';
import { sendResponse } from '../utils/sendResponse.js';
// logger imported but not used - kept for potential future use

// Profile Management
export const getStudentProfile = asyncHandler(async (req, res) => {
  const studentId = req.user.id;
  
  const user = await studentService.getProfile(studentId);
  
  return sendResponse(res, 200, true, 'Profile retrieved successfully', { user }, {
    studentId: studentId,
    ip: req.ip
  });
});

export const updateStudentProfile = asyncHandler(async (req, res) => {
  const studentId = req.user.id;
  const { name } = req.body;
  
  if (!name || name.trim() === '') {
    throw createError('Name is required', 400);
  }
  
  const updateData = { name: name.trim() };
  const updatedUser = await studentService.updateProfile(studentId, updateData);
  
  return sendResponse(res, 200, true, 'Profile updated successfully', { user: updatedUser }, {
    studentId: studentId,
    updates: Object.keys(updateData),
    ip: req.ip
  });
});

// Dashboard
export const getStudentDashboard = asyncHandler(async (req, res) => {
  const studentId = req.user.id;
  
  const dashboard = await studentService.getDashboard(studentId);
  
  return sendResponse(res, 200, true, 'Student dashboard fetched successfully', { dashboard }, {
    studentId: studentId,
    ip: req.ip
  });
});

export const getStudentStatistics = asyncHandler(async (req, res) => {
  const studentId = req.user.id;
  
  const statistics = await studentService.getStudentStatistics(studentId);
  
  return sendResponse(res, 200, true, 'Student statistics fetched successfully', { statistics }, {
    studentId: studentId,
    ip: req.ip
  });
});

// Test Management
export const getCurrentDayTest = asyncHandler(async (req, res) => {
  const studentId = req.user.id;
  
  const currentTest = await studentService.getCurrentDayTest(studentId);
  
  return sendResponse(res, 200, true, 'Current day test fetched successfully', { currentTest }, {
    studentId: studentId,
    hasTest: !!currentTest,
    ip: req.ip
  });
});

export const getUpcomingTests = asyncHandler(async (req, res) => {
  const studentId = req.user.id;
  
  const upcomingTests = await studentService.getUpcomingTests(studentId);
  
  return sendResponse(res, 200, true, 'Upcoming tests fetched successfully', { upcomingTests }, {
    studentId: studentId,
    testCount: upcomingTests.length,
    ip: req.ip
  });
});

export const getTestDetails = asyncHandler(async (req, res) => {
  const studentId = req.user.id;
  const { testId } = req.params;

  const testDetails = await studentService.getTestDetails(studentId, testId);

  return sendResponse(res, 200, true, 'Test details fetched successfully', { test: testDetails }, {
    studentId: studentId,
    testId: testId,
    ip: req.ip
  });
});

export const checkTestAccess = asyncHandler(async (req, res) => {
  const studentId = req.user.id;
  const { testId } = req.params;

  const accessCheck = await studentService.canStudentTakeTest(studentId, testId, { consumeAttempt: true });

  if (!accessCheck.canTake) {
    throw createError(accessCheck.reason || 'Test access denied', 403);
  }

  return sendResponse(res, 200, true, 'Test access checked successfully', { accessCheck }, {
    studentId: studentId,
    testId: testId,
    canTake: accessCheck.canTake,
    attemptNumber: accessCheck.attemptNumber,
    ip: req.ip
  });
});

// Test Session Management
export const startTestSession = asyncHandler(async (req, res) => {
  const studentId = req.user.id;
  const { testId } = req.params;
  
  const session = await studentService.startTestSession(studentId, testId);
  
  return sendResponse(res, 200, true, 'Test session started successfully', { session }, {
    studentId: studentId,
    testId: testId,
    sessionId: session.sessionId,
    ip: req.ip
  });
});

export const endTestSession = asyncHandler(async (req, res) => {
  const studentId = req.user.id;
  const { sessionId } = req.params;
  
  // Handle both formats: direct data or nested under 'results' key
  const resultData = req.body.results || req.body;
  
  // Validate required field: typedText (or rawInput for backward compatibility)
  const typedText = resultData.typedText !== undefined ? resultData.typedText : resultData.rawInput;
  
  if (typedText === undefined || typedText === null) {
    throw createError('Missing required field: typedText (or rawInput)', 400);
  }
  
  // Prepare data for service (only send typedText and optional timeTaken)
  const serviceData = {
    typedText: typedText || '',
    rawInput: resultData.rawInput || typedText || '', // Support both field names
    timeTaken: resultData.timeTaken || resultData.elapsedSeconds // Optional: time in seconds
  };
  
  await studentService.endTestSession(studentId, sessionId, serviceData);
  
  return sendResponse(res, 200, true, 'Test completed successfully', {}, {
    studentId: studentId,
    sessionId: sessionId,
    ip: req.ip
  });
});

export const pauseTestSession = asyncHandler(async (req, res) => {
  const studentId = req.user.id;
  const { sessionId } = req.params;
  
  // This would be implemented in the service layer
  // For now, just return success
  return sendResponse(res, 200, true, 'Test session paused', {}, {
    studentId: studentId,
    sessionId: sessionId,
    ip: req.ip
  });
});

export const resumeTestSession = asyncHandler(async (req, res) => {
  const studentId = req.user.id;
  const { sessionId } = req.params;
  
  const session = await studentService.resumeTestSession(studentId, sessionId);
  
  return sendResponse(res, 200, true, 'Test session resumed', { session }, {
    studentId: studentId,
    sessionId: sessionId,
    ip: req.ip
  });
});

// Results Management
export const getStudentResults = asyncHandler(async (req, res) => {
  const studentId = req.user.id;
  const { batchId, testId, page = 1, limit = 20, search, sortBy = 'date', sortOrder = 'desc' } = req.query;
  
  const options = {
    batchId,
    testId,
    page: parseInt(page),
    limit: parseInt(limit),
    search,
    sortBy: sortBy === 'submittedAt' ? 'date' : sortBy,
    sortOrder
  };
  
  const result = await studentService.getTestHistory(studentId, options);
  
  return sendResponse(res, 200, true, 'Test history retrieved successfully', result, {
    studentId: studentId,
    resultCount: result.tests.length,
    page: page,
    ip: req.ip
  });
});

export const getStudentResultById = asyncHandler(async (req, res) => {
  const studentId = req.user.id;
  const { resultId } = req.params;
  
  const result = await studentService.getStudentResultById(studentId, resultId);
  
  return sendResponse(res, 200, true, 'Result details fetched successfully', { result }, {
    studentId: studentId,
    resultId: resultId,
    wpm: result.wpm,
    accuracy: result.accuracy,
    rank: result.rank,
    ip: req.ip
  });
});

// Rankings and Leaderboards
export const getStudentRankings = asyncHandler(async (req, res) => {
  const studentId = req.user.id;
  const { batchId, page = 1, limit = 20 } = req.query;
  
  const options = {
    batchId,
    page: parseInt(page),
    limit: parseInt(limit)
  };
  
  const rankings = await studentService.getStudentRankings(studentId, options);
  
  return sendResponse(res, 200, true, 'Student rankings fetched successfully', { 
    rankings: rankings.rankings,
    pagination: rankings.pagination 
  }, {
    studentId: studentId,
    rankingCount: rankings.rankings.length,
    page: page,
    ip: req.ip
  });
});

export const getBatchLeaderboard = asyncHandler(async (req, res) => {
  const studentId = req.user.id;
  const { batchId } = req.params;
  const { testId, metric = 'overall', period = 'all', page = 1, limit = 20 } = req.query;
  
  // Use detailed leaderboard method for new format
  const result = await studentService.getBatchLeaderboardDetailed(studentId, batchId, {
    testId,
    metric,
    period,
    page: parseInt(page),
    limit: parseInt(limit)
  });
  
  return sendResponse(res, 200, true, 'Leaderboard retrieved successfully', result, {
    studentId: studentId,
    batchId: batchId,
    testId: testId,
    ip: req.ip
  });
});

// Batch Management
export const getStudentBatches = asyncHandler(async (req, res) => {
  const studentId = req.user.id;
  const {
    status,
    search,
    page,
    limit,
    sortBy,
    sortOrder
  } = req.query;

  const options = {
    status: status || undefined,
    search: search || undefined,
    page: page ? parseInt(page) : 1,
    limit: limit ? parseInt(limit) : 100,
    sortBy: sortBy || 'startDate',
    sortOrder: sortOrder || 'desc'
  };

  const result = await studentService.getStudentBatches(studentId, options);
  
  return sendResponse(
    res,
    200,
    true,
    'Student batches fetched successfully',
    result,
    {
      studentId: studentId,
      batchCount: result.batches.length,
      totalBatches: result.pagination.totalItems,
      ip: req.ip
    }
  );
});

// Profile overview endpoint (combines multiple data sources)
export const getProfileOverview = asyncHandler(async (req, res) => {
  const studentId = req.user.id;
  const { days, activityLimit } = req.query;
  
  const options = {
    days: days ? parseInt(days) : 30,
    activityLimit: activityLimit ? parseInt(activityLimit) : 5
  };

  const overviewData = await studentService.getProfileOverview(studentId, options);

  return sendResponse(
    res,
    200,
    true,
    'Profile overview retrieved successfully',
    overviewData,
    {
      studentId: studentId,
      days: options.days,
      activityLimit: options.activityLimit,
      ip: req.ip
    }
  );
});

// Statistics endpoints
export const getWpmTrend = asyncHandler(async (req, res) => {
  const studentId = req.user.id;
  const { days } = req.query;
  const daysParam = days ? parseInt(days) : 30;

  const trendData = await studentService.getWpmTrend(studentId, daysParam);

  return sendResponse(
    res,
    200,
    true,
    'WPM trend data retrieved successfully',
    trendData,
    {
      studentId: studentId,
      days: daysParam,
      ip: req.ip
    }
  );
});

export const getBestPerformance = asyncHandler(async (req, res) => {
  const studentId = req.user.id;

  const performanceData = await studentService.getBestPerformance(studentId);

  return sendResponse(
    res,
    200,
    true,
    'Best performance data retrieved successfully',
    performanceData,
    {
      studentId: studentId,
      ip: req.ip
    }
  );
});

// Activity endpoints
export const getRecentActivity = asyncHandler(async (req, res) => {
  const studentId = req.user.id;
  const { limit } = req.query;
  const limitParam = limit ? parseInt(limit) : 10;

  const activities = await studentService.getRecentActivity(studentId, limitParam);

  return sendResponse(
    res,
    200,
    true,
    'Recent activity retrieved successfully',
    { activities },
    {
      studentId: studentId,
      activityCount: activities.length,
      ip: req.ip
    }
  );
});

export const getBatchDetails = asyncHandler(async (req, res) => {
  const studentId = req.user.id;
  const { batchId } = req.params;
  
  const batch = await studentService.getBatchDetails(studentId, batchId);
  
  return sendResponse(res, 200, true, 'Batch details retrieved successfully', { batch }, {
    studentId: studentId,
    batchId: batchId,
    ip: req.ip
  });
});

export const getBatchTests = asyncHandler(async (req, res) => {
  const studentId = req.user.id;
  const { batchId } = req.params;
  const { status, page = 1, limit = 20 } = req.query;
  
  const result = await studentService.getBatchTests(studentId, batchId, {
    status,
    page: parseInt(page),
    limit: parseInt(limit)
  });
  
  return sendResponse(res, 200, true, 'Batch tests retrieved successfully', result, {
    studentId: studentId,
    batchId: batchId,
    ip: req.ip
  });
});

export const getBatchResults = asyncHandler(async (req, res) => {
  const studentId = req.user.id;
  const { batchId } = req.params;
  const { page = 1, limit = 20, sortBy = 'submittedAt', sortOrder = 'desc' } = req.query;
  
  const result = await studentService.getBatchResults(studentId, batchId, {
    page: parseInt(page),
    limit: parseInt(limit),
    sortBy,
    sortOrder
  });
  
  return sendResponse(res, 200, true, 'Batch results retrieved successfully', result, {
    studentId: studentId,
    batchId: batchId,
    ip: req.ip
  });
});

export const downloadBatchCertificate = asyncHandler(async (req, _res) => {
  const studentId = req.user.id;
  const { batchId } = req.params;
  
  // Verify enrollment and completion
  const batch = await studentService.getBatchDetails(studentId, batchId);
  
  if (batch.status !== 'completed') {
    throw createError('Batch is not completed or certificate is not available', 403);
  }
  
  if (batch.statistics.completionRate !== 100) {
    throw createError('Certificate not available. Please complete all tests in this batch.', 403);
  }
  
  // TODO: Generate and return certificate PDF
  // For now, return a placeholder response
  throw createError('Certificate generation not yet implemented', 501);
});

// Status and Health Check
export const getStudentStatus = asyncHandler(async (req, res) => {
  const studentId = req.user.id;
  
  const student = await studentService.getProfile(studentId);
  
  const status = {
    isApproved: student.isApproved,
    isBlocked: student.isBlocked,
    status: student.isBlocked 
      ? 'blocked' 
      : student.isApproved 
        ? 'approved' 
        : 'pending',
    assignedBatches: student.assignedBatches.length,
    lastLogin: student.lastLogin
  };
  
  return sendResponse(res, 200, true, 'Student status checked successfully', { status }, {
    studentId: studentId,
    status: status.status,
    ip: req.ip
  });
});

// Legacy support - keeping old methods for backward compatibility
export const getCurrentTestForShift = asyncHandler(async (req, res) => {
  const studentId = req.user.id;
  
  const test = await studentService.getCurrentDayTest(studentId);
  
  return sendResponse(res, 200, true, 'Current test fetched successfully (legacy)', { test }, {
    studentId: studentId,
    ip: req.ip
  });
});

export const submitTestResult = asyncHandler(async (req, _res) => {
  const data = req.body;
  
  if (!data) {
    throw createError('Test result data is required', 400);
  }
  
  // This is a legacy endpoint - redirect to new session-based approach
  throw createError('This endpoint is deprecated. Please use the new test session endpoints.', 410);
});

export const getStudentProgress = asyncHandler(async (req, res) => {
  const studentId = req.user.id;
  
  const statistics = await studentService.getStudentStatistics(studentId);
  
  return sendResponse(res, 200, true, 'Student progress fetched successfully (legacy)', { statistics }, {
    studentId: studentId,
    ip: req.ip
  });
});


export const getPerformanceRankings = asyncHandler(async (req, res) => {
  const studentId = req.user.id;
  
  const rankings = await studentService.getPerformanceRankings(studentId);
  
  return sendResponse(res, 200, true, 'Performance rankings retrieved successfully', { rankings }, {
    studentId,
    ip: req.ip
  });
});

export const getPerformanceTrends = asyncHandler(async (req, res) => {
  const studentId = req.user.id;
  const { limit } = req.query;
  
  const performanceTrends = await studentService.getPerformanceTrends(studentId, { limit });
  
  return sendResponse(res, 200, true, 'Performance trends retrieved successfully', { performanceTrends }, {
    studentId,
    ip: req.ip
  });
});

export const getAchievements = asyncHandler(async (req, res) => {
  const studentId = req.user.id;
  
  const achievements = await studentService.getAchievements(studentId);
  
  return sendResponse(res, 200, true, 'Achievements retrieved successfully', { achievements }, {
    studentId,
    ip: req.ip
  });
});

export const getFullActivityLog = asyncHandler(async (req, res) => {
  const studentId = req.user.id;
  const { page, limit, startDate, endDate, type } = req.query;
  
  const result = await studentService.getFullActivityLog(studentId, {
    page,
    limit,
    startDate,
    endDate,
    type
  });
  
  return sendResponse(res, 200, true, 'Activity log retrieved successfully', result, {
    studentId,
    ip: req.ip
  });
});

export const exportActivityLog = asyncHandler(async (req, res) => {
  const studentId = req.user.id;
  const { format = 'json', startDate, endDate, type } = req.query;
  
  const result = await studentService.exportActivityLog(studentId, {
    format,
    startDate,
    endDate,
    type
  });
  
  // For JSON, return as JSON response
  if (format === 'json') {
    return sendResponse(res, 200, true, 'Activity log exported successfully', result, {
      studentId,
      ip: req.ip
    });
  }
  
  // TODO: For CSV/Excel/PDF, set appropriate headers and return file
  // For now, return JSON
  return sendResponse(res, 200, true, 'Activity log exported successfully', result, {
    studentId,
    ip: req.ip
  });
});
