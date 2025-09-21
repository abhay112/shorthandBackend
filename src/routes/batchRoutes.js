import express from 'express';
import {
  createBatch,
  getAllBatches,
  getBatchById,
  updateBatch,
  deleteBatch,
  assignStudentsToBatch,
  removeStudentsFromBatch,
  assignTestsToBatch,
  removeTestsFromBatch,
  getMyBatches,
} from '../controllers/batchController.js';
import { authenticateFirebase } from '../middlewares/firebaseAuth.js';
import { requireAdmin } from '../middlewares/authMiddleware.js';

const router = express.Router();

// All batch routes require authentication and admin role
router.use(authenticateFirebase);
router.use(requireAdmin);

// Basic CRUD operations
router.post('/', createBatch);
router.get('/', getAllBatches);
router.get('/my-batches', getMyBatches);
router.get('/:id', getBatchById);
router.put('/:id', updateBatch);
router.delete('/:id', deleteBatch);

// Student assignment operations
router.post('/:id/students', assignStudentsToBatch);
router.delete('/:id/students', removeStudentsFromBatch);

// Test assignment operations
router.post('/:id/tests', assignTestsToBatch);
router.delete('/:id/tests', removeTestsFromBatch);

export default router;
