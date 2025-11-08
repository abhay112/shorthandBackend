import Student from '../models/Student.js';
import { AppError } from '../utils/AppError.js';

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
};

export default adminStudentService;

