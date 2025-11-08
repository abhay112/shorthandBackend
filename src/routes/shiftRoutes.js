import express from 'express';
import { createShift } from '../controllers/shiftController.js';
import { authenticateFirebase } from '../middlewares/firebaseAuth.js';
import { requireAdmin } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.use(authenticateFirebase);
router.use(requireAdmin);

router.post('/create', createShift);

export default router;
