import express from 'express';
import {
  loginStudent,
  getStudentProfile,
  getCurrentTestForShift,
  submitTestResult
} from '../controllers/studentController.js';

const router = express.Router();

router.post('/login', loginStudent);
router.get('/profile/:id', getStudentProfile);
router.get('/test/:id', getCurrentTestForShift);
router.post('/submit', submitTestResult);

export default router;
