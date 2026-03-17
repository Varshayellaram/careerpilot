const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
  extractStructured,
  tailorResume,
  generatePDF,
  generatePlainText,
  getMyResumes,
  downloadResumePDF
} = require('../controllers/resumeTailorController');

router.post('/extract-structured', protect, extractStructured);
router.post('/resume', protect, tailorResume);
router.post('/pdf', protect, generatePDF);
router.post('/text', protect, generatePlainText);
router.get('/my-resumes', protect, getMyResumes);           // NEW
router.get('/download/:id', protect, downloadResumePDF);    // NEW

module.exports = router;