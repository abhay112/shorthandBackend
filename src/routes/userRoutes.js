import express from 'express';
import {
  // Profile Management
  getStudentProfile,
  updateStudentProfile,

  // Dashboard
  getStudentDashboard,
  getStudentStatistics,

  // Test Management
  getCurrentDayTest,
  getUpcomingTests,
  checkTestAccess,

  // Test Session Management
  startTestSession,
  endTestSession,
  pauseTestSession,
  resumeTestSession,

  // Results Management
  getStudentResults,
  getStudentResultById,

  // Rankings and Leaderboards
  getStudentRankings,
  getBatchLeaderboard,

  // Batch Management
  getStudentBatches,

  // Status and Health Check
  getStudentStatus,

  // Legacy support
  getCurrentTestForShift,
  submitTestResult,
  getStudentProgress,
} from '../controllers/studentController.js';
import { authenticateFirebase, requireApproval } from '../middlewares/firebaseAuth.js';
import { requireStudent } from '../middlewares/authMiddleware.js';

const router = express.Router();
const approvedRouter = express.Router();
approvedRouter.use(requireApproval);

// Apply authentication and student role authorization to all routes
router.use(authenticateFirebase);
router.use(requireStudent);

// ==================== PROFILE MANAGEMENT ====================

router.get('/profile', getStudentProfile);

router.patch('/profile', updateStudentProfile);

// ==================== DASHBOARD ====================

approvedRouter.get('/dashboard', getStudentDashboard);

approvedRouter.get('/statistics', getStudentStatistics);

// ==================== TEST MANAGEMENT ====================

approvedRouter.get('/tests/current', getCurrentDayTest);

approvedRouter.get('/tests/upcoming', getUpcomingTests);

approvedRouter.get('/tests/:testId/access', checkTestAccess);

// ==================== TEST SESSION MANAGEMENT ====================

approvedRouter.post('/tests/:testId/start', startTestSession);

approvedRouter.post('/sessions/:sessionId/end', endTestSession);

approvedRouter.post('/sessions/:sessionId/pause', pauseTestSession);

approvedRouter.post('/sessions/:sessionId/resume', resumeTestSession);

// ==================== RESULTS MANAGEMENT ====================

approvedRouter.get('/results', getStudentResults);

approvedRouter.get('/results/:resultId', getStudentResultById);

// ==================== RANKINGS AND LEADERBOARDS ====================

approvedRouter.get('/rankings', getStudentRankings);

approvedRouter.get('/batches/:batchId/leaderboard', getBatchLeaderboard);

// ==================== BATCH MANAGEMENT ====================

approvedRouter.get('/batches', getStudentBatches);

// ==================== STATUS AND HEALTH CHECK ====================

router.get('/status', getStudentStatus);

// ==================== LEGACY SUPPORT ====================

approvedRouter.get('/test/current', getCurrentTestForShift);

approvedRouter.post('/test/submit', submitTestResult);

approvedRouter.get('/progress', getStudentProgress);

router.use(approvedRouter);

export default router;
