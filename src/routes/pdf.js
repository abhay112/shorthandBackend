
import express from 'express';
import pdfController from '../controllers/pdfController.js';
import { authenticateFirebase } from '../middlewares/firebaseAuth.js';
import { requireAdmin } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.use(authenticateFirebase);
router.use(requireAdmin);

router.post('/', pdfController.generatePdf);

export default router;
