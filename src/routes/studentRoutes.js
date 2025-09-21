import express from 'express';
import {
  getStudentProfile,
  getCurrentTestForShift,
  submitTestResult,
  getStudentResults,
  getStudentProgress
} from '../controllers/studentController.js';
import { authenticateFirebase, authorizeRoles, requireApproval } from '../middlewares/firebaseAuth.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import Student from '../models/Student.js';

const router = express.Router();

// Apply authentication and student role authorization to all routes
router.use(authenticateFirebase);
router.use(authorizeRoles('student'));

// Student profile routes
router.get('/profile', getStudentProfile);

// Update student's own profile
router.patch('/profile', asyncHandler(async (req, res) => {
  const { name } = req.body;
  const allowedUpdates = {};

  if (name) allowedUpdates.name = name;

  const student = await Student.findByIdAndUpdate(
    req.user.id,
    allowedUpdates,
    { new: true, runValidators: true }
  ).select('-firebaseUid');

  if (!student) {
    return res.status(404).json({
      success: false,
      message: 'Student not found'
    });
  }

  res.json({
    success: true,
    message: 'Profile updated successfully',
    data: student
  });
}));

// Test and results routes (require approval)
router.use(requireApproval);

router.get('/test/current', getCurrentTestForShift);
router.post('/test/submit', submitTestResult);
router.get('/results', getStudentResults);
router.get('/progress', getStudentProgress);

// Get student's assigned shifts
router.get('/shifts', asyncHandler(async (req, res) => {
  const student = await Student.findById(req.user.id).populate('assignedShifts');

  if (!student) {
    return res.status(404).json({
      success: false,
      message: 'Student not found'
    });
  }

  res.json({
    success: true,
    data: student.assignedShifts
  });
}));

// Check approval status (no approval required for this)
router.get('/status', asyncHandler(async (req, res) => {
  const student = await Student.findById(req.user.id);

  if (!student) {
    return res.status(404).json({
      success: false,
      message: 'Student not found'
    });
  }

  res.json({
    success: true,
    data: {
      isApproved: student.isApproved,
      isBlocked: student.isBlocked,
      status: student.isBlocked 
        ? 'blocked' 
        : student.isApproved 
          ? 'approved' 
          : 'pending'
    }
  });
}));

export default router;