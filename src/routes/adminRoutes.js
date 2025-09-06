import express from 'express';
import {
  getAllStudents,
  approveStudent,
  assignShiftToStudent,
  blockStudent,
  getDashboardStats,
  getStudentById
} from '../controllers/adminController.js';

const router = express.Router();

router.get('/students', getAllStudents);    
router.get('/students/:id', getStudentById);        
router.post('/students/approve', approveStudent);            
router.post('/assign-shift', assignShiftToStudent);  
router.post('/block', blockStudent);         

router.get('/dashboard', getDashboardStats);


export default router;
