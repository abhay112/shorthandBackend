// src/controllers/batchController.js
import batchService from '../services/batchService.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { AppError } from '../utils/AppError.js';
import { sendResponse } from '../utils/sendResponse.js';

/**
 * @swagger
 * components:
 *   schemas:
 *     Batch:
 *       type: object
 *       required:
 *         - name
 *         - createdBy
 *       properties:
 *         _id:
 *           type: string
 *           description: The auto-generated id of the batch
 *         name:
 *           type: string
 *           description: The name of the batch
 *         description:
 *           type: string
 *           description: Description of the batch
 *         createdBy:
 *           type: string
 *           description: ID of the admin who created the batch
 *         students:
 *           type: array
 *           items:
 *             type: string
 *           description: Array of student IDs assigned to this batch
 *         tests:
 *           type: array
 *           items:
 *             type: string
 *           description: Array of test IDs assigned to this batch
 *         isActive:
 *           type: boolean
 *           description: Whether the batch is active
 *         maxStudents:
 *           type: number
 *           description: Maximum number of students allowed in the batch
 *         startDate:
 *           type: string
 *           format: date
 *           description: Start date of the batch
 *         endDate:
 *           type: string
 *           format: date
 *           description: End date of the batch
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: When the batch was created
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: When the batch was last updated
 */

/**
 * @swagger
 * /api/v1/batches:
 *   post:
 *     summary: Create a new batch
 *     tags: [Batches]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *                 description: Name of the batch
 *               description:
 *                 type: string
 *                 description: Description of the batch
 *               maxStudents:
 *                 type: number
 *                 description: Maximum number of students
 *               startDate:
 *                 type: string
 *                 format: date
 *                 description: Start date of the batch
 *               endDate:
 *                 type: string
 *                 format: date
 *                 description: End date of the batch
 *     responses:
 *       201:
 *         description: Batch created successfully
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
 *                   $ref: '#/components/schemas/Batch'
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
export const createBatch = asyncHandler(async (req, res) => {
  const { name, description, maxStudents, startDate, endDate, assignedStudents, assignedTests } = req.body;

  if (!name) throw new AppError("Batch name is required", 400);

  const batchData = {
    name,
    description,
    createdBy: req.user.id,
    maxStudents,
    startDate,
    endDate,
    // allow frontend to provide arrays of ids during creation
    students: Array.isArray(assignedStudents) ? assignedStudents : [],
    tests: Array.isArray(assignedTests) ? assignedTests : [],
  };

  const batch = await batchService.createBatch(batchData);

  return sendResponse(
    res,
    201,
    true,
    "Batch created successfully",
    { batch },
    { adminId: req.user.id, batchId: batch._id }
  );
});

/**
 * @swagger
 * /api/v1/batches:
 *   get:
 *     summary: Get all batches with pagination
 *     tags: [Batches]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of items per page
 *       - in: query
 *         name: isActive
 *         schema:
 *           type: boolean
 *         description: Filter by active status
 *       - in: query
 *         name: createdBy
 *         schema:
 *           type: string
 *         description: Filter by creator admin ID
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
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         currentPage:
 *                           type: number
 *                         totalPages:
 *                           type: number
 *                         totalItems:
 *                           type: number
 *                         itemsPerPage:
 *                           type: number
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
export const getAllBatches = asyncHandler(async (req, res) => {
  const { page, limit, isActive, createdBy } = req.query;

  const options = {
    page: parseInt(page) || 1,
    limit: parseInt(limit) || 10,
    isActive: isActive !== undefined ? isActive === 'true' : undefined,
    createdBy,
  };

  const result = await batchService.getAllBatches(options);

  return sendResponse(
    res,
    200,
    true,
    'Batches retrieved successfully',
    result,
    { adminId: req.user?.id }
  );
});

/**
 * @swagger
 * /api/v1/batches/{id}:
 *   get:
 *     summary: Get batch by ID
 *     tags: [Batches]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Batch ID
 *     responses:
 *       200:
 *         description: Batch retrieved successfully
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
 *                     batch:
 *                       $ref: '#/components/schemas/Batch'
 *       404:
 *         description: Batch not found
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
export const getBatchById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const batch = await batchService.getBatchById(id);

  return sendResponse(
    res,
    200,
    true,
    'Batch retrieved successfully',
    { batch },
    { adminId: req.user?.id, batchId: id }
  );
});

/**
 * @swagger
 * /api/v1/batches/{id}:
 *   put:
 *     summary: Update batch
 *     tags: [Batches]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Batch ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               maxStudents:
 *                 type: number
 *               startDate:
 *                 type: string
 *                 format: date
 *               endDate:
 *                 type: string
 *                 format: date
 *               isActive:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Batch updated successfully
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
 *                     batch:
 *                       $ref: '#/components/schemas/Batch'
 *       404:
 *         description: Batch not found
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
export const updateBatch = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updateData = req.body;

  const batch = await batchService.updateBatch(id, updateData?.body);

  return sendResponse(
    res,
    200,
    true,
    'Batch updated successfully',
    { batch },
    { adminId: req.user.id, batchId: id }
  );
});

/**
 * @swagger
 * /api/v1/batches/{id}:
 *   delete:
 *     summary: Delete batch
 *     tags: [Batches]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Batch ID
 *     responses:
 *       200:
 *         description: Batch deleted successfully
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
 *                     message:
 *                       type: string
 *       404:
 *         description: Batch not found
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
export const deleteBatch = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const result = await batchService.deleteBatch(id);

  return sendResponse(
    res,
    200,
    true,
    'Batch deleted successfully',
    result,
    { adminId: req.user.id, batchId: id }
  );
});

/**
 * @swagger
 * /api/v1/batches/{id}/students:
 *   post:
 *     summary: Assign students to batch
 *     tags: [Batches]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Batch ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - studentIds
 *             properties:
 *               studentIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Array of student IDs to assign
 *     responses:
 *       200:
 *         description: Students assigned successfully
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
 *                     batch:
 *                       $ref: '#/components/schemas/Batch'
 *       400:
 *         description: Bad request
 *       404:
 *         description: Batch not found
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
export const assignStudentsToBatch = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { studentIds } = req.body;

  if (!studentIds || !Array.isArray(studentIds)) {
    throw new AppError('Student IDs array is required', 400);
  }

  const batch = await batchService.assignStudentsToBatch(id, studentIds);

  return sendResponse(
    res,
    200,
    true,
    'Students assigned to batch successfully',
    { batch },
    { adminId: req.user.id, batchId: id }
  );
});

/**
 * @swagger
 * /api/v1/batches/{id}/students:
 *   delete:
 *     summary: Remove students from batch
 *     tags: [Batches]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Batch ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - studentIds
 *             properties:
 *               studentIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Array of student IDs to remove
 *     responses:
 *       200:
 *         description: Students removed successfully
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
 *                     batch:
 *                       $ref: '#/components/schemas/Batch'
 *       400:
 *         description: Bad request
 *       404:
 *         description: Batch not found
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
export const removeStudentsFromBatch = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { studentIds } = req.body;

  if (!studentIds || !Array.isArray(studentIds)) {
    throw new AppError('Student IDs array is required', 400);
  }

  const batch = await batchService.removeStudentsFromBatch(id, studentIds);

  return sendResponse(
    res,
    200,
    true,
    'Students removed from batch successfully',
    { batch },
    { adminId: req.user.id, batchId: id }
  );
});

/**
 * @swagger
 * /api/v1/batches/{id}/tests:
 *   post:
 *     summary: Assign tests to batch
 *     tags: [Batches]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Batch ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - testIds
 *             properties:
 *               testIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Array of test IDs to assign
 *     responses:
 *       200:
 *         description: Tests assigned successfully
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
 *                     batch:
 *                       $ref: '#/components/schemas/Batch'
 *       400:
 *         description: Bad request
 *       404:
 *         description: Batch not found
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
export const assignTestsToBatch = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { testIds } = req.body;

  if (!testIds || !Array.isArray(testIds)) {
    throw new AppError('Test IDs array is required', 400);
  }

  const batch = await batchService.assignTestsToBatch(id, testIds);

  return sendResponse(
    res,
    200,
    true,
    'Tests assigned to batch successfully',
    { batch },
    { adminId: req.user.id, batchId: id }
  );
});

/**
 * @swagger
 * /api/v1/batches/{id}/tests:
 *   delete:
 *     summary: Remove tests from batch
 *     tags: [Batches]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Batch ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - testIds
 *             properties:
 *               testIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Array of test IDs to remove
 *     responses:
 *       200:
 *         description: Tests removed successfully
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
 *                     batch:
 *                       $ref: '#/components/schemas/Batch'
 *       400:
 *         description: Bad request
 *       404:
 *         description: Batch not found
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
export const removeTestsFromBatch = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { testIds } = req.body;

  if (!testIds || !Array.isArray(testIds)) {
    throw new AppError('Test IDs array is required', 400);
  }

  const batch = await batchService.removeTestsFromBatch(id, testIds);

  return sendResponse(
    res,
    200,
    true,
    'Tests removed from batch successfully',
    { batch },
    { adminId: req.user.id, batchId: id }
  );
});

/**
 * @swagger
 * /api/v1/batches/my-batches:
 *   get:
 *     summary: Get batches for current admin
 *     tags: [Batches]
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
  const batches = await batchService.getBatchesForAdmin(req.user.id);

  return sendResponse(
    res,
    200,
    true,
    'Your batches retrieved successfully',
    { batches },
    { adminId: req.user.id }
  );
});
