import express from 'express';
import {
  assignBatchToStudent,
  removeBatchFromStudent,
  getDashboardStats,
  updateStudent
} from '../controllers/adminController.js';
import { getAllResults, getResultById } from '../controllers/resultController.js';
import { getAllRankings } from '../controllers/rankingController.js';
import { authenticateFirebase, requireAdmin } from '../middlewares/firebaseAuth.js';

const router = express.Router();

// Apply authentication and admin authorization to all routes
router.use(authenticateFirebase);
router.use(requireAdmin);

// Student management routes
router.put('/students/:id', updateStudent);
router.post('/students/:id/batches', (req, res, next) => {
  req.body.studentId = req.params.id;
  return assignBatchToStudent(req, res, next);
});
router.delete('/students/:id/batches', (req, res, next) => {
  req.body.studentId = req.params.id;
  return removeBatchFromStudent(req, res, next);
});

// Dashboard route
router.get('/dashboard', getDashboardStats);

router.get('/results/:id', getResultById);
router.get('/results', getAllResults);
router.get('/rankings', getAllRankings);

export default router;
