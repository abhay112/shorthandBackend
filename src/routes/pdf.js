const express = require('express');
const router = express.Router();
const pdfController = require('../controllers/pdfController');

router.post('/', pdfController.generatePdf);

module.exports = router;
