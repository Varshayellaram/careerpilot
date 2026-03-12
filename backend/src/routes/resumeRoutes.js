const express = require('express');
const router = express.Router();
const multer = require('multer');
const axios = require('axios');
const FormData = require('form-data');
const pool = require('../config/db');
const { protect } = require('../middleware/authMiddleware');

const upload = multer({ storage: multer.memoryStorage() });

router.post('/upload', protect, upload.single('resume'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
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

    // Save to MySQL
    await pool.query(
      'INSERT INTO resumes (user_id, original_filename, extracted_text) VALUES (?, ?, ?)',
      [req.user.userId, req.file.originalname, extractedText]
    );

    res.json({
      message: 'Resume uploaded and parsed successfully',
      extracted_text: extractedText
    });

  } catch (error) {
    console.error('Full error:', error.message);
    console.error('Error details:', error.response?.data || error.code);
    res.status(500).json({ message: 'Failed to process resume' });
  }
});

module.exports = router;