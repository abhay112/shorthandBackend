import express from 'express';
import {
  getAllStudents,
  approveStudent,
  assignShiftToStudent,
  blockStudent
} from '../controllers/adminController.js';

const router = express.Router();

router.get('/students', getAllStudents);            
router.post('/approve', approveStudent);            
router.post('/assign-shift', assignShiftToStudent);  
router.post('/block', blockStudent);                 

export default router;
