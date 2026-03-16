const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
  extractStructured,
  tailorResume,
  generatePDF,
  generatePlainText
} = require('../controllers/resumeTailorController');

// Step 1 — Extract structured data (run once per resume)
// POST /api/tailor/extract-structured
router.post('/extract-structured', protect, extractStructured);

// Step 2 — Tailor resume using all agent outputs
// POST /api/tailor/resume
router.post('/resume', protect, tailorResume);

// Step 3A — Download as PDF (same layout as original)
// POST /api/tailor/pdf
router.post('/pdf', protect, generatePDF);

// Step 3B — Get as formatted plain text
// POST /api/tailor/text
router.post('/text', protect, generatePlainText);

module.exports = router;