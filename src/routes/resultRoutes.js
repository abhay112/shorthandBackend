import express from 'express';
import { submitResult, getResultsByShift } from '../controllers/resultController.js';
import { authenticateFirebase } from '../middlewares/firebaseAuth.js';
import { requireAdmin, requireStudent } from '../middlewares/authMiddleware.js';

const router = express.Router();
const adminRouter = express.Router();
const userRouter = express.Router();

// Admin result management routes
adminRouter.use(authenticateFirebase);
adminRouter.use(requireAdmin);
adminRouter.get('/shift/:shiftId', getResultsByShift);

// User result submission routes
userRouter.use(authenticateFirebase);
userRouter.use(requireStudent);
userRouter.post('/submit', submitResult);

router.use('/admin/results', adminRouter);
router.use('/user/results', userRouter);

export default router;
