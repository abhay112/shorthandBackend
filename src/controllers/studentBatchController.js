// src/controllers/studentBatchController.js
import batchService from '../services/batchService.js';
import testService from '../services/testService.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { AppError } from '../utils/AppError.js';
import { sendResponse } from '../utils/sendResponse.js';

/**
 * @swagger
 * /api/v1/student/my-batches:
 *   get:
 *     summary: Get batches assigned to current student
 *     tags: [Students]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Batches retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     batches:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Batch'
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
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

/**
 * @swagger
 * /api/v1/student/my-tests:
 *   get:
 *     summary: Get tests available to current student through their batches
 *     tags: [Students]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Tests retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     tests:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Test'
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
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
    } catch (error) {
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

/**
 * @swagger
 * /api/v1/student/batch/{batchId}/tests:
 *   get:
 *     summary: Get tests for a specific batch
 *     tags: [Students]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: batchId
 *         required: true
 *         schema:
 *           type: string
 *         description: Batch ID
 *     responses:
 *       200:
 *         description: Tests retrieved successfully
 *       404:
 *         description: Batch not found or student not in batch
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
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
