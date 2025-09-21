import express from 'express';
import {
  getMyBatches,
  getMyTests,
  getBatchTests,
} from '../controllers/studentBatchController.js';
import { authenticateFirebase } from '../middlewares/firebaseAuth.js';
import { requireStudent } from '../middlewares/authMiddleware.js';

const router = express.Router();

// All student batch routes require authentication and student role
router.use(authenticateFirebase);
router.use(requireStudent);

// Student batch operations
router.get('/my-batches', getMyBatches);
router.get('/my-tests', getMyTests);
router.get('/batch/:batchId/tests', getBatchTests);

export default router;
