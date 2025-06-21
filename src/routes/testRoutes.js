import express from 'express';
import multer from 'multer';
import {
  uploadAudio,
  uploadText
} from '../controllers/testController.js';

const upload = multer({ dest: 'uploads/audios/' });
const router = express.Router();

router.post('/audio', upload.single('audio'), uploadAudio);
router.post('/text', uploadText);

export default router;
