const express = require('express');
const router = express.Router();
const axios = require('axios');
const pool = require('../config/db');
const { protect } = require('../middleware/authMiddleware');

router.post('/analyze', protect, async (req, res) => {
  const { jd_text, application_id } = req.body;

  if (!jd_text) {
    return res.status(400).json({ message: 'JD text is required' });
  }

  try {
    // Send to Python agent
    const pythonResponse = await axios.post(
      `${process.env.PYTHON_SERVICE_URL}/analyze-jd`,
      { jd_text }
    );

    const analysis = pythonResponse.data;

    // Save to MySQL if application_id provided
    if (application_id) {
      await pool.query(
        'UPDATE applications SET jd_text = ? WHERE id = ? AND user_id = ?',
        [jd_text, application_id, req.user.userId]
      );
    }

    res.json({
      message: 'JD analyzed successfully',
      analysis
    });

  } catch (error) {
    console.error('JD analysis error:', error.message);
    res.status(500).json({ message: 'Failed to analyze JD' });
  }
});


//after analysing the JD we need to compare it with the uploaded resume so below function will do that
router.post('/skill-gap', protect, async (req, res) => {
  const { jd_text, resume_id } = req.body;

  try {
    // Get resume skills from MySQL
    const [resumes] = await pool.query(
      'SELECT extracted_text FROM resumes WHERE id = ? AND user_id = ?',
      [resume_id, req.user.userId]
    );

    if (resumes.length === 0) {
      return res.status(404).json({ message: 'Resume not found' });
    }

    // Analyze JD
    const pythonResponse = await axios.post(
      `${process.env.PYTHON_SERVICE_URL}/analyze-jd`,
      { jd_text }
    );

    const jdAnalysis = pythonResponse.data;
    const jdSkills = jdAnalysis.hard_skills.map(s => s.toLowerCase());

    // Extract resume skills via Python
    const resumeResponse = await axios.post(
      `${process.env.PYTHON_SERVICE_URL}/extract-skills`,
      { resume_text: resumes[0].extracted_text }
    );

    const resumeSkills = resumeResponse.data.skills.map(s => s.toLowerCase());

    // Calculate gap
    const gapSkills = jdSkills.filter(s => !resumeSkills.includes(s));
    const matchingSkills = jdSkills.filter(s => resumeSkills.includes(s));

    // Calculate match percentage
    const matchPercentage = Math.round(
      (matchingSkills.length / jdSkills.length) * 100
    );

    res.json({
      jd_analysis: jdAnalysis,
      matching_skills: matchingSkills,
      gap_skills: gapSkills,
      match_percentage_before: matchPercentage
    });

  } catch (error) {
    console.error('Skill gap error:', error.message);
    res.status(500).json({ message: 'Failed to calculate skill gap' });
  }
});

module.exports = router;