import express from 'express';
import multer from 'multer';
import {
  deleteTest,
  getAllTests,
  uploadTest
} from '../controllers/testController.js';

const upload = multer({ dest: 'uploads/audios/' });
const router = express.Router();

router.get('/', getAllTests);
router.post('/uploadTest', upload.single('audio'), uploadTest);
router.delete('/:id', deleteTest);
export default router;
