import adminStudentService from '../services/adminStudentService.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { createError } from '../utils/AppError.js';
import { sendResponse } from '../utils/sendResponse.js';
import logger from '../utils/logger.js';
import { validateObjectId } from '../utils/validation.js';

export const listStudents = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, status, search } = req.query;

  const result = await adminStudentService.list({ page, limit, status, search });

  logger.info('Admin fetched students', {
    adminId: req.user?.id,
    query: { page, limit, status, search },
    count: result.students.length,
  });

  return sendResponse(
    res,
    200,
    true,
    'Students fetched successfully',
    result,
    { adminId: req.user?.id },
  );
});

export const getStudent = asyncHandler(async (req, res) => {
  const { id } = req.params;
  validateObjectId(id, 'student ID');

  const student = await adminStudentService.findById(id);

  logger.info('Admin fetched student detail', {
    adminId: req.user?.id,
    studentId: id,
  });

  return sendResponse(
    res,
    200,
    true,
    'Student fetched successfully',
    { student },
    { adminId: req.user?.id, studentId: id },
  );
});

export const approveStudent = asyncHandler(async (req, res) => {
  const { id } = req.params;
  validateObjectId(id, 'student ID');

  const student = await adminStudentService.approve(id);

  logger.info('Student approved by admin', {
    adminId: req.user?.id,
    studentId: id,
  });

  return sendResponse(
    res,
    200,
    true,
    'Student approved successfully',
    { student },
    { adminId: req.user?.id, studentId: id },
  );
});

export const blockStudent = asyncHandler(async (req, res) => {
  const { id } = req.params;
  validateObjectId(id, 'student ID');

  const student = await adminStudentService.block(id);

  logger.info('Student blocked by admin', {
    adminId: req.user?.id,
    studentId: id,
  });

  return sendResponse(
    res,
    200,
    true,
    'Student blocked successfully',
    { student },
    { adminId: req.user?.id, studentId: id },
  );
});

export const unblockStudent = asyncHandler(async (req, res) => {
  const { id } = req.params;
  validateObjectId(id, 'student ID');

  const student = await adminStudentService.unblock(id);

  logger.info('Student unblocked by admin', {
    adminId: req.user?.id,
    studentId: id,
  });

  return sendResponse(
    res,
    200,
    true,
    'Student unblocked successfully',
    { student },
    { adminId: req.user?.id, studentId: id },
  );
});

export const bulkApproveStudents = asyncHandler(async (req, res) => {
  const { studentIds } = req.body;
  if (!Array.isArray(studentIds) || studentIds.length === 0) {
    throw createError('Student IDs array is required', 400);
  }

  studentIds.forEach((studentId, index) =>
    validateObjectId(studentId, `studentIds[${index}]`),
  );

  const result = await adminStudentService.bulkApprove(studentIds);

  logger.info('Bulk approve students', {
    adminId: req.user?.id,
    studentIds,
    modifiedCount: result.modifiedCount,
  });

  return sendResponse(
    res,
    200,
    true,
    `${result.modifiedCount} students approved successfully`,
    result,
    { adminId: req.user?.id, modifiedCount: result.modifiedCount },
  );
});

export const bulkBlockStudents = asyncHandler(async (req, res) => {
  const { studentIds } = req.body;
  if (!Array.isArray(studentIds) || studentIds.length === 0) {
    throw createError('Student IDs array is required', 400);
  }

  studentIds.forEach((studentId, index) =>
    validateObjectId(studentId, `studentIds[${index}]`),
  );

  const result = await adminStudentService.bulkBlock(studentIds);

  logger.info('Bulk block students', {
    adminId: req.user?.id,
    studentIds,
    modifiedCount: result.modifiedCount,
  });

  return sendResponse(
    res,
    200,
    true,
    `${result.modifiedCount} students blocked successfully`,
    result,
    { adminId: req.user?.id, modifiedCount: result.modifiedCount },
  );
});

export const getStudentStats = asyncHandler(async (req, res) => {
  const stats = await adminStudentService.stats();

  logger.info('Admin fetched student statistics', {
    adminId: req.user?.id,
    stats,
  });

  return sendResponse(
    res,
    200,
    true,
    'Student statistics fetched successfully',
    { stats },
    { adminId: req.user?.id },
  );
});

