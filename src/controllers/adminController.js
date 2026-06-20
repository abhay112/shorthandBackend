import adminService from '../services/adminService.js';
import dashboardService from '../services/dashboardService.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { createError } from '../utils/AppError.js';
import { sendResponse } from '../utils/sendResponse.js';
import Student from '../models/Student.js';

export const assignBatchToStudent = asyncHandler(async (req, res) => {
  const { studentId, batchId } = req.body;
  if (!studentId || !batchId) throw createError('Student ID and Batch ID are required', 400);

  const result = await adminService.assignBatch(studentId, batchId);

  return sendResponse(res, 200, true, 'Batch assigned successfully', { result }, {
    adminId: req.user.id,
    studentId,
    batchId,
    ip: req.ip
  });
});

export const removeBatchFromStudent = asyncHandler(async (req, res) => {
  const { studentId, batchId } = req.body;
  if (!studentId || !batchId) throw createError('Student ID and Batch ID are required', 400);

  const result = await adminService.removeBatch(studentId, batchId);

  return sendResponse(res, 200, true, 'Batch removed successfully', { result }, {
    adminId: req.user.id,
    studentId,
    batchId,
    ip: req.ip
  });
});


/**
 * Get dashboard statistics
 */
export const getDashboardStats = asyncHandler(async (req, res) => {
  const {
    period,
    topPerformersLimit,
    pendingApprovalsLimit,
    testResultsLimit
  } = req.query;

  const options = {
    period: period || null,
    topPerformersLimit: topPerformersLimit ? parseInt(topPerformersLimit) : 10,
    pendingApprovalsLimit: pendingApprovalsLimit ? parseInt(pendingApprovalsLimit) : 50,
    testResultsLimit: testResultsLimit ? parseInt(testResultsLimit) : 10
  };

  const data = await dashboardService.fetchDashboardStats(options);

  return sendResponse(
    res,
    200,
    true,
    'Dashboard data retrieved successfully',
    data,
    {
      adminId: req.user.id,
      ip: req.ip
    }
  );
});



// controllers/adminController.js (or wherever)
// controllers/adminController.js (updateStudent)
export const updateStudent = asyncHandler(async (req, res) => {
  const studentId = req.params.id;
  const { name, isApproved, isOnlineMode, assignedBatches, assignedTests } = req.body;

  // Load full document
  const student = await Student.findById(studentId);
  if (!student) {
    throw createError('Student not found', 404);
  }

  // Mutate only the fields sent in body
  if (name !== undefined) student.name = name;
  if (isApproved !== undefined) student.isApproved = isApproved;
  if (isOnlineMode !== undefined) student.isOnlineMode = isOnlineMode;

  // Save — this validates the full document (firebaseUid still present)
  const saved = await student.save();

  // Now sync relational arrays via adminService (only if arrays provided)
  let updatedStudent = saved;
  if (Array.isArray(assignedBatches) || Array.isArray(assignedTests)) {
    // Option A: call sync functions one by one (they do their own population and return updated student)
    if (Array.isArray(assignedBatches)) {
      updatedStudent = await adminService.updateAssignedBatches(studentId, assignedBatches);
    }
    if (Array.isArray(assignedTests)) {
      updatedStudent = await adminService.updateAssignedTests(studentId, assignedTests);
    }
  } else {
    // populate for response
    updatedStudent = await Student.findById(studentId)
      .populate('assignedBatches', 'name startDate endDate')
      .populate('assignedTests', 'title duration')
      .lean();
  }

  return sendResponse(res, 200, true, 'Student updated', { student: updatedStudent });
});

