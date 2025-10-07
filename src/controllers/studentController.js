import studentService from '../services/studentService.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { createError } from '../utils/AppError.js';
import { sendResponse } from '../utils/sendResponse.js';
import logger from '../utils/logger.js';

// Profile Management
export const getStudentProfile = asyncHandler(async (req, res) => {
  const studentId = req.user.id;
  
  const profile = await studentService.getProfile(studentId);
  
  return sendResponse(res, 200, true, 'Student profile fetched successfully', { profile }, {
    studentId: studentId,
    ip: req.ip
  });
});

export const updateStudentProfile = asyncHandler(async (req, res) => {
  const studentId = req.user.id;
  const updateData = req.body;
  
  const updatedProfile = await studentService.updateProfile(studentId, updateData);
  
  return sendResponse(res, 200, true, 'Profile updated successfully', { profile: updatedProfile }, {
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

export const checkTestAccess = asyncHandler(async (req, res) => {
  const studentId = req.user.id;
  const { testId } = req.params;
  
  const accessCheck = await studentService.canStudentTakeTest(studentId, testId);
  
  return sendResponse(res, 200, true, 'Test access checked successfully', { accessCheck }, {
    studentId: studentId,
    testId: testId,
    canTake: accessCheck.canTake,
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
  const resultData = req.body;
  
  // Validate required fields
  const requiredFields = ['wpm', 'accuracy', 'speed', 'totalWords', 'correctWords', 'incorrectWords', 'totalCharacters', 'correctCharacters', 'incorrectCharacters', 'mistakes'];
  const missingFields = requiredFields.filter(field => resultData[field] === undefined);
  
  if (missingFields.length > 0) {
    throw createError(`Missing required fields: ${missingFields.join(', ')}`, 400);
  }
  
  const result = await studentService.endTestSession(studentId, sessionId, resultData);
  
  return sendResponse(res, 200, true, 'Test completed successfully', { result }, {
    studentId: studentId,
    sessionId: sessionId,
    resultId: result._id,
    wpm: result.wpm,
    accuracy: result.accuracy,
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
  
  // This would be implemented in the service layer
  // For now, just return success
  return sendResponse(res, 200, true, 'Test session resumed', {}, {
    studentId: studentId,
    sessionId: sessionId,
    ip: req.ip
  });
});

// Results Management
export const getStudentResults = asyncHandler(async (req, res) => {
  const studentId = req.user.id;
  const { batchId, testId, page = 1, limit = 20, sortBy = 'submittedAt', sortOrder = 'desc' } = req.query;
  
  const options = {
    batchId,
    testId,
    page: parseInt(page),
    limit: parseInt(limit),
    sortBy,
    sortOrder
  };
  
  const results = await studentService.getStudentResults(studentId, options);
  
  return sendResponse(res, 200, true, 'Student results fetched successfully', { 
    results: results.results,
    pagination: results.pagination 
  }, {
    studentId: studentId,
    resultCount: results.results.length,
    page: page,
    ip: req.ip
  });
});

export const getStudentResultById = asyncHandler(async (req, res) => {
  const studentId = req.user.id;
  const { resultId } = req.params;
  
  // This would be implemented in the service layer
  // For now, return a placeholder
  return sendResponse(res, 200, true, 'Result details endpoint - to be implemented', {}, {
    studentId: studentId,
    resultId: resultId,
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
  const { batchId } = req.params;
  const { testId } = req.query;
  
  const leaderboard = await studentService.getBatchLeaderboard(batchId, testId);
  
  return sendResponse(res, 200, true, 'Batch leaderboard fetched successfully', { leaderboard }, {
    batchId: batchId,
    testId: testId,
    studentCount: leaderboard.length,
    ip: req.ip
  });
});

// Batch Management
export const getStudentBatches = asyncHandler(async (req, res) => {
  const studentId = req.user.id;
  
  const student = await studentService.getProfile(studentId);
  
  return sendResponse(res, 200, true, 'Student batches fetched successfully', { batches: student.assignedBatches }, {
    studentId: studentId,
    batchCount: student.assignedBatches.length,
    ip: req.ip
  });
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

export const submitTestResult = asyncHandler(async (req, res) => {
  const data = req.body;
  const studentId = req.user.id;
  
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
