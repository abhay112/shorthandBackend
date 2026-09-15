import express from 'express';
import { authenticateFirebase, requireApproval } from '../middlewares/firebaseAuth.js';
import authRoutes from './authRoutes.js';
import adminRoutes from './adminRoutes.js';
import adminStudentRoutes from './adminStudentRoutes.js';
import testRoutes from './testRoutes.js';
import batchRoutes from './batchRoutes.js';
import resultRoutes from './resultRoutes.js';
import pdfRouter from './pdf.js';
import auditRoutes from './auditRoutes.js';
import shiftRoutes from './shiftRoutes.js';
import userRoutes from './userRoutes.js';
import userBatchRoutes from './userBatchRoutes.js';

const router = express.Router();

router.use('/pdf', pdfRouter);


// Authentication routes (no auth required)
router.use('/auth', authRoutes);

// User-facing routes (requires authenticated client)
router.use('/user', userRoutes);
router.use('/user', userBatchRoutes);

// Admin routes
router.use('/admin/pdf', authenticateFirebase, requireApproval, pdfRouter);
router.use('/admin', adminRoutes);
router.use('/admin/students', adminStudentRoutes);
router.use('/admin/tests', testRoutes);
router.use('/admin/batches', batchRoutes);
router.use('/admin/audit', auditRoutes);
router.use('/admin/shifts', shiftRoutes);

// Shared routes that define their own prefix (e.g., /admin/results, /user/results)
router.use(resultRoutes);

export default router;
