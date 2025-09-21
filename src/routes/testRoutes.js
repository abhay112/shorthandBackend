import express from 'express';
import multer from 'multer';
import {
  createTest,
  getAllTests,
  getTestById,
  updateTest,
  deleteTest,
  assignTestToBatches,
  removeTestFromBatches
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
router.post('/', upload.single('audioFile'), createTest);
router.put('/:id', updateTest);
router.delete('/:id', deleteTest);

// Batch assignment operations
router.post('/:id/assign-batches', assignTestToBatches);
router.delete('/:id/remove-batches', removeTestFromBatches);

export default router;
