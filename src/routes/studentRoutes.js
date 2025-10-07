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
  getStudentProgress
} from '../controllers/studentController.js';
import { authenticateFirebase, authorizeRoles, requireApproval } from '../middlewares/firebaseAuth.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = express.Router();

// Apply authentication and student role authorization to all routes
router.use(authenticateFirebase);
router.use(authorizeRoles('student'));

/**
 * @swagger
 * tags:
 *   name: Students
 *   description: Student management and operations
 */

// ==================== PROFILE MANAGEMENT ====================

/**
 * @swagger
 * /api/v1/students/profile:
 *   get:
 *     summary: Get student profile
 *     tags: [Students]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Student profile retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Student'
 */
router.get('/profile', getStudentProfile);

/**
 * @swagger
 * /api/v1/students/profile:
 *   patch:
 *     summary: Update student profile
 *     tags: [Students]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: "John Doe"
 *     responses:
 *       200:
 *         description: Profile updated successfully
 *       400:
 *         description: Invalid input data
 *       404:
 *         description: Student not found
 */
router.patch('/profile', updateStudentProfile);

// ==================== DASHBOARD ====================

/**
 * @swagger
 * /api/v1/students/dashboard:
 *   get:
 *     summary: Get student dashboard with all relevant data
 *     tags: [Students]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard data retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     student:
 *                       $ref: '#/components/schemas/Student'
 *                     currentTest:
 *                       type: object
 *                       nullable: true
 *                     recentResults:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Result'
 *                     statistics:
 *                       type: object
 *                     rankings:
 *                       type: array
 *                     upcomingTests:
 *                       type: array
 */
router.get('/dashboard', requireApproval, getStudentDashboard);

/**
 * @swagger
 * /api/v1/students/statistics:
 *   get:
 *     summary: Get student performance statistics
 *     tags: [Students]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Statistics retrieved successfully
 */
router.get('/statistics', requireApproval, getStudentStatistics);

// ==================== TEST MANAGEMENT ====================

/**
 * @swagger
 * /api/v1/students/tests/current:
 *   get:
 *     summary: Get current day's test for student
 *     tags: [Students]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Current test retrieved successfully
 */
router.get('/tests/current', requireApproval, getCurrentDayTest);

/**
 * @swagger
 * /api/v1/students/tests/upcoming:
 *   get:
 *     summary: Get upcoming tests for student
 *     tags: [Students]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Upcoming tests retrieved successfully
 */
router.get('/tests/upcoming', requireApproval, getUpcomingTests);

/**
 * @swagger
 * /api/v1/students/tests/{testId}/access:
 *   get:
 *     summary: Check if student can take a specific test
 *     tags: [Students]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: testId
 *         required: true
 *         schema:
 *           type: string
 *         description: Test ID
 *     responses:
 *       200:
 *         description: Access check completed
 */
router.get('/tests/:testId/access', requireApproval, checkTestAccess);

// ==================== TEST SESSION MANAGEMENT ====================

/**
 * @swagger
 * /api/v1/students/tests/{testId}/start:
 *   post:
 *     summary: Start a test session
 *     tags: [Students]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: testId
 *         required: true
 *         schema:
 *           type: string
 *         description: Test ID
 *     responses:
 *       200:
 *         description: Test session started successfully
 *       403:
 *         description: Access denied or test not available
 */
router.post('/tests/:testId/start', requireApproval, startTestSession);

/**
 * @swagger
 * /api/v1/students/sessions/{sessionId}/end:
 *   post:
 *     summary: End a test session and submit results
 *     tags: [Students]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *         description: Session ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - wpm
 *               - accuracy
 *               - speed
 *               - totalWords
 *               - correctWords
 *               - incorrectWords
 *               - totalCharacters
 *               - correctCharacters
 *               - incorrectCharacters
 *               - mistakes
 *             properties:
 *               wpm:
 *                 type: number
 *                 example: 45.5
 *               accuracy:
 *                 type: number
 *                 example: 95.2
 *               speed:
 *                 type: number
 *                 example: 42.1
 *               totalWords:
 *                 type: number
 *                 example: 150
 *               correctWords:
 *                 type: number
 *                 example: 143
 *               incorrectWords:
 *                 type: number
 *                 example: 7
 *               totalCharacters:
 *                 type: number
 *                 example: 750
 *               correctCharacters:
 *                 type: number
 *                 example: 715
 *               incorrectCharacters:
 *                 type: number
 *                 example: 35
 *               mistakes:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     word:
 *                       type: string
 *                     expected:
 *                       type: string
 *                     typed:
 *                       type: string
 *                     position:
 *                       type: number
 *                     timestamp:
 *                       type: string
 *                       format: date-time
 *     responses:
 *       200:
 *         description: Test completed successfully
 *       400:
 *         description: Invalid result data
 *       404:
 *         description: Session not found
 */
router.post('/sessions/:sessionId/end', requireApproval, endTestSession);

/**
 * @swagger
 * /api/v1/students/sessions/{sessionId}/pause:
 *   post:
 *     summary: Pause a test session
 *     tags: [Students]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *         description: Session ID
 *     responses:
 *       200:
 *         description: Test session paused
 */
router.post('/sessions/:sessionId/pause', requireApproval, pauseTestSession);

/**
 * @swagger
 * /api/v1/students/sessions/{sessionId}/resume:
 *   post:
 *     summary: Resume a paused test session
 *     tags: [Students]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *         description: Session ID
 *     responses:
 *       200:
 *         description: Test session resumed
 */
router.post('/sessions/:sessionId/resume', requireApproval, resumeTestSession);

// ==================== RESULTS MANAGEMENT ====================

/**
 * @swagger
 * /api/v1/students/results:
 *   get:
 *     summary: Get student's test results
 *     tags: [Students]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: batchId
 *         schema:
 *           type: string
 *         description: Filter by batch ID
 *       - in: query
 *         name: testId
 *         schema:
 *           type: string
 *         description: Filter by test ID
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Results per page
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           default: submittedAt
 *         description: Sort field
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *         description: Sort order
 *     responses:
 *       200:
 *         description: Results retrieved successfully
 */
router.get('/results', requireApproval, getStudentResults);

/**
 * @swagger
 * /api/v1/students/results/{resultId}:
 *   get:
 *     summary: Get specific result details
 *     tags: [Students]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: resultId
 *         required: true
 *         schema:
 *           type: string
 *         description: Result ID
 *     responses:
 *       200:
 *         description: Result details retrieved successfully
 */
router.get('/results/:resultId', requireApproval, getStudentResultById);

// ==================== RANKINGS AND LEADERBOARDS ====================

/**
 * @swagger
 * /api/v1/students/rankings:
 *   get:
 *     summary: Get student's rankings
 *     tags: [Students]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: batchId
 *         schema:
 *           type: string
 *         description: Filter by batch ID
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Rankings per page
 *     responses:
 *       200:
 *         description: Rankings retrieved successfully
 */
router.get('/rankings', requireApproval, getStudentRankings);

/**
 * @swagger
 * /api/v1/students/batches/{batchId}/leaderboard:
 *   get:
 *     summary: Get batch leaderboard
 *     tags: [Students]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: batchId
 *         required: true
 *         schema:
 *           type: string
 *         description: Batch ID
 *       - in: query
 *         name: testId
 *         schema:
 *           type: string
 *         description: Filter by specific test ID
 *     responses:
 *       200:
 *         description: Leaderboard retrieved successfully
 */
router.get('/batches/:batchId/leaderboard', requireApproval, getBatchLeaderboard);

// ==================== BATCH MANAGEMENT ====================

/**
 * @swagger
 * /api/v1/students/batches:
 *   get:
 *     summary: Get student's assigned batches
 *     tags: [Students]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Batches retrieved successfully
 */
router.get('/batches', getStudentBatches);

// ==================== STATUS AND HEALTH CHECK ====================

/**
 * @swagger
 * /api/v1/students/status:
 *   get:
 *     summary: Get student status and approval information
 *     tags: [Students]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Status retrieved successfully
 */
router.get('/status', getStudentStatus);

// ==================== LEGACY SUPPORT ====================

/**
 * @swagger
 * /api/v1/students/test/current:
 *   get:
 *     summary: Get current test (legacy endpoint)
 *     tags: [Students]
 *     security:
 *       - bearerAuth: []
 *     deprecated: true
 *     responses:
 *       200:
 *         description: Current test retrieved successfully
 */
router.get('/test/current', requireApproval, getCurrentTestForShift);

/**
 * @swagger
 * /api/v1/students/test/submit:
 *   post:
 *     summary: Submit test result (legacy endpoint)
 *     tags: [Students]
 *     security:
 *       - bearerAuth: []
 *     deprecated: true
 *     responses:
 *       410:
 *         description: This endpoint is deprecated
 */
router.post('/test/submit', requireApproval, submitTestResult);

/**
 * @swagger
 * /api/v1/students/progress:
 *   get:
 *     summary: Get student progress (legacy endpoint)
 *     tags: [Students]
 *     security:
 *       - bearerAuth: []
 *     deprecated: true
 *     responses:
 *       200:
 *         description: Progress retrieved successfully
 */
router.get('/progress', requireApproval, getStudentProgress);

export default router;
