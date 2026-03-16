const axios = require('axios');
const pool = require('../config/db');

// ── Standalone ATS Score ──────────────────────────────────────────────────────
// User uploads resume + pastes JD to check score
// No tailoring needed — just instant score
const scoreResume = async (req, res) => {
  const { resume_id, jd_text } = req.body;

  try {
    // Get resume data from MySQL
    const [resumes] = await pool.query(
      `SELECT r.extracted_text, rs.personal_info, rs.section_order
       FROM resumes r
       LEFT JOIN resume_structured rs ON r.id = rs.resume_id
       WHERE r.id = ? AND r.user_id = ?
       LIMIT 1`,
      [resume_id, req.user.userId]
    );

    if (resumes.length === 0) {
      return res.status(404).json({ message: 'Resume not found' });
    }

    const resume = resumes[0];

    // First analyze JD to get structured data for scoring
    const jdResponse = await axios.post(
      `${process.env.PYTHON_SERVICE_URL}/analyze-jd`,
      { jd_text }
    );

    const jdAnalysis = jdResponse.data;

    // Get raw text — handle both JSON stored and plain text
    let resumeText = resume.extracted_text;
    try {
      const parsed = JSON.parse(resumeText);
      if (typeof parsed === 'object') {
        resumeText = Object.entries(parsed)
          .map(([section, content]) => {
            if (Array.isArray(content)) {
              return `${section}\n${content.join('\n')}`;
            }
            return `${section}\n${content}`;
          })
          .join('\n\n');
      }
    } catch (e) {
      // Already plain text
    }

    // Get personal info and sections
    const personalInfo = resume.personal_info
      ? JSON.parse(resume.personal_info)
      : {};
    const sectionsDetected = resume.section_order
      ? JSON.parse(resume.section_order)
      : [];

    console.log('Original text length:', originalText.length);
    console.log('Tailored text length:', tailoredText.length);
    console.log('Original sample:', originalText.substring(0, 200));
    console.log('Tailored sample:', tailoredText.substring(0, 200));
    // Send to Python ATS scorer
    const scoreResponse = await axios.post(
      `${process.env.PYTHON_SERVICE_URL}/score-resume`,
      {
        resume_text: resumeText,
        jd_analysis: jdAnalysis,
        personal_info: personalInfo,
        sections_detected: sectionsDetected
      },
      { timeout: 45000 }
    );

    const scoreData = scoreResponse.data;

    // Save score to MySQL for history
    await pool.query(
      `INSERT INTO ats_scores
       (user_id, resume_id, score_type, total_score, score_data)
       VALUES (?, ?, 'standalone', ?, ?)`,
      [
        req.user.userId,
        resume_id,
        scoreData.total_score,
        JSON.stringify(scoreData)
      ]
    );

    res.json({
      message: 'ATS score calculated successfully',
      score: scoreData
    });

  } catch (error) {
    console.error('ATS score error:', error.message);
    console.error('Details:', error.response?.data);
    res.status(500).json({ message: 'Failed to calculate ATS score' });
  }
};


// ── Before/After ATS Comparison ───────────────────────────────────────────────
// Called automatically after tailoring completes
// Scores both original and tailored resume
const scoreBeforeAfter = async (req, res) => {
  const { tailored_id } = req.body;

  try {
    // Get tailored resume data
    const [tailored] = await pool.query(
      `SELECT tr.*, rs.section_order, rs.personal_info as pi
       FROM tailored_resumes tr
       JOIN resume_structured rs ON tr.structured_id = rs.id
       WHERE tr.id = ? AND tr.user_id = ?
       LIMIT 1`,
      [tailored_id, req.user.userId]
    );

    if (tailored.length === 0) {
      return res.status(404).json({ message: 'Tailored resume not found' });
    }

    const tailoredData = tailored[0];

    // Get original resume text
    const [original] = await pool.query(
      `SELECT extracted_text FROM resumes WHERE id = ? LIMIT 1`,
      [tailoredData.resume_id]
    );

    // Convert original extracted_text to plain text
   // Convert original resume text to plain text
    let originalText = original[0].extracted_text;
    try {
      const parsed = JSON.parse(originalText);
      if (typeof parsed === 'object') {
        originalText = Object.entries(parsed)
          .map(([section, content]) => {
            if (Array.isArray(content)) {
              return `${section}\n${content.join('\n')}`;
            } else if (typeof content === 'string') {
              return `${section}\n${content}`;
            }
            return '';
          })
          .filter(Boolean)
          .join('\n\n');
      }
    } catch (e) {
      // Already plain text — use as is
    }

    // Convert tailored sections to plain text for scoring
    const tailoredSections = JSON.parse(tailoredData.tailored_sections);
    // Convert tailored sections to clean plain text for scoring
    const tailoredText = Object.entries(tailoredSections)
      .map(([section, content]) => {
        if (Array.isArray(content)) {
          // List section — join bullets
          const cleanItems = content
            .map(item => {
              if (typeof item === 'string') {
                return item.replace(/^[-•]\s*/, '').trim();
              }
              return '';
            })
            .filter(Boolean)
            .join('\n');
          return `${section}\n${cleanItems}`;
        } else if (typeof content === 'string') {
          // Check if string contains \n separated items
          if (content.includes('\n')) {
            const cleanLines = content
              .split('\n')
              .map(line => line.replace(/^[-•]\s*/, '').trim())
              .filter(Boolean)
              .join('\n');
            return `${section}\n${cleanLines}`;
          }
          return `${section}\n${content}`;
        }
        return '';
      })
      .filter(Boolean)
      .join('\n\n');

    // Send both to Python for comparison scoring
    const scoreResponse = await axios.post(
      `${process.env.PYTHON_SERVICE_URL}/score-before-after`,
      {
        original_resume_text: originalText,
        tailored_resume_text: tailoredText,
        jd_analysis: JSON.parse(tailoredData.jd_analysis),
        personal_info: JSON.parse(tailoredData.pi || '{}'),
        sections_detected: JSON.parse(tailoredData.section_order)
      },
      { timeout: 90000 } // 90 seconds — two scorings
    );

    const comparison = scoreResponse.data;

    // Update tailored_resumes with ATS score
    await pool.query(
      `UPDATE tailored_resumes SET ats_score = ? WHERE id = ?`,
      [comparison.tailored.total_score, tailored_id]
    );

    // Save both scores to ats_scores table
    await pool.query(
      `INSERT INTO ats_scores
       (user_id, resume_id, score_type, total_score, score_data)
       VALUES (?, ?, 'before_after', ?, ?)`,
      [
        req.user.userId,
        tailoredData.resume_id,
        comparison.tailored.total_score,
        JSON.stringify(comparison)
      ]
    );

    res.json({
      message: 'ATS comparison complete',
      comparison
    });

  } catch (error) {
    console.error('ATS comparison error:', error.message);
    console.error('Details:', error.response?.data);
    res.status(500).json({ message: 'Failed to compare ATS scores' });
  }
};

module.exports = { scoreResume, scoreBeforeAfter };