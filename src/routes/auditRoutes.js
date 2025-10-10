import express from 'express';
import {
  getEntityAuditHistory,
  getUserAuditActivity,
  getSystemAuditActivity,
  getCriticalAuditActions,
  getAuditStatistics,
  archiveOldAuditLogs,
  deleteArchivedAuditLogs,
  getMyAuditActivity,
  exportAuditLogs
} from '../controllers/auditController.js';
import { requireAuth } from '../middlewares/authMiddleware.js';
import { requireRole } from '../middlewares/authMiddleware.js';

const router = express.Router();

// All audit routes require authentication
router.use(requireAuth);

/**
 * @swagger
 * components:
 *   schemas:
 *     AuditLog:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           description: Unique identifier for the audit log
 *         entityType:
 *           type: string
 *           enum: [Student, Admin, Test, Batch, Result, TestSession]
 *           description: Type of entity that was acted upon
 *         entityId:
 *           type: string
 *           description: ID of the entity that was acted upon
 *         action:
 *           type: string
 *           enum: [CREATE, UPDATE, DELETE, LOGIN, LOGOUT, APPROVE, DISAPPROVE, BLOCK, UNBLOCK, ASSIGN_BATCH, REMOVE_BATCH, ASSIGN_TEST, REMOVE_TEST, START_TEST_SESSION, END_TEST_SESSION, PAUSE_TEST_SESSION, RESUME_TEST_SESSION, SUBMIT_RESULT, UPDATE_RESULT, PUBLISH_TEST, UNPUBLISH_TEST, ACTIVATE, DEACTIVATE]
 *           description: Action that was performed
 *         performedBy:
 *           type: object
 *           properties:
 *             userId:
 *               type: string
 *               description: ID of the user who performed the action
 *             userType:
 *               type: string
 *               enum: [Student, Admin]
 *             userName:
 *               type: string
 *             userEmail:
 *               type: string
 *         changes:
 *           type: object
 *           properties:
 *             before:
 *               type: object
 *               description: State before the change
 *             after:
 *               type: object
 *               description: State after the change
 *             fieldsChanged:
 *               type: array
 *               items:
 *                 type: string
 *         metadata:
 *           type: object
 *           properties:
 *             ipAddress:
 *               type: string
 *             userAgent:
 *               type: string
 *             endpoint:
 *               type: string
 *             method:
 *               type: string
 *             responseTime:
 *               type: number
 *             statusCode:
 *               type: number
 *         severity:
 *           type: string
 *           enum: [LOW, MEDIUM, HIGH, CRITICAL]
 *         category:
 *           type: string
 *           enum: [AUTHENTICATION, AUTHORIZATION, DATA_CHANGE, SYSTEM, TEST_ACTIVITY, ADMIN_ACTION]
 *         timestamp:
 *           type: string
 *           format: date-time
 *         reason:
 *           type: string
 *           description: Reason for the action
 *         tags:
 *           type: array
 *           items:
 *             type: string
 */

/**
 * @swagger
 * /api/v1/audit/my-activity:
 *   get:
 *     summary: Get current user's audit activity
 *     tags: [Audit]
 *     security:
 *       - bearerAuth: []
 *     parameters:
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
 *           default: 50
 *         description: Number of records per page
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for filtering
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for filtering
 *       - in: query
 *         name: action
 *         schema:
 *           type: string
 *         description: Filter by specific action
 *     responses:
 *       200:
 *         description: User audit activity retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     logs:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/AuditLog'
 *                     summary:
 *                       type: array
 *                       description: Activity summary by action type
 *                     pagination:
 *                       type: object
 */
router.get('/my-activity', getMyAuditActivity);

/**
 * @swagger
 * /api/v1/audit/entity/{entityType}/{entityId}:
 *   get:
 *     summary: Get audit history for a specific entity (Admin only)
 *     tags: [Audit]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: entityType
 *         required: true
 *         schema:
 *           type: string
 *           enum: [Student, Admin, Test, Batch, Result, TestSession]
 *         description: Type of entity
 *       - in: path
 *         name: entityId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the entity
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *       - in: query
 *         name: action
 *         schema:
 *           type: string
 *         description: Filter by specific action
 *       - in: query
 *         name: severity
 *         schema:
 *           type: string
 *           enum: [LOW, MEDIUM, HIGH, CRITICAL]
 *         description: Filter by severity level
 *     responses:
 *       200:
 *         description: Entity audit history retrieved successfully
 *       403:
 *         description: Forbidden - Admin access required
 */
router.get('/entity/:entityType/:entityId', requireRole(['admin', 'super_admin']), getEntityAuditHistory);

/**
 * @swagger
 * /api/v1/audit/user/{userId}:
 *   get:
 *     summary: Get audit activity for a specific user (Admin only, or own data)
 *     tags: [Audit]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the user
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *           enum: [AUTHENTICATION, AUTHORIZATION, DATA_CHANGE, SYSTEM, TEST_ACTIVITY, ADMIN_ACTION]
 *         description: Filter by category
 *     responses:
 *       200:
 *         description: User audit activity retrieved successfully
 *       403:
 *         description: Forbidden - Can only access own data or admin required
 */
router.get('/user/:userId', getUserAuditActivity);

/**
 * @swagger
 * /api/v1/audit/system:
 *   get:
 *     summary: Get system-wide audit activity (Admin only)
 *     tags: [Audit]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 100
 *       - in: query
 *         name: action
 *         schema:
 *           type: string
 *         description: Filter by specific action
 *       - in: query
 *         name: severity
 *         schema:
 *           type: string
 *           enum: [LOW, MEDIUM, HIGH, CRITICAL]
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *           enum: [AUTHENTICATION, AUTHORIZATION, DATA_CHANGE, SYSTEM, TEST_ACTIVITY, ADMIN_ACTION]
 *       - in: query
 *         name: entityType
 *         schema:
 *           type: string
 *           enum: [Student, Admin, Test, Batch, Result, TestSession]
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: System audit activity retrieved successfully
 *       403:
 *         description: Forbidden - Admin access required
 */
router.get('/system', requireRole(['admin', 'super_admin']), getSystemAuditActivity);

/**
 * @swagger
 * /api/v1/audit/critical:
 *   get:
 *     summary: Get critical audit actions (Admin only)
 *     tags: [Audit]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: hours
 *         schema:
 *           type: integer
 *           default: 24
 *         description: Number of hours to look back
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 100
 *         description: Maximum number of records to return
 *     responses:
 *       200:
 *         description: Critical audit actions retrieved successfully
 *       403:
 *         description: Forbidden - Admin access required
 */
router.get('/critical', requireRole(['admin', 'super_admin']), getCriticalAuditActions);

/**
 * @swagger
 * /api/v1/audit/statistics:
 *   get:
 *     summary: Get audit statistics (Admin only)
 *     tags: [Audit]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: days
 *         schema:
 *           type: integer
 *           default: 30
 *         description: Number of days to include in statistics
 *     responses:
 *       200:
 *         description: Audit statistics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     summary:
 *                       type: object
 *                       properties:
 *                         totalActions:
 *                           type: number
 *                         uniqueUserCount:
 *                           type: number
 *                     dailyActivity:
 *                       type: array
 *                       description: Daily activity breakdown
 *       403:
 *         description: Forbidden - Admin access required
 */
router.get('/statistics', requireRole(['admin', 'super_admin']), getAuditStatistics);

/**
 * @swagger
 * /api/v1/audit/export:
 *   get:
 *     summary: Export audit logs (Admin only)
 *     tags: [Audit]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for export
 *       - in: query
 *         name: endDate
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for export
 *       - in: query
 *         name: format
 *         schema:
 *           type: string
 *           enum: [json, csv]
 *           default: json
 *         description: Export format
 *       - in: query
 *         name: entityType
 *         schema:
 *           type: string
 *           enum: [Student, Admin, Test, Batch, Result, TestSession]
 *       - in: query
 *         name: action
 *         schema:
 *           type: string
 *       - in: query
 *         name: severity
 *         schema:
 *           type: string
 *           enum: [LOW, MEDIUM, HIGH, CRITICAL]
 *     responses:
 *       200:
 *         description: Audit logs exported successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *           text/csv:
 *             schema:
 *               type: string
 *       400:
 *         description: Bad request - Start and end dates required
 *       403:
 *         description: Forbidden - Admin access required
 */
router.get('/export', requireRole(['admin', 'super_admin']), exportAuditLogs);

/**
 * @swagger
 * /api/v1/audit/archive:
 *   post:
 *     summary: Archive old audit logs (Super Admin only)
 *     tags: [Audit]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               olderThanDays:
 *                 type: integer
 *                 default: 2555
 *                 description: Archive logs older than this many days (~7 years default)
 *     responses:
 *       200:
 *         description: Audit logs archived successfully
 *       403:
 *         description: Forbidden - Super Admin access required
 */
router.post('/archive', requireRole(['super_admin']), archiveOldAuditLogs);

/**
 * @swagger
 * /api/v1/audit/delete-archived:
 *   delete:
 *     summary: Delete archived audit logs (Super Admin only)
 *     tags: [Audit]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               olderThanDays:
 *                 type: integer
 *                 default: 2920
 *                 description: Delete archived logs older than this many days (~8 years default)
 *     responses:
 *       200:
 *         description: Archived audit logs deleted successfully
 *       403:
 *         description: Forbidden - Super Admin access required
 */
router.delete('/delete-archived', requireRole(['super_admin']), deleteArchivedAuditLogs);

export default router;
