import Student from '../models/Student.js';
import Result from '../models/Result.js';
// Test and TestSession imported but not used - kept for potential future use
import StudentBatch from '../models/StudentBatch.js';
import { AppError } from '../utils/AppError.js';
import studentService from './studentService.js';
import logger from '../utils/logger.js';

const BASE_SELECT = '-firebaseUid';

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

const formatStudentSummary = async (student, includeBatches = true, includeResults = true) => {
  if (!student) return null;

  const plain = student.toObject ? student.toObject() : student;

  const formatted = {
    id: plain._id,
    name: plain.name,
    email: plain.email,
    isApproved: plain.isApproved,
    isBlocked: plain.isBlocked,
    isOnlineMode: plain.isOnlineMode,
    lastLogin: plain.lastLogin,
    createdAt: plain.createdAt,
    updatedAt: plain.updatedAt,
  };

  // Fetch batches using StudentBatch join table if requested
  if (includeBatches) {
    const studentBatches = await StudentBatch.find({ 
      studentId: plain._id,
      status: 'active' 
    })
      .populate('batchId', 'name description startDate endDate')
      .lean();
    formatted.assignedBatches = studentBatches.map(sb => sb.batchId).filter(Boolean);
  } else {
    formatted.assignedBatches = [];
  }

  // Fetch recent results count if requested
  if (includeResults) {
    const resultsCount = await Result.countDocuments({ 
      studentId: plain._id,
      status: 'completed' 
    });
    const recentResults = await Result.find({ 
      studentId: plain._id,
      status: 'completed' 
    })
      .select('wpm accuracy createdAt')
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();
    formatted.results = {
      count: resultsCount,
      recent: recentResults
    };
  } else {
    formatted.results = { count: 0, recent: [] };
  }

  return formatted;
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
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(pageSize)
        .lean({ getters: true }),
      Student.countDocuments(filters),
    ]);

    // Format students with batches and results
    const formattedStudents = await Promise.all(
      students.map(student => formatStudentSummary(student, true, true))
    );

    return {
      students: formattedStudents,
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
      .lean({ getters: true });

    if (!student) {
      throw new AppError('Student not found', 404);
    }

    return await formatStudentSummary(student, true, true);
  },

  approve: async (id, adminId = null) => {
    const student = await Student.findById(id);
    if (!student) {
      throw new AppError('Student not found', 404);
    }

    student.isApproved = true;
    student.isBlocked = false;
    if (adminId) {
      student.approvedBy = adminId;
      student.approvedAt = new Date();
    }
    await student.save();

    return await formatStudentSummary(student.toObject(), false, false);
  },

  block: async (id) => {
    const student = await Student.findById(id);
    if (!student) {
      throw new AppError('Student not found', 404);
    }

    student.isBlocked = true;
    student.isApproved = false;
    await student.save();

    return await formatStudentSummary(student.toObject(), false, false);
  },

  unblock: async (id) => {
    const student = await Student.findById(id);
    if (!student) {
      throw new AppError('Student not found', 404);
    }

    student.isBlocked = false;
    await student.save();

    return await formatStudentSummary(student.toObject(), false, false);
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
        .select('-firebaseUid')
        .lean();

      if (!student) {
        throw new AppError('Student not found', 404);
      }

      // Get batches using StudentBatch join table
      const studentBatches = await StudentBatch.find({ 
        studentId: studentId,
        status: 'active' 
      })
        .populate('batchId', 'name description startDate endDate')
        .lean();

      // Get statistics
      const stats = await studentService.getStudentStatistics(studentId);
      
      // Format student data with statistics
      return {
        ...student,
        id: student._id,
        approved: student.isApproved,
        blocked: student.isBlocked,
        active: !student.isBlocked && student.isApproved,
        memberSince: student.createdAt ? new Date(student.createdAt).toISOString().split('T')[0] : null,
        assignedBatches: studentBatches.map(sb => sb.batchId).filter(Boolean),
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

  // Student Notes (Admin only) - Now stored in StudentBatch join table
  getStudentNotes: async (studentId, batchId = null) => {
    try {
      if (batchId) {
        // Get notes from specific batch enrollment
        const studentBatch = await StudentBatch.findOne({ 
          studentId, 
          batchId 
        }).lean();
        
        if (!studentBatch) {
          throw new AppError('Student enrollment not found', 404);
        }

        return {
          notes: studentBatch.notes || '',
          batchId: studentBatch.batchId,
          updatedAt: studentBatch.updatedAt || null
        };
      } else {
        // Get all notes from all batch enrollments
        const studentBatches = await StudentBatch.find({ 
          studentId,
          notes: { $exists: true, $ne: '' }
        })
          .populate('batchId', 'name')
          .lean();

        return {
          notes: studentBatches.map(sb => ({
            batchId: sb.batchId,
            batchName: sb.batchId?.name,
            notes: sb.notes,
            updatedAt: sb.updatedAt
          }))
        };
      }
    } catch (error) {
      logger.error('Error fetching student notes', { error: error.message, studentId });
      throw error;
    }
  },

  updateStudentNotes: async (studentId, notes, batchId = null) => {
    try {
      if (!batchId) {
        // If no batchId provided, we need to find the first active batch enrollment
        // or throw an error requiring batchId
        throw new AppError('batchId is required for updating notes', 400);
      }

      const studentBatch = await StudentBatch.findOneAndUpdate(
        { studentId, batchId },
        { 
          notes,
          updatedAt: new Date()
        },
        { new: true }
      ).populate('batchId', 'name').lean();

      if (!studentBatch) {
        throw new AppError('Student enrollment not found for this batch', 404);
      }

      return {
        notes: studentBatch.notes,
        batchId: studentBatch.batchId,
        updatedAt: studentBatch.updatedAt
      };
    } catch (error) {
      logger.error('Error updating student notes', { error: error.message, studentId, batchId });
      throw error;
    }
  },

  // Student Settings - Removed as not in Prisma schema
  // If needed, these should be stored elsewhere or added to Prisma schema
  getStudentSettings: async (_studentId) => {
    // Return default settings structure for backward compatibility
    // Note: Settings are not stored in the database per Prisma schema
    return {
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
  },

  updateStudentSettings: async (studentId, settings) => {
    // Settings not stored per Prisma schema
    // Return settings as-is for backward compatibility
    logger.warn('Student settings update called but settings are not stored in database per Prisma schema', { studentId });
    return {
      settings,
      updatedAt: new Date()
    };
  },

  exportStudentActivityLog: async (studentId, options = {}) => {
    return studentService.exportActivityLog(studentId, options);
  }
};

export default adminStudentService;

