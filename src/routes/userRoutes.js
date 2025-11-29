import express from 'express';
import {
  // Profile Management
  getStudentProfile,
  updateStudentProfile,
  getProfileOverview,

  // Dashboard
  getStudentDashboard,
  getStudentStatistics,

  // Statistics
  getWpmTrend,
  getBestPerformance,

  // Activity
  getRecentActivity,

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
  getBatchDetails,
  getBatchTests,
  getBatchResults,
  downloadBatchCertificate,

  // Status and Health Check
  getStudentStatus,

  // Legacy support
  getCurrentTestForShift,
  submitTestResult,
  getStudentProgress,
  
  // Profile API Endpoints
  // getAssignedBatches, // Unused - commented out
  getPerformanceRankings,
  getPerformanceTrends,
  getAchievements,
  getFullActivityLog,
  exportActivityLog,
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

approvedRouter.get('/profile/overview', getProfileOverview);

// ==================== DASHBOARD ====================

approvedRouter.get('/dashboard', getStudentDashboard);

approvedRouter.get('/statistics', getStudentStatistics);

// ==================== STATISTICS ====================

approvedRouter.get('/statistics/wpm-trend', getWpmTrend);

approvedRouter.get('/statistics/best-performance', getBestPerformance);

// ==================== ACTIVITY ====================

approvedRouter.get('/activity/recent', getRecentActivity);

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
approvedRouter.get('/batches/:batchId', getBatchDetails);
approvedRouter.get('/batch/:batchId/tests', getBatchTests);
approvedRouter.get('/batch/:batchId/results', getBatchResults);
approvedRouter.get('/batches/:batchId/certificate/download', downloadBatchCertificate);

// ==================== PROFILE API ENDPOINTS ====================

// Overview Tab
approvedRouter.get('/statistics/wpm-trend', getWpmTrend);
approvedRouter.get('/statistics/best-performance', getBestPerformance);
approvedRouter.get('/activity/recent', getRecentActivity);

// Batches Tab (already exists but using new method)
// approvedRouter.get('/batches', getAssignedBatches); // Already defined above

// Tests Tab (using existing endpoint)
// approvedRouter.get('/results', getStudentResults); // Already defined above

// Results Tab
approvedRouter.get('/rankings', getPerformanceRankings);
approvedRouter.get('/statistics/trends', getPerformanceTrends);
approvedRouter.get('/achievements', getAchievements);

// Activity Tab
approvedRouter.get('/activity', getFullActivityLog);
approvedRouter.get('/activity/export', exportActivityLog);

// ==================== STATUS AND HEALTH CHECK ====================

router.get('/status', getStudentStatus);

// ==================== LEGACY SUPPORT ====================

approvedRouter.get('/test/current', getCurrentTestForShift);

approvedRouter.post('/test/submit', submitTestResult);

approvedRouter.get('/progress', getStudentProgress);

router.use(approvedRouter);

export default router;
