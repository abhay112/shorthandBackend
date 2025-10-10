import testService from '../services/testService.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { AppError } from '../utils/AppError.js';
import { sendResponse } from '../utils/sendResponse.js';
import { validateObjectId } from '../utils/validation.js';


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
 *               description:
 *                 type: string
 *                 description: Description of the test
 *               testType:
 *                 type: string
 *                 enum: [curriculum, practice, assessment, special]
 *                 default: practice
 *                 description: Type of test determining availability strategy
 *               difficulty:
 *                 type: string
 *                 enum: [beginner, intermediate, advanced, expert]
 *                 default: intermediate
 *               category:
 *                 type: string
 *                 enum: [dictation, transcription, speed_test, accuracy_test, comprehensive]
 *                 default: comprehensive
 *               audioFile:
 *                 type: string
 *                 format: binary
 *                 description: Optional audio file for the test
 *               duration:
 *                 type: number
 *                 description: Duration in seconds (default 300)
 *               maxRetakes:
 *                 type: number
 *                 description: Maximum number of retakes allowed (default 3)
 *               availableFrom:
 *                 type: string
 *                 format: date-time
 *                 description: Global availability start time
 *               availableUntil:
 *                 type: string
 *                 format: date-time
 *                 description: Global availability end time
 *               assignedDays:
 *                 type: string
 *                 description: JSON string of day assignments array
 *               assignedBatches:
 *                 type: string
 *                 description: JSON string of batch IDs array for general assignment
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
  const { 
    title, 
    referenceText, 
    description,
    testType,
    difficulty,
    category,
    duration, 
    maxRetakes,
    availableFrom,
    availableUntil,
    assignedDays,
    assignedBatches
  } = req.body;
  
  const audioURL = req.file?.path || null;

  if (!title || !referenceText) {
    throw new AppError('Title and referenceText are required', 400);
  }

  // Parse JSON strings if provided
  let parsedAssignedDays = [];
  let parsedAssignedBatches = [];

  if (assignedDays) {
    try {
      parsedAssignedDays = JSON.parse(assignedDays);
      if (!Array.isArray(parsedAssignedDays)) {
        throw new AppError('assignedDays must be an array', 400);
      }
    } catch (error) {
      throw new AppError('Invalid assignedDays JSON format', 400);
    }
  }

  if (assignedBatches) {
    try {
      parsedAssignedBatches = JSON.parse(assignedBatches);
      if (!Array.isArray(parsedAssignedBatches)) {
        throw new AppError('assignedBatches must be an array', 400);
      }
    } catch (error) {
      throw new AppError('Invalid assignedBatches JSON format', 400);
    }
  }

  // Validate and process assigned days
  if (parsedAssignedDays.length > 0) {
    for (const dayAssignment of parsedAssignedDays) {
      if (!dayAssignment.batchId || !dayAssignment.assignedDate) {
        throw new AppError('Each day assignment must have batchId and assignedDate', 400);
      }
      
      // Add metadata
      dayAssignment.assignedBy = req.user.id;
      dayAssignment.assignedAt = new Date();
      dayAssignment.isActive = dayAssignment.isActive !== false; // Default to true
      dayAssignment.priority = dayAssignment.priority || 1;
    }
  }

  const test = await testService.createTest(
    title,
    audioURL,
    referenceText,
    req.user.id,
    {
      description,
      testType: testType || 'practice',
      difficulty: difficulty || 'intermediate',
      category: category || 'comprehensive',
      duration: duration ? parseInt(duration) : 300,
      maxRetakes: maxRetakes ? parseInt(maxRetakes) : 3,
      availableFrom: availableFrom ? new Date(availableFrom) : null,
      availableUntil: availableUntil ? new Date(availableUntil) : null,
      assignedDays: parsedAssignedDays,
      assignedBatches: parsedAssignedBatches
    }
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
  validateObjectId(id, 'test ID');
  
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
  validateObjectId(id, 'test ID');
  
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
  validateObjectId(id, 'test ID');
  
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

  validateObjectId(id, 'test ID');

  if (!batchIds || !Array.isArray(batchIds)) {
    throw new AppError('Batch IDs array is required', 400);
  }

  // Validate each batch ID
  batchIds.forEach((batchId, index) => {
    validateObjectId(batchId, `batch ID at index ${index}`);
  });

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

/**
 * @swagger
 * /api/v1/test/{id}/block:
 *   post:
 *     summary: Block a test (students can only view content, not take test)
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
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason:
 *                 type: string
 *                 description: Reason for blocking the test
 *     responses:
 *       200:
 *         description: Test blocked successfully
 *       404:
 *         description: Test not found
 *       400:
 *         description: Test is already blocked
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
export const blockTest = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { reason } = req.body;

  const test = await testService.blockTest(id, req.user.id, reason);

  return sendResponse(
    res,
    200,
    true,
    'Test blocked successfully',
    { test },
    { adminId: req.user.id, testId: id }
  );
});

/**
 * @swagger
 * /api/v1/test/{id}/unblock:
 *   post:
 *     summary: Unblock a test
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
 *         description: Test unblocked successfully
 *       404:
 *         description: Test not found
 *       400:
 *         description: Test is not blocked
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
export const unblockTest = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const test = await testService.unblockTest(id, req.user.id);

  return sendResponse(
    res,
    200,
    true,
    'Test unblocked successfully',
    { test },
    { adminId: req.user.id, testId: id }
  );
});

/**
 * @swagger
 * /api/v1/test/{id}/assign-dates:
 *   post:
 *     summary: Assign test to specific dates for batches
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
 *               - dateAssignments
 *             properties:
 *               dateAssignments:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required:
 *                     - batchId
 *                     - assignedDate
 *                   properties:
 *                     batchId:
 *                       type: string
 *                       description: Batch ID
 *                     assignedDate:
 *                       type: string
 *                       format: date
 *                       description: Date when test should be available
 *                     priority:
 *                       type: number
 *                       description: Priority (1-10, higher = more important)
 *                     availableFrom:
 *                       type: string
 *                       format: date-time
 *                       description: Specific time when test becomes available
 *                     availableUntil:
 *                       type: string
 *                       format: date-time
 *                       description: Specific time when test expires
 *     responses:
 *       200:
 *         description: Test assigned to dates successfully
 *       404:
 *         description: Test not found
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
export const assignTestToDates = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { dateAssignments } = req.body;

  if (!dateAssignments || !Array.isArray(dateAssignments)) {
    throw new AppError('Date assignments array is required', 400);
  }

  const test = await testService.assignTestToDates(id, dateAssignments, req.user.id);

  return sendResponse(
    res,
    200,
    true,
    'Test assigned to dates successfully',
    { test },
    { adminId: req.user.id, testId: id }
  );
});

/**
 * @swagger
 * /api/v1/test/{id}/remove-dates:
 *   delete:
 *     summary: Remove test from specific date assignments
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
 *               - assignmentIds
 *             properties:
 *               assignmentIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Array of assignment IDs to remove
 *     responses:
 *       200:
 *         description: Test removed from dates successfully
 *       404:
 *         description: Test not found
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
export const removeTestFromDates = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { assignmentIds } = req.body;

  if (!assignmentIds || !Array.isArray(assignmentIds)) {
    throw new AppError('Assignment IDs array is required', 400);
  }

  const test = await testService.removeTestFromDates(id, assignmentIds);

  return sendResponse(
    res,
    200,
    true,
    'Test removed from dates successfully',
    { test },
    { adminId: req.user.id, testId: id }
  );
});
