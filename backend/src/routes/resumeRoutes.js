const express = require('express');
const router = express.Router();
const multer = require('multer');
const axios = require('axios');
const FormData = require('form-data');
const pool = require('../config/db');
const { protect } = require('../middleware/authMiddleware');

const upload = multer({ storage: multer.memoryStorage() });

// ── Upload resume ─────────────────────────────────────────────────────────────
router.post('/upload', protect, upload.single('resume'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    if (req.file.mimetype !== 'application/pdf') {
      return res.status(400).json({ message: 'Only PDF files accepted' });
    }

    console.log('File received:', req.file.originalname, req.file.size, 'bytes');

    // Send PDF to Python service
    const formData = new FormData();
    formData.append('file', req.file.buffer, {
      filename: req.file.originalname,
      contentType: req.file.mimetype,
      knownLength: req.file.buffer.length
    });

    const pythonResponse = await axios.post(
      `${process.env.PYTHON_SERVICE_URL}/parse-resume`,
      formData,
      {
        headers: {
          ...formData.getHeaders(),
          'Content-Length': formData.getLengthSync()
        },
        maxContentLength: Infinity,
        maxBodyLength: Infinity
      }
    );

    const extractedText = pythonResponse.data.extracted_text;

    // Save to MySQL — capture result to get insertId
    const [result] = await pool.query(
      'INSERT INTO resumes (user_id, original_filename, extracted_text) VALUES (?, ?, ?)',
      [req.user.userId, req.file.originalname, extractedText]
    );

    res.json({
      message: 'Resume uploaded and parsed successfully',
      resume_id: result.insertId,   // ← correct — from MySQL result
      extracted_text: extractedText
    });

  } catch (error) {
    console.error('Full error:', error.message);
    console.error('Error details:', error.response?.data || error.code);
    res.status(500).json({ message: 'Failed to process resume' });
  }
});

// ── Get all resumes for current user ──────────────────────────────────────────
router.get('/all', protect, async (req, res) => {
  try {
    const [resumes] = await pool.query(
      `SELECT id, original_filename, uploaded_at 
       FROM resumes 
       WHERE user_id = ? 
       ORDER BY uploaded_at DESC`,
      [req.user.userId]
    );
    res.json({ resumes });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch resumes' });
  }
});

// ── Get single resume by ID ───────────────────────────────────────────────────
router.get('/:id', protect, async (req, res) => {
  try {
    const [resumes] = await pool.query(
      'SELECT * FROM resumes WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.userId]
    );
    if (resumes.length === 0) {
      return res.status(404).json({ message: 'Resume not found' });
    }
    res.json({
      resume_id: resumes[0].id,
      filename: resumes[0].original_filename,
      extracted_text: resumes[0].extracted_text,
      uploaded_at: resumes[0].uploaded_at
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to get resume' });
  }
});

module.exports = router;