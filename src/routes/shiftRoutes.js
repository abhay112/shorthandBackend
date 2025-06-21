import express from 'express';
import { createShift } from '../controllers/shiftController.js';
const router = express.Router();

router.post('/create', createShift);

export default router;
