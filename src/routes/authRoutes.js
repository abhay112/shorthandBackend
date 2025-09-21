import express from 'express';
import { register, login, logout, me, verifyToken, verifyEmail } from '../controllers/authController.js';
import { authenticateFirebase } from '../middlewares/firebaseAuth.js';

const router = express.Router();

router.post('/verify-email', verifyEmail);
router.post('/register', register);
router.post('/login', login);
router.post('/logout', logout);
router.get('/me', authenticateFirebase, me);
router.get('/verify', authenticateFirebase, verifyToken);

export default router;
