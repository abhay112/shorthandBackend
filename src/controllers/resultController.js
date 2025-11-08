import resultService from '../services/resultService.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { sendResponse } from '../utils/sendResponse.js';

export const submitResult = async (req, res) => {
  const result = await resultService.submitResult(req.body);
  res.json(result);
};

export const getResultsByShift = async (req, res) => {
  const shiftId = req.params.shiftId;
  const results = await resultService.getResultsByShift(shiftId);
  res.json(results);
};

/**
 * Get all results with pagination for admin
 */
export const getAllResults = asyncHandler(async (req, res) => {
  const { page, limit, studentId, testId, batchId, startDate, endDate } = req.query;
  
  const options = {
    page: parseInt(page) || 1,
    limit: parseInt(limit) || 20,
    studentId,
    testId,
    batchId,
    startDate: startDate ? new Date(startDate) : undefined,
    endDate: endDate ? new Date(endDate) : undefined
  };

  const result = await resultService.getAllResults(options);

  return sendResponse(
    res,
    200,
    true,
    'Results retrieved successfully',
    result,
    { adminId: req.user?.id }
  );
});
