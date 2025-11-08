import express from 'express';
import { authenticateFirebase, authorizeRoles } from '../middlewares/firebaseAuth.js';
import {
  approveStudent,
  blockStudent,
  bulkApproveStudents,
  bulkBlockStudents,
  getStudent,
  getStudentStats,
  listStudents,
  unblockStudent,
} from '../controllers/adminStudentController.js';

const router = express.Router();

// Apply authentication and admin authorization to all routes
router.use(authenticateFirebase);
router.use(authorizeRoles('admin', 'super_admin'));

// Student listing and statistics
router.get('/', listStudents);
router.get('/stats', getStudentStats);

// Bulk operations must be defined before routes with :id
router.patch('/bulk/approve', bulkApproveStudents);
router.patch('/bulk/block', bulkBlockStudents);

// Individual student operations
router.get('/:id', getStudent);
router.patch('/:id/approve', approveStudent);
router.patch('/:id/block', blockStudent);
router.patch('/:id/unblock', unblockStudent);

export default router;
