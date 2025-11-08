import rankingService from '../services/rankingService.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { sendResponse } from '../utils/sendResponse.js';

/**
 * Get all rankings with pagination for admin
 */
export const getAllRankings = asyncHandler(async (req, res) => {
  const { page, limit, studentId, batchId, testId, startDate, endDate, sortBy } = req.query;
  
  const options = {
    page: parseInt(page) || 1,
    limit: parseInt(limit) || 50,
    studentId,
    batchId,
    testId,
    startDate: startDate ? new Date(startDate) : undefined,
    endDate: endDate ? new Date(endDate) : undefined,
    sortBy: sortBy || 'rank'
  };

  const result = await rankingService.getAllRankings(options);

  return sendResponse(
    res,
    200,
    true,
    'Rankings retrieved successfully',
    result,
    { adminId: req.user?.id }
  );
});

/**
 * Get rankings by batch
 */
export const getRankingsByBatch = asyncHandler(async (req, res) => {
  const { batchId } = req.params;
  const { page, limit, testId } = req.query;
  
  const options = {
    page: parseInt(page) || 1,
    limit: parseInt(limit) || 50,
    batchId,
    testId
  };

  const result = await rankingService.getRankingsByBatch(options);

  return sendResponse(
    res,
    200,
    true,
    'Batch rankings retrieved successfully',
    result,
    { adminId: req.user?.id, batchId }
  );
});

/**
 * Get rankings by test
 */
export const getRankingsByTest = asyncHandler(async (req, res) => {
  const { testId } = req.params;
  const { page, limit, batchId } = req.query;
  
  const options = {
    page: parseInt(page) || 1,
    limit: parseInt(limit) || 50,
    testId,
    batchId
  };

  const result = await rankingService.getRankingsByTest(options);

  return sendResponse(
    res,
    200,
    true,
    'Test rankings retrieved successfully',
    result,
    { adminId: req.user?.id, testId }
  );
});

/**
 * Get student's ranking history
 */
export const getStudentRankingHistory = asyncHandler(async (req, res) => {
  const { studentId } = req.params;
  const { page, limit, batchId, testId } = req.query;
  
  const options = {
    page: parseInt(page) || 1,
    limit: parseInt(limit) || 50,
    studentId,
    batchId,
    testId
  };

  const result = await rankingService.getStudentRankingHistory(options);

  return sendResponse(
    res,
    200,
    true,
    'Student ranking history retrieved successfully',
    result,
    { adminId: req.user?.id, studentId }
  );
});
