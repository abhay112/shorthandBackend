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
  getStudentProfile,
  getStudentWpmTrend,
  getStudentBestPerformance,
  getStudentRecentActivity,
  getStudentAssignedBatches,
  getStudentTestHistory,
  getStudentPerformanceRankings,
  getStudentPerformanceTrends,
  getStudentAchievements,
  getStudentFullActivityLog,
  getStudentNotes,
  updateStudentNotes,
  getStudentSettings,
  updateStudentSettings,
  exportStudentActivityLog,
  resetStudentPassword,
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

// Profile API Endpoints (must be before /:id to avoid route conflicts)
// Main profile
router.get('/:studentId/profile', getStudentProfile);

// Overview Tab
router.get('/:studentId/performance/wpm-trend', getStudentWpmTrend);
router.get('/:studentId/performance/best', getStudentBestPerformance);
router.get('/:studentId/activity/recent', getStudentRecentActivity);

// Batches Tab
router.get('/:studentId/batches', getStudentAssignedBatches);

// Tests Tab
router.get('/:studentId/tests', getStudentTestHistory);

// Results Tab
router.get('/:studentId/rankings', getStudentPerformanceRankings);
router.get('/:studentId/performance/trends', getStudentPerformanceTrends);
router.get('/:studentId/achievements', getStudentAchievements);

// Activity Tab
router.get('/:studentId/activity', getStudentFullActivityLog);
router.get('/:studentId/activity/export', exportStudentActivityLog);

// Notes (Admin only)
router.get('/:studentId/notes', getStudentNotes);
router.put('/:studentId/notes', updateStudentNotes);

// Settings (Admin only)
router.get('/:studentId/settings', getStudentSettings);
router.put('/:studentId/settings', updateStudentSettings);

// Individual student operations (must be last to avoid conflicts)
router.get('/:id', getStudent);
router.patch('/:id/approve', approveStudent);
router.patch('/:id/block', blockStudent);
router.patch('/:id/unblock', unblockStudent);
router.post('/:id/reset-password', resetStudentPassword);

export default router;
