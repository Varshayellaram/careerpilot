const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { scoreResume, scoreBeforeAfter } = require('../controllers/atsScorerController');

// Standalone ATS score check
// POST /api/ats/score
router.post('/score', protect, scoreResume);

// Before/after comparison after tailoring
// POST /api/ats/compare
router.post('/compare', protect, scoreBeforeAfter);

module.exports = router;