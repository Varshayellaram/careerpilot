const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { getCompanyIntel } = require('../controllers/companyIntelController');

// Research a company before applying
// POST /api/company/intel
router.post('/intel', protect, getCompanyIntel);

module.exports = router;