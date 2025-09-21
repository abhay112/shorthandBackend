import express from 'express';
import authRoutes from './authRoutes.js';
import adminRoutes from './adminRoutes.js';
import studentRoutes from './studentRoutes.js';
import studentBatchRoutes from './studentBatchRoutes.js';
import adminStudentRoutes from './adminStudentRoutes.js';
import testRoutes from './testRoutes.js';
import batchRoutes from './batchRoutes.js';
import resultRoutes from './resultRoutes.js';
import pdfRouter from './pdf.js'; 


const router = express.Router();

// Authentication routes (no auth required)
router.use('/auth', authRoutes);

// Protected routes
router.use('/admin', adminRoutes);
router.use('/admin/students', adminStudentRoutes);
router.use('/student', studentRoutes);
router.use('/student', studentBatchRoutes);
router.use('/test', testRoutes);
router.use('/batches', batchRoutes);
router.use('/result', resultRoutes);
router.use('/pdf', pdfRouter);

export default router;
