import express from 'express';
import { submitResult, getResultsByShift } from '../controllers/resultController.js';
const router = express.Router();

router.post('/submit', submitResult);
router.get('/shift/:shiftId', getResultsByShift);

export default router;
