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
import { authenticateFirebase } from '../middlewares/firebaseAuth.js';
import { requireAuth, requireRole } from '../middlewares/authMiddleware.js';

const router = express.Router();

// All audit routes require authentication
router.use(authenticateFirebase);
router.use(requireAuth);

router.get('/my-activity', getMyAuditActivity);

router.get('/entity/:entityType/:entityId', requireRole(['admin', 'super_admin']), getEntityAuditHistory);

router.get('/user/:userId', getUserAuditActivity);

router.get('/system', requireRole(['admin', 'super_admin']), getSystemAuditActivity);

router.get('/critical', requireRole(['admin', 'super_admin']), getCriticalAuditActions);

router.get('/statistics', requireRole(['admin', 'super_admin']), getAuditStatistics);

router.get('/export', requireRole(['admin', 'super_admin']), exportAuditLogs);

router.post('/archive', requireRole(['super_admin']), archiveOldAuditLogs);

router.delete('/delete-archived', requireRole(['super_admin']), deleteArchivedAuditLogs);

export default router;
