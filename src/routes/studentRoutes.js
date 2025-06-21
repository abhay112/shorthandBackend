import express from 'express';
import { loginStudent } from '../controllers/studentController.js';
const router = express.Router();

router.post('/login', loginStudent);

export default router;
