import Student from '../models/Student.js';
import Result from '../models/Result.js';
import Test from '../models/Test.js';
import TestSession from '../models/TestSession.js';
import { AppError } from '../utils/AppError.js';
import studentService from './studentService.js';
import logger from '../utils/logger.js';

const BASE_SELECT = '-firebaseUid';
const BASE_POPULATE = [
  { path: 'results', select: 'score createdAt wpm accuracy' },
  { path: 'assignedBatches', select: 'name description startDate endDate' },
];

const buildStatusFilter = (status) => {
  if (!status) return {};

  switch (status) {
    case 'approved':
      return { isApproved: true, isBlocked: false };
    case 'pending':
      return { isApproved: false, isBlocked: false };
    case 'blocked':
      return { isBlocked: true };
    default:
      return {};
  }
};

const formatStudentSummary = (student) => {
  if (!student) return null;

  const plain = student.toObject ? student.toObject() : student;

  return {
    id: plain._id,
    name: plain.name,
    email: plain.email,
    isApproved: plain.isApproved,
    isBlocked: plain.isBlocked,
    isOnlineMode: plain.isOnlineMode,
    assignedBatches: plain.assignedBatches,
    results: plain.results,
    lastLogin: plain.lastLogin,
    createdAt: plain.createdAt,
    updatedAt: plain.updatedAt,
  };
};

export const adminStudentService = {
  list: async ({ page = 1, limit = 10, status, search }) => {
    const pageNumber = Math.max(parseInt(page, 10) || 1, 1);
    const pageSize = Math.min(Math.max(parseInt(limit, 10) || 10, 1), 100);
    const filters = buildStatusFilter(status);

    if (search) {
      filters.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (pageNumber - 1) * pageSize;

    const [students, total] = await Promise.all([
      Student.find(filters)
        .select(BASE_SELECT)
        .populate(BASE_POPULATE)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(pageSize)
        .lean({ getters: true }),
      Student.countDocuments(filters),
    ]);

    return {
      students: students.map(formatStudentSummary),
      pagination: {
        current: pageNumber,
        pages: Math.ceil(total / pageSize) || 1,
        total,
        limit: pageSize,
      },
    };
  },

  findById: async (id) => {
    const student = await Student.findById(id)
      .select(BASE_SELECT)
      .populate(BASE_POPULATE)
      .lean({ getters: true });

    if (!student) {
      throw new AppError('Student not found', 404);
    }

    return formatStudentSummary(student);
  },

  approve: async (id) => {
    const student = await Student.findById(id);
    if (!student) {
      throw new AppError('Student not found', 404);
    }

    student.isApproved = true;
    student.isBlocked = false;
    await student.save();

    return formatStudentSummary(student);
  },

  block: async (id) => {
    const student = await Student.findById(id);
    if (!student) {
      throw new AppError('Student not found', 404);
    }

    student.isBlocked = true;
    student.isApproved = false;
    await student.save();

    return formatStudentSummary(student);
  },

  unblock: async (id) => {
    const student = await Student.findById(id);
    if (!student) {
      throw new AppError('Student not found', 404);
    }

    student.isBlocked = false;
    await student.save();

    return formatStudentSummary(student);
  },

  bulkApprove: async (studentIds = []) => {
    if (!Array.isArray(studentIds) || studentIds.length === 0) {
      throw new AppError('Student IDs array is required', 400);
    }

    const result = await Student.updateMany(
      { _id: { $in: studentIds } },
      {
        $set: {
          isApproved: true,
          isBlocked: false,
        },
      },
    );

    return {
      modifiedCount: result.modifiedCount || 0,
    };
  },

  bulkBlock: async (studentIds = []) => {
    if (!Array.isArray(studentIds) || studentIds.length === 0) {
      throw new AppError('Student IDs array is required', 400);
    }

    const result = await Student.updateMany(
      { _id: { $in: studentIds } },
      {
        $set: {
          isBlocked: true,
          isApproved: false,
        },
      },
    );

    return {
      modifiedCount: result.modifiedCount || 0,
    };
  },

  stats: async () => {
    const [total, approved, pending, blocked] = await Promise.all([
      Student.countDocuments(),
      Student.countDocuments({ isApproved: true, isBlocked: false }),
      Student.countDocuments({ isApproved: false, isBlocked: false }),
      Student.countDocuments({ isBlocked: true }),
    ]);

    return {
      total,
      approved,
      pending,
      blocked,
    };
  },

  // Profile API Methods (Admin versions that accept studentId)
  getStudentProfile: async (studentId) => {
    try {
      const student = await Student.findById(studentId)
        .populate('assignedBatches', 'name description startDate endDate')
        .select('-firebaseUid');

      if (!student) {
        throw new AppError('Student not found', 404);
      }

      // Get statistics
      const stats = await studentService.getStudentStatistics(studentId);
      
      // Format student data with statistics
      const studentData = student.toObject ? student.toObject() : student;
      return {
        ...studentData,
        id: studentData._id,
        approved: studentData.isApproved,
        blocked: studentData.isBlocked,
        active: !studentData.isBlocked && studentData.isApproved,
        memberSince: studentData.createdAt ? new Date(studentData.createdAt).toISOString().split('T')[0] : null,
        statistics: stats
      };
    } catch (error) {
      logger.error('Error fetching student profile (admin)', { error: error.message, studentId });
      throw error;
    }
  },

  getStudentWpmTrend: async (studentId, options = {}) => {
    return studentService.getWpmTrend(studentId, options);
  },

  getStudentBestPerformance: async (studentId) => {
    return studentService.getBestPerformance(studentId);
  },

  getStudentRecentActivity: async (studentId, options = {}) => {
    return studentService.getRecentActivity(studentId, options);
  },

  getStudentAssignedBatches: async (studentId) => {
    return studentService.getAssignedBatchesWithDetails(studentId);
  },

  getStudentTestHistory: async (studentId, options = {}) => {
    return studentService.getTestHistory(studentId, options);
  },

  getStudentPerformanceRankings: async (studentId) => {
    return studentService.getPerformanceRankings(studentId);
  },

  getStudentPerformanceTrends: async (studentId, options = {}) => {
    return studentService.getPerformanceTrends(studentId, options);
  },

  getStudentAchievements: async (studentId) => {
    return studentService.getAchievements(studentId);
  },

  getStudentFullActivityLog: async (studentId, options = {}) => {
    return studentService.getFullActivityLog(studentId, options);
  },

  // Student Notes (Admin only)
  getStudentNotes: async (studentId) => {
    try {
      const student = await Student.findById(studentId).select('notes notesUpdatedAt notesUpdatedBy').lean();
      if (!student) {
        throw new AppError('Student not found', 404);
      }

      return {
        notes: student.notes || '',
        updatedAt: student.notesUpdatedAt || null,
        updatedBy: student.notesUpdatedBy || null
      };
    } catch (error) {
      logger.error('Error fetching student notes', { error: error.message, studentId });
      throw error;
    }
  },

  updateStudentNotes: async (studentId, notes, adminId) => {
    try {
      const student = await Student.findByIdAndUpdate(
        studentId,
        {
          notes,
          notesUpdatedAt: new Date(),
          notesUpdatedBy: adminId
        },
        { new: true }
      ).select('notes notesUpdatedAt notesUpdatedBy').lean();

      if (!student) {
        throw new AppError('Student not found', 404);
      }

      return {
        notes: student.notes,
        updatedAt: student.notesUpdatedAt
      };
    } catch (error) {
      logger.error('Error updating student notes', { error: error.message, studentId });
      throw error;
    }
  },

  // Student Settings (Admin only)
  getStudentSettings: async (studentId) => {
    try {
      const student = await Student.findById(studentId).select('settings').lean();
      if (!student) {
        throw new AppError('Student not found', 404);
      }

      // Return default settings if not set
      return student.settings || {
        notifications: {
          emailNotifications: true,
          testReminders: true,
          resultNotifications: true,
          batchUpdates: true
        },
        preferences: {
          theme: 'light',
          language: 'en',
          timezone: 'UTC'
        },
        permissions: {
          canViewResults: true,
          canViewRankings: true,
          canRetakeTests: true
        },
        restrictions: {
          maxDailyTests: 5,
          allowedTestTypes: ['practice', 'assessment'],
          blockedCategories: []
        }
      };
    } catch (error) {
      logger.error('Error fetching student settings', { error: error.message, studentId });
      throw error;
    }
  },

  updateStudentSettings: async (studentId, settings) => {
    try {
      const student = await Student.findByIdAndUpdate(
        studentId,
        { 
          settings,
          settingsUpdatedAt: new Date()
        },
        { new: true }
      ).select('settings settingsUpdatedAt').lean();

      if (!student) {
        throw new AppError('Student not found', 404);
      }

      return {
        settings: student.settings,
        updatedAt: student.settingsUpdatedAt
      };
    } catch (error) {
      logger.error('Error updating student settings', { error: error.message, studentId });
      throw error;
    }
  },

  exportStudentActivityLog: async (studentId, options = {}) => {
    return studentService.exportActivityLog(studentId, options);
  }
};

export default adminStudentService;

