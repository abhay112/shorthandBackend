import express from 'express';
import Student from '../models/Student.js';
import { authenticateFirebase, authorizeRoles, requireApproval } from '../middlewares/firebaseAuth.js';

const router = express.Router();

// Get all students (Admin only)
router.get('/students', authenticateFirebase, authorizeRoles('admin'), async (req, res) => {
  try {
    const { page = 1, limit = 10, status, search } = req.query;
    const query = {};

    // Filter by approval status
    if (status === 'approved') {
      query.isApproved = true;
      query.isBlocked = false;
    } else if (status === 'pending') {
      query.isApproved = false;
      query.isBlocked = false;
    } else if (status === 'blocked') {
      query.isBlocked = true;
    }

    // Search by name or email
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    const students = await Student.find(query)
      .select('-firebaseUid')
      .populate('assignedShifts', 'name')
      .populate('results', 'score createdAt')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Student.countDocuments(query);

    res.json({
      success: true,
      data: {
        students,
        pagination: {
          current: parseInt(page),
          pages: Math.ceil(total / limit),
          total
        }
      }
    });
  } catch (error) {
    console.error('Get students error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching students'
    });
  }
});

// Get student by ID (Admin only)
router.get('/students/:id', authenticateFirebase, authorizeRoles('admin'), async (req, res) => {
  try {
    const student = await Student.findById(req.params.id)
      .populate('assignedShifts', 'name')
      .populate('results', 'score createdAt');

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    res.json({
      success: true,
      data: student
    });
  } catch (error) {
    console.error('Get student error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching student'
    });
  }
});

// Approve student (Admin only)
router.patch('/students/:id/approve', authenticateFirebase, authorizeRoles('admin'), async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    student.isApproved = true;
    student.isBlocked = false;
    await student.save();

    res.json({
      success: true,
      message: 'Student approved successfully',
      data: {
        id: student._id,
        name: student.name,
        email: student.email,
        isApproved: student.isApproved,
        isBlocked: student.isBlocked
      }
    });
  } catch (error) {
    console.error('Approve student error:', error);
    res.status(500).json({
      success: false,
      message: 'Error approving student'
    });
  }
});

// Block student (Admin only)
router.patch('/students/:id/block', authenticateFirebase, authorizeRoles('admin'), async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    student.isBlocked = true;
    student.isApproved = false;
    await student.save();

    res.json({
      success: true,
      message: 'Student blocked successfully',
      data: {
        id: student._id,
        name: student.name,
        email: student.email,
        isApproved: student.isApproved,
        isBlocked: student.isBlocked
      }
    });
  } catch (error) {
    console.error('Block student error:', error);
    res.status(500).json({
      success: false,
      message: 'Error blocking student'
    });
  }
});

// Unblock student (Admin only)
router.patch('/students/:id/unblock', authenticateFirebase, authorizeRoles('admin'), async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    student.isBlocked = false;
    await student.save();

    res.json({
      success: true,
      message: 'Student unblocked successfully',
      data: {
        id: student._id,
        name: student.name,
        email: student.email,
        isApproved: student.isApproved,
        isBlocked: student.isBlocked
      }
    });
  } catch (error) {
    console.error('Unblock student error:', error);
    res.status(500).json({
      success: false,
      message: 'Error unblocking student'
    });
  }
});

// Bulk approve students (Admin only)
router.patch('/students/bulk/approve', authenticateFirebase, authorizeRoles('admin'), async (req, res) => {
  try {
    const { studentIds } = req.body;

    if (!studentIds || !Array.isArray(studentIds)) {
      return res.status(400).json({
        success: false,
        message: 'Student IDs array is required'
      });
    }

    const result = await Student.updateMany(
      { _id: { $in: studentIds } },
      { 
        $set: { 
          isApproved: true, 
          isBlocked: false 
        } 
      }
    );

    res.json({
      success: true,
      message: `${result.modifiedCount} students approved successfully`,
      data: {
        modifiedCount: result.modifiedCount
      }
    });
  } catch (error) {
    console.error('Bulk approve error:', error);
    res.status(500).json({
      success: false,
      message: 'Error approving students'
    });
  }
});

// Bulk block students (Admin only)
router.patch('/students/bulk/block', authenticateFirebase, authorizeRoles('admin'), async (req, res) => {
  try {
    const { studentIds } = req.body;

    if (!studentIds || !Array.isArray(studentIds)) {
      return res.status(400).json({
        success: false,
        message: 'Student IDs array is required'
      });
    }

    const result = await Student.updateMany(
      { _id: { $in: studentIds } },
      { 
        $set: { 
          isBlocked: true, 
          isApproved: false 
        } 
      }
    );

    res.json({
      success: true,
      message: `${result.modifiedCount} students blocked successfully`,
      data: {
        modifiedCount: result.modifiedCount
      }
    });
  } catch (error) {
    console.error('Bulk block error:', error);
    res.status(500).json({
      success: false,
      message: 'Error blocking students'
    });
  }
});

// Get student statistics (Admin only)
router.get('/students/stats', authenticateFirebase, authorizeRoles('admin'), async (req, res) => {
  try {
    const totalStudents = await Student.countDocuments();
    const approvedStudents = await Student.countDocuments({ isApproved: true, isBlocked: false });
    const pendingStudents = await Student.countDocuments({ isApproved: false, isBlocked: false });
    const blockedStudents = await Student.countDocuments({ isBlocked: true });

    res.json({
      success: true,
      data: {
        total: totalStudents,
        approved: approvedStudents,
        pending: pendingStudents,
        blocked: blockedStudents
      }
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching statistics'
    });
  }
});

export default router;
