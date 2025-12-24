
import express from 'express';
import pdfController from '../controllers/pdfController.js';
// import { authenticateFirebase } from '../middlewares/firebaseAuth.js';
// import { requireAdmin } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Middleware to disable compression for PDF responses
router.use((req, res, next) => {
  // Disable compression for PDF generation
  res.setHeader('Content-Encoding', 'identity');
  res.setHeader('Vary', 'Accept-Encoding');
  next();
});

// router.use(authenticateFirebase);
// router.use(requireAdmin);

router.post('/', pdfController.generatePdf);

export default router;
