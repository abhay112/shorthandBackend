// src/controllers/studentBatchController.js
import batchService from '../services/batchService.js';
import testService from '../services/testService.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { AppError } from '../utils/AppError.js';
import { sendResponse } from '../utils/sendResponse.js';

export const getMyBatches = asyncHandler(async (req, res) => {
  const batches = await batchService.getBatchesForStudent(req.user.id);

  return sendResponse(
    res,
    200,
    true,
    'Your batches retrieved successfully',
    { batches },
    { studentId: req.user.id }
  );
});

export const getMyTests = asyncHandler(async (req, res) => {
  // Get student's batches first
  const batches = await batchService.getBatchesForStudent(req.user.id);
  
  // Extract all test IDs from batches
  const testIds = [];
  batches.forEach(batch => {
    if (batch.tests && batch.tests.length > 0) {
      testIds.push(...batch.tests.map(test => test._id));
    }
  });

  // Get unique tests
  const uniqueTestIds = [...new Set(testIds)];
  
  // Fetch test details
  const tests = [];
  for (const testId of uniqueTestIds) {
    try {
      const test = await testService.getTestById(testId);
      if (test.isActive) {
        tests.push(test);
      }
    } catch {
      // Skip if test not found or inactive
      continue;
    }
  }

  return sendResponse(
    res,
    200,
    true,
    'Your tests retrieved successfully',
    { tests },
    { studentId: req.user.id }
  );
});

export const getBatchTests = asyncHandler(async (req, res) => {
  const { batchId } = req.params;
  
  // Verify student is in this batch
  const batches = await batchService.getBatchesForStudent(req.user.id);
  const isInBatch = batches.some(batch => batch._id.toString() === batchId);
  
  if (!isInBatch) {
    throw new AppError('You are not assigned to this batch', 403);
  }

  const tests = await testService.getTestsForBatch(batchId);

  return sendResponse(
    res,
    200,
    true,
    'Batch tests retrieved successfully',
    { tests },
    { studentId: req.user.id, batchId }
  );
});
