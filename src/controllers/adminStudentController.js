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

  const student = await adminStudentService.approve(id, req.user?.id);

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

// Profile API Endpoints (Admin)
export const getStudentProfile = asyncHandler(async (req, res) => {
  const { studentId } = req.params;
  validateObjectId(studentId, 'student ID');

  const student = await adminStudentService.getStudentProfile(studentId);

  return sendResponse(
    res,
    200,
    true,
    'Student profile retrieved successfully',
    { student },
    { adminId: req.user?.id, studentId },
  );
});

export const getStudentWpmTrend = asyncHandler(async (req, res) => {
  const { studentId } = req.params;
  validateObjectId(studentId, 'student ID');
  const { days, period } = req.query;

  const wpmTrend = await adminStudentService.getStudentWpmTrend(studentId, { days, period });

  return sendResponse(
    res,
    200,
    true,
    'WPM trend data retrieved successfully',
    { wpmTrend },
    { adminId: req.user?.id, studentId },
  );
});

export const getStudentBestPerformance = asyncHandler(async (req, res) => {
  const { studentId } = req.params;
  validateObjectId(studentId, 'student ID');

  const bestPerformance = await adminStudentService.getStudentBestPerformance(studentId);

  return sendResponse(
    res,
    200,
    true,
    'Best performance metrics retrieved successfully',
    { bestPerformance },
    { adminId: req.user?.id, studentId },
  );
});

export const getStudentRecentActivity = asyncHandler(async (req, res) => {
  const { studentId } = req.params;
  validateObjectId(studentId, 'student ID');
  const { limit } = req.query;

  const activities = await adminStudentService.getStudentRecentActivity(studentId, { limit });

  return sendResponse(
    res,
    200,
    true,
    'Recent activity retrieved successfully',
    { activities },
    { adminId: req.user?.id, studentId },
  );
});

export const getStudentAssignedBatches = asyncHandler(async (req, res) => {
  const { studentId } = req.params;
  validateObjectId(studentId, 'student ID');

  const batches = await adminStudentService.getStudentAssignedBatches(studentId);

  return sendResponse(
    res,
    200,
    true,
    'Assigned batches retrieved successfully',
    { batches },
    { adminId: req.user?.id, studentId },
  );
});

export const getStudentTestHistory = asyncHandler(async (req, res) => {
  const { studentId } = req.params;
  validateObjectId(studentId, 'student ID');
  const { page, limit, search, status, batchId, sortBy, sortOrder } = req.query;

  const result = await adminStudentService.getStudentTestHistory(studentId, {
    page,
    limit,
    search,
    status,
    batchId,
    sortBy,
    sortOrder
  });

  return sendResponse(
    res,
    200,
    true,
    'Test history retrieved successfully',
    result,
    { adminId: req.user?.id, studentId },
  );
});

export const getStudentPerformanceRankings = asyncHandler(async (req, res) => {
  const { studentId } = req.params;
  validateObjectId(studentId, 'student ID');

  const rankings = await adminStudentService.getStudentPerformanceRankings(studentId);

  return sendResponse(
    res,
    200,
    true,
    'Performance rankings retrieved successfully',
    { rankings },
    { adminId: req.user?.id, studentId },
  );
});

export const getStudentPerformanceTrends = asyncHandler(async (req, res) => {
  const { studentId } = req.params;
  validateObjectId(studentId, 'student ID');
  const { limit } = req.query;

  const performanceTrends = await adminStudentService.getStudentPerformanceTrends(studentId, { limit });

  return sendResponse(
    res,
    200,
    true,
    'Performance trends retrieved successfully',
    { performanceTrends },
    { adminId: req.user?.id, studentId },
  );
});

export const getStudentAchievements = asyncHandler(async (req, res) => {
  const { studentId } = req.params;
  validateObjectId(studentId, 'student ID');

  const achievements = await adminStudentService.getStudentAchievements(studentId);

  return sendResponse(
    res,
    200,
    true,
    'Achievements retrieved successfully',
    { achievements },
    { adminId: req.user?.id, studentId },
  );
});

export const getStudentFullActivityLog = asyncHandler(async (req, res) => {
  const { studentId } = req.params;
  validateObjectId(studentId, 'student ID');
  const { page, limit, startDate, endDate, type } = req.query;

  const result = await adminStudentService.getStudentFullActivityLog(studentId, {
    page,
    limit,
    startDate,
    endDate,
    type
  });

  return sendResponse(
    res,
    200,
    true,
    'Activity log retrieved successfully',
    result,
    { adminId: req.user?.id, studentId },
  );
});

export const getStudentNotes = asyncHandler(async (req, res) => {
  const { studentId } = req.params;
  validateObjectId(studentId, 'student ID');

  const notes = await adminStudentService.getStudentNotes(studentId);

  return sendResponse(
    res,
    200,
    true,
    'Student notes retrieved successfully',
    notes,
    { adminId: req.user?.id, studentId },
  );
});

export const updateStudentNotes = asyncHandler(async (req, res) => {
  const { studentId } = req.params;
  validateObjectId(studentId, 'student ID');
  const { notes, batchId } = req.body;

  if (typeof notes !== 'string') {
    throw createError('Notes must be a string', 400);
  }

  if (batchId) {
    validateObjectId(batchId, 'batch ID');
  }

  const updatedNotes = await adminStudentService.updateStudentNotes(studentId, notes, batchId);

  return sendResponse(
    res,
    200,
    true,
    'Student notes updated successfully',
    updatedNotes,
    { adminId: req.user?.id, studentId, batchId },
  );
});

export const getStudentSettings = asyncHandler(async (req, res) => {
  const { studentId } = req.params;
  validateObjectId(studentId, 'student ID');

  const settings = await adminStudentService.getStudentSettings(studentId);

  return sendResponse(
    res,
    200,
    true,
    'Student settings retrieved successfully',
    { settings },
    { adminId: req.user?.id, studentId },
  );
});

export const updateStudentSettings = asyncHandler(async (req, res) => {
  const { studentId } = req.params;
  validateObjectId(studentId, 'student ID');
  const settings = req.body;

  const updatedSettings = await adminStudentService.updateStudentSettings(studentId, settings);

  return sendResponse(
    res,
    200,
    true,
    'Student settings updated successfully',
    updatedSettings,
    { adminId: req.user?.id, studentId },
  );
});

export const exportStudentActivityLog = asyncHandler(async (req, res) => {
  const { studentId } = req.params;
  validateObjectId(studentId, 'student ID');
  const { format = 'json', startDate, endDate, type } = req.query;

  const result = await adminStudentService.exportStudentActivityLog(studentId, {
    format,
    startDate,
    endDate,
    type
  });

  // For JSON, return as JSON response
  if (format === 'json') {
    return sendResponse(
      res,
      200,
      true,
      'Activity log exported successfully',
      result,
      { adminId: req.user?.id, studentId },
    );
  }

  // TODO: For CSV/Excel/PDF, set appropriate headers and return file
  return sendResponse(
    res,
    200,
    true,
    'Activity log exported successfully',
    result,
    { adminId: req.user?.id, studentId },
  );
});

