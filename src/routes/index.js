import express from 'express';
import adminRoutes from './adminRoutes.js';
import studentRoutes from './studentRoutes.js';
import testRoutes from './testRoutes.js';
import shiftRoutes from './shiftRoutes.js';
import resultRoutes from './resultRoutes.js';

const router = express.Router();

router.use('/admin', adminRoutes);
router.use('/student', studentRoutes);
router.use('/test', testRoutes);
router.use('/shift', shiftRoutes);
router.use('/result', resultRoutes);

export default router;
