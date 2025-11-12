import resultService from '../services/resultService.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { AppError } from '../utils/AppError.js';
import { sendResponse } from '../utils/sendResponse.js';
import { validateObjectId } from '../utils/validation.js';

export const submitResult = asyncHandler(async (req, res) => {
  const payload = req.body.results || req.body;
  const studentId = req.user?.id || payload.studentId;

  if (!studentId) {
    throw new AppError('studentId is required to submit a result', 400);
  }

  if (!payload.batchId) {
    throw new AppError('batchId is required to submit a result', 400);
  }

  if (!payload.testId) {
    throw new AppError('testId is required to submit a result', 400);
  }

  const result = await resultService.submitResult(
    {
      ...payload,
      studentId
    }
  );

  return sendResponse(
    res,
    201,
    true,
    'Result submitted successfully',
    { result },
    {
      studentId,
      batchId: result.batchId,
      testId: result.testId,
      resultId: result._id
    }
  );
});

export const getResultsByShift = asyncHandler(async (req, res) => {
  const { shiftId } = req.params;

  if (!shiftId) {
    throw new AppError('shiftId is required', 400);
  }

  const results = await resultService.getResultsByShift(shiftId);

  return sendResponse(
    res,
    200,
    true,
    'Shift results retrieved successfully',
    { results },
    { shiftId }
  );
});

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

export const getResultById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  validateObjectId(id, 'result ID');

  const result = await resultService.getResultById(id);

  return sendResponse(
    res,
    200,
    true,
    'Result retrieved successfully',
    { result },
    { adminId: req.user?.id, resultId: id }
  );
});
