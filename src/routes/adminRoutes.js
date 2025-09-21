import express from 'express';
import {
  getAllStudents,
  approveStudent,
  assignBatchToStudent,
  removeBatchFromStudent,
  blockStudent,
  getDashboardStats,
  getStudentById,
  updateStudent
} from '../controllers/adminController.js';
import { authenticateFirebase, requireAdmin } from '../middlewares/firebaseAuth.js';

const router = express.Router();

// Apply authentication and admin authorization to all routes
router.use(authenticateFirebase);
router.use(requireAdmin);

// Student management routes
router.get('/students', getAllStudents);    
router.get('/students/:id', getStudentById);    
router.put('/students/:id', /* protectAdmin, */ updateStudent);    
router.post('/students/approve', approveStudent);            
router.post('/assign-batch', assignBatchToStudent);
router.delete('/remove-batch', removeBatchFromStudent);  
router.post('/block', blockStudent);         

// Dashboard route
router.get('/dashboard', getDashboardStats);

export default router;
