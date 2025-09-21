import testService from '../services/testService.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { AppError } from '../utils/AppError.js';
import { sendResponse } from '../utils/sendResponse.js';


/**
 * @swagger
 * /api/v1/test:
 *   post:
 *     summary: Create a new test
 *     tags: [Tests]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - referenceText
 *             properties:
 *               title:
 *                 type: string
 *                 description: Title of the test
 *               referenceText:
 *                 type: string
 *                 description: Reference text for the test
 *               audioFile:
 *                 type: string
 *                 format: binary
 *                 description: Audio file for the test
 *               duration:
 *                 type: number
 *                 description: Duration in seconds
 *     responses:
 *       201:
 *         description: Test created successfully
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
export const createTest = asyncHandler(async (req, res) => {
  const { title, referenceText, duration } = req.body;
  const audioURL = req.file?.path || null;

  if (!title || !referenceText) {
    throw new AppError('Title and referenceText are required', 400);
  }

  const test = await testService.createTest(
    title, 
    audioURL, 
    referenceText, 
    req.user.id, 
    duration ? parseInt(duration) : 300
  );

  return sendResponse(
    res,
    201,
    true,
    'Test created successfully',
    { test },
    { adminId: req.user.id, testId: test._id }
  );
});

/**
 * @swagger
 * /api/v1/test:
 *   get:
 *     summary: Get all tests
 *     tags: [Tests]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Tests retrieved successfully
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
export const getAllTests = asyncHandler(async (req, res) => {
  const tests = await testService.getAllTests();
  
  return sendResponse(
    res,
    200,
    true,
    'Tests retrieved successfully',
    { tests },
    { adminId: req.user?.id }
  );
});

/**
 * @swagger
 * /api/v1/test/{id}:
 *   get:
 *     summary: Get test by ID
 *     tags: [Tests]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Test ID
 *     responses:
 *       200:
 *         description: Test retrieved successfully
 *       404:
 *         description: Test not found
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
export const getTestById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const test = await testService.getTestById(id);
  
  return sendResponse(
    res,
    200,
    true,
    'Test retrieved successfully',
    { test },
    { adminId: req.user?.id, testId: id }
  );
});

/**
 * @swagger
 * /api/v1/test/{id}:
 *   put:
 *     summary: Update test
 *     tags: [Tests]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Test ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               referenceText:
 *                 type: string
 *               duration:
 *                 type: number
 *               isActive:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Test updated successfully
 *       404:
 *         description: Test not found
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
export const updateTest = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updateData = req.body;
  
  const test = await testService.updateTest(id, updateData);
  
  return sendResponse(
    res,
    200,
    true,
    'Test updated successfully',
    { test },
    { adminId: req.user.id, testId: id }
  );
});

/**
 * @swagger
 * /api/v1/test/{id}:
 *   delete:
 *     summary: Delete test
 *     tags: [Tests]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Test ID
 *     responses:
 *       200:
 *         description: Test deleted successfully
 *       404:
 *         description: Test not found
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
export const deleteTest = asyncHandler(async (req, res) => {
  const { id } = req.params;
  await testService.deleteTest(id);
  
  return sendResponse(
    res,
    200,
    true,
    'Test deleted successfully',
    {},
    { adminId: req.user.id, testId: id }
  );
});

/**
 * @swagger
 * /api/v1/test/{id}/assign-batches:
 *   post:
 *     summary: Assign test to batches
 *     tags: [Tests]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Test ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - batchIds
 *             properties:
 *               batchIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Array of batch IDs to assign
 *     responses:
 *       200:
 *         description: Test assigned to batches successfully
 *       400:
 *         description: Bad request
 *       404:
 *         description: Test not found
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
export const assignTestToBatches = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { batchIds } = req.body;

  if (!batchIds || !Array.isArray(batchIds)) {
    throw new AppError('Batch IDs array is required', 400);
  }

  const test = await testService.assignTestToBatches(id, batchIds);

  return sendResponse(
    res,
    200,
    true,
    'Test assigned to batches successfully',
    { test },
    { adminId: req.user.id, testId: id }
  );
});

/**
 * @swagger
 * /api/v1/test/{id}/remove-batches:
 *   delete:
 *     summary: Remove test from batches
 *     tags: [Tests]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Test ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - batchIds
 *             properties:
 *               batchIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Array of batch IDs to remove
 *     responses:
 *       200:
 *         description: Test removed from batches successfully
 *       400:
 *         description: Bad request
 *       404:
 *         description: Test not found
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
export const removeTestFromBatches = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { batchIds } = req.body;

  if (!batchIds || !Array.isArray(batchIds)) {
    throw new AppError('Batch IDs array is required', 400);
  }

  const test = await testService.removeTestFromBatches(id, batchIds);

  return sendResponse(
    res,
    200,
    true,
    'Test removed from batches successfully',
    { test },
    { adminId: req.user.id, testId: id }
  );
});
