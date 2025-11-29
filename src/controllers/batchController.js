// src/controllers/batchController.js
import batchService from '../services/batchService.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { AppError } from '../utils/AppError.js';
import { sendResponse } from '../utils/sendResponse.js';

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

export const updateBatch = asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  // Handle both direct body and nested body formats
  const updateData = req.body.body || req.body;

  const batch = await batchService.updateBatch(id, updateData);

  return sendResponse(
    res,
    200,
    true,
    'Batch updated successfully',
    { batch },
    { adminId: req.user.id, batchId: id }
  );
});

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

export const assignStudentsToBatch = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { studentIds } = req.body;

  if (!studentIds || !Array.isArray(studentIds)) {
    throw new AppError('Student IDs array is required', 400);
  }

  const batch = await batchService.assignStudentsToBatch(id, studentIds, req.user?.id);

  return sendResponse(
    res,
    200,
    true,
    'Students assigned to batch successfully',
    { batch },
    { adminId: req.user.id, batchId: id }
  );
});

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
