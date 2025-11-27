import express from 'express';
import multer from 'multer';
import {
  createTest,
  getAllTests,
  getTestById,
  updateTest,
  deleteTest,
  assignTestToBatches,
  removeTestFromBatches,
  blockTest,
  unblockTest,
  assignTestToDates,
  removeTestFromDates,
  getBatchTestStatistics,
  closeTestForBatch,
  openTestForBatch,
  generateRankingsForBatchTest,
  toggleTestPublication
} from '../controllers/testController.js';
import { authenticateFirebase } from '../middlewares/firebaseAuth.js';
import { requireAdmin } from '../middlewares/authMiddleware.js';

const upload = multer({ dest: 'uploads/audios/' });
const router = express.Router();

// All test routes require authentication and admin role
router.use(authenticateFirebase);
router.use(requireAdmin);

// Basic CRUD operations
router.get('/', getAllTests);
router.get('/:id', getTestById);
// Handle both multipart/form-data (for file uploads) and application/json
router.post('/', upload.single('audioFile'), createTest);
router.put('/:id', upload.single('audioFile'), updateTest);
router.delete('/:id', deleteTest);

// Batch assignment operations
router.post('/:id/assign-batches', assignTestToBatches);
router.delete('/:id/remove-batches', removeTestFromBatches);

// Date assignment operations
router.post('/:id/assign-dates', assignTestToDates);
router.delete('/:id/remove-dates', removeTestFromDates);

// Block/Unblock operations
router.post('/:id/block', blockTest);
router.post('/:id/unblock', unblockTest);

// Publish/Unpublish operation (single endpoint)
router.post('/:id/toggle-publication', toggleTestPublication);

// Batch-test management operations
router.get('/:testId/batch/:batchId/statistics', getBatchTestStatistics);
router.post('/:testId/batch/:batchId/close', closeTestForBatch);
router.post('/:testId/batch/:batchId/open', openTestForBatch);
router.post('/:testId/batch/:batchId/generate-ranks', generateRankingsForBatchTest);

export default router;
