const axios = require('axios');
const pool = require('../config/db');

// ── Get company intelligence ──────────────────────────────────────────────────
// Main function — calls Python agent which searches web and analyzes results
// Result is saved to MySQL so we don't waste API calls searching same company twice
const getCompanyIntel = async (req, res) => {
  const { company_name, role, application_id } = req.body;

  if (!company_name || !role) {
    return res.status(400).json({
      message: 'Company name and role are required'
    });
  }

  try {
    // Check if we already have intel for this company
    // Avoids wasting Tavily API calls for same company
    const [existing] = await pool.query(
      `SELECT intel_data FROM company_intel 
       WHERE company_name = ? AND user_id = ?`,
      [company_name.toLowerCase(), req.user.userId]
    );

    if (existing.length > 0) {
      // Return cached intel instead of searching again
      console.log(`Using cached intel for ${company_name}`);
      return res.json({
        message: 'Company intelligence retrieved (cached)',
        intel: JSON.parse(existing[0].intel_data),
        cached: true
      });
    }

    // No cache found — call Python agent to search web
    console.log(`Fetching fresh intel for ${company_name}`);
    const pythonResponse = await axios.post(
      `${process.env.PYTHON_SERVICE_URL}/company-intel`,
      { company_name, role },
      { timeout: 30000 } // 30 second timeout for web searches
    );

    const intel = pythonResponse.data;

    // Save to MySQL for future use (caching)
    await pool.query(
      `INSERT INTO company_intel 
       (user_id, company_name, role, intel_data) 
       VALUES (?, ?, ?, ?)`,
      [
        req.user.userId,
        company_name.toLowerCase(),
        role,
        JSON.stringify(intel)
      ]
    );

    res.json({
      message: 'Company intelligence fetched successfully',
      intel,
      cached: false
    });

  } catch (error) {
    console.error('Company intel error:', error.message);
    res.status(500).json({ message: 'Failed to fetch company intelligence' });
  }
};

module.exports = { getCompanyIntel };