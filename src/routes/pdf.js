
import express from 'express';
import pdfController from '../controllers/pdfController.js';

const router = express.Router();

router.post('/', pdfController.generatePdf);

export default router;
