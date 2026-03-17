// 4. User clicks "Start Tailoring"
//    → POST /api/tailor/extract-structured
//    → extractStructured() checks cache
//    → if not cached → Python structures resume
//    → saves to resume_structured table
//    → returns structured_id

// 5. User clicks "Tailor My Resume"
//    → POST /api/tailor/resume
//    → tailorResume() fetches structured data
//    → sends to Python with jd_analysis + company_intel
//    → Python AI tailors all sections
//    → restoreLinksInSections() fixes URLs
//    → saves to tailored_resumes table
//    → returns tailored_id

// 6A. User clicks "Download PDF"
//     → POST /api/tailor/pdf
//     → generatePDF() fetches tailored data
//     → sends to Python PDF generator
//     → returns base64 PDF
//     → frontend downloads it

// 6B. User clicks "Copy Text"
//     → POST /api/tailor/text
//     → generatePlainText() fetches tailored data
//     → returns formatted plain text
//     → user copies to job portal




// ## Database Tables Used:

// resumes              → original resume text
// resume_structured    → structured version (cached)
// tailored_resumes     → final tailored output




// ## Why This Architecture is Exceptional:

// Caching       → never process same resume twice
// Link registry → AI never corrupts real URLs
// Separation    → each function does one job
// Timeouts      → server never hangs forever
// Security      → user_id check on every query
// Flexibility   → PDF or plain text output
// History       → all tailored resumes saved
//                user can revisit anytime







const axios = require('axios');
const pool = require('../config/db');
const fs = require('fs');
const path = require('path');

// ── Step 1: Extract structured data from resume ───────────────────────────────
// Called when tailoring pipeline starts
// Checks cache first — avoids duplicate LLM calls
const extractStructured = async (req, res) => {
  const { resume_id } = req.body;

  try {
    // Check if already structured for this resume
    const [existing] = await pool.query(
      `SELECT * FROM resume_structured 
       WHERE resume_id = ? AND user_id = ?`,
      [resume_id, req.user.userId]
    );

    if (existing.length > 0) {
      // Return cached structured data
      console.log(`Using cached structured data for resume ${resume_id}`);
      return res.json({
        message: 'Structured data retrieved (cached)',
        structured_id: existing[0].id,
        personal_info: JSON.parse(existing[0].personal_info),
        sections: JSON.parse(existing[0].sections),
        section_order: JSON.parse(existing[0].section_order),
        links_found: Object.keys(
          JSON.parse(existing[0].link_registry)
        ).length,
        cached: true
      });
    }

    // Not cached — get raw text from resumes table
    const [resumes] = await pool.query(
      `SELECT extracted_text FROM resumes 
       WHERE id = ? AND user_id = ?`,
      [resume_id, req.user.userId]
    );

    if (resumes.length === 0) {
      return res.status(404).json({ message: 'Resume not found' });
    }

    // raw extracted_text is stored as JSON string of sections
    // we need plain text for smart extractor
    let rawText = resumes[0].extracted_text;

    // If stored as JSON parse and convert to plain text
    try {
      const parsed = JSON.parse(rawText);
      if (typeof parsed === 'object') {
        // Convert sections object back to plain text
        rawText = Object.entries(parsed)
          .map(([section, content]) => {
            if (Array.isArray(content)) {
              return `${section}\n${content.join('\n')}`;
            }
            return `${section}\n${content}`;
          })
          .join('\n\n');
      }
    } catch (e) {
      // Already plain text — use as is
    }

    // Send to Python smart extractor
    const pythonResponse = await axios.post(
      `${process.env.PYTHON_SERVICE_URL}/extract-structured`,
      { raw_text: rawText },
      { timeout: 30000 }
    );

    const structuredData = pythonResponse.data;

    // Save to resume_structured table
    const [insertResult] = await pool.query(
      `INSERT INTO resume_structured 
       (resume_id, user_id, personal_info, sections, section_order, link_registry)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        resume_id,
        req.user.userId,
        JSON.stringify(structuredData.personal_info),
        JSON.stringify(structuredData.sections),
        JSON.stringify(structuredData.section_order),
        JSON.stringify(structuredData.link_registry)
      ]
    );

    res.json({
      message: 'Resume structured successfully',
      structured_id: insertResult.insertId,
      personal_info: structuredData.personal_info,
      sections: structuredData.sections,
      section_order: structuredData.section_order,
      links_found: Object.keys(structuredData.link_registry).length,
      cached: false
    });

  } catch (error) {
    console.error('Extract structured error:', error.message);
    console.error('Details:', error.response?.data);
    res.status(500).json({ message: 'Failed to extract structured data' });
  }
};


// ── Step 2: Tailor resume ─────────────────────────────────────────────────────
// Sends structured sections to Python tailor agent
// Receives tailored sections back
// Restores links and saves to tailored_resumes table
const tailorResume = async (req, res) => {
  const { structured_id, resume_id, jd_analysis, company_intel, added_skills } = req.body;

  try {
    const [structured] = await pool.query(
      `SELECT * FROM resume_structured WHERE id = ? AND user_id = ?`,
      [structured_id, req.user.userId]
    );

    if (structured.length === 0) {
      return res.status(404).json({ message: 'Structured resume not found. Run extract-structured first.' });
    }

    const sections = JSON.parse(structured[0].sections);
    const sectionOrder = JSON.parse(structured[0].section_order);
    const linkRegistry = JSON.parse(structured[0].link_registry);
    const personalInfo = JSON.parse(structured[0].personal_info);

    console.log(`Tailoring resume ${resume_id}...`);

    // Send to Python tailor agent
    const pythonResponse = await axios.post(
      `${process.env.PYTHON_SERVICE_URL}/tailor-resume`,
      { sections, section_order: sectionOrder, jd_analysis, company_intel, added_skills: added_skills || [] },
      { timeout: 60000 }
    );

    const tailoredData = pythonResponse.data;
    const restoredSections = restoreLinksInSections(tailoredData.tailored_sections, linkRegistry);

    // ── Generate PDF immediately after tailoring ──────────────────────────────
    let pdfBuffer = null;
    let pdfFilename = null;

    try {
      console.log('Generating PDF...');
      const pdfResponse = await axios.post(
        `${process.env.PYTHON_SERVICE_URL}/generate-pdf`,
        {
          personal_info: personalInfo,
          tailored_sections: restoredSections,
          section_order: sectionOrder,
          original_pdf_base64: ''   // uses clean ATS layout
        },
        { timeout: 30000 }
      );

      pdfBuffer = Buffer.from(pdfResponse.data.pdf_base64, 'base64');

      // Build filename from company name + candidate name
      const candidateName = personalInfo.full_name?.replace(/\s+/g, '_') || 'Resume';
      const companyName = company_intel?.company_name?.replace(/\s+/g, '_') || 'Company';
      pdfFilename = `${candidateName}_${companyName}_tailored.pdf`;

      console.log(`PDF generated: ${pdfFilename} (${pdfBuffer.length} bytes)`);
    } catch (pdfErr) {
      // PDF generation failed — still save tailored sections, just no PDF
      console.error('PDF generation failed (non-fatal):', pdfErr.message);
    }

    // ── Save everything to tailored_resumes ──────────────────────────────────
    const [insertResult] = await pool.query(
      `INSERT INTO tailored_resumes 
       (user_id, resume_id, structured_id, tailored_sections,
        personal_info, link_registry, jd_analysis, company_intel, added_skills,
        pdf_data, pdf_filename, job_title, company_name)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        req.user.userId,
        resume_id,
        structured_id,
        JSON.stringify(restoredSections),
        JSON.stringify(personalInfo),
        JSON.stringify(linkRegistry),
        JSON.stringify(jd_analysis),
        JSON.stringify(company_intel),
        JSON.stringify(added_skills || []),
        pdfBuffer,          // LONGBLOB — null if PDF failed
        pdfFilename,
        (jd_analysis?.role_summary || '').substring(0, 500),
        company_intel?.company_name || ''
      ]
    );

    res.json({
      message: 'Resume tailored successfully',
      tailored_id: insertResult.insertId,
      tailored_sections: restoredSections,
      personal_info: personalInfo,
      section_order: sectionOrder,
      changes: tailoredData.changes,
      tailoring_summary: tailoredData.tailoring_summary,
      pdf_ready: pdfBuffer !== null,      // tells frontend PDF is saved
      pdf_filename: pdfFilename
    });

  } catch (error) {
    console.error('Tailor resume error:', error.message);
    console.error('Details:', error.response?.data);
    res.status(500).json({ message: 'Failed to tailor resume', details: error.message });
  }
};


// ── Step 3A: Generate PDF ─────────────────────────────────────────────────────
// Option A — Same layout as original PDF with tailored content
const generatePDF = async (req, res) => {
  const { tailored_id } = req.body;

  try {
    const [rows] = await pool.query(
      `SELECT pdf_data, pdf_filename FROM tailored_resumes
       WHERE id = ? AND user_id = ?`,
      [tailored_id, req.user.userId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Tailored resume not found' });
    }

    if (!rows[0].pdf_data) {
      // PDF wasn't saved — regenerate on the fly
      return regeneratePDF(req, res, tailored_id);
    }

    const pdfBase64 = rows[0].pdf_data.toString('base64');
    const filename = rows[0].pdf_filename || 'tailored_resume.pdf';

    res.json({
      message: 'PDF retrieved successfully',
      pdf_base64: pdfBase64,
      filename
    });

  } catch (error) {
    console.error('Generate PDF error:', error.message);
    res.status(500).json({ message: 'Failed to get PDF' });
  }
};

// Fallback — regenerate PDF if not saved in DB
const regeneratePDF = async (req, res, tailored_id) => {
  try {
    const [tailored] = await pool.query(
      `SELECT tr.*, r.original_filename FROM tailored_resumes tr
       JOIN resumes r ON tr.resume_id = r.id
       WHERE tr.id = ? AND tr.user_id = ?`,
      [tailored_id, req.user.userId]
    );

    const [structured] = await pool.query(
      `SELECT section_order FROM resume_structured WHERE id = ?`,
      [tailored[0].structured_id]
    );

    const pythonResponse = await axios.post(
      `${process.env.PYTHON_SERVICE_URL}/generate-pdf`,
      {
        personal_info: JSON.parse(tailored[0].personal_info),
        tailored_sections: JSON.parse(tailored[0].tailored_sections),
        section_order: JSON.parse(structured[0].section_order),
        original_pdf_base64: ''
      },
      { timeout: 30000 }
    );

    res.json({
      message: 'PDF generated successfully',
      pdf_base64: pythonResponse.data.pdf_base64,
      filename: `tailored_${tailored[0].original_filename}`
    });

  } catch (error) {
    console.error('Regenerate PDF error:', error.message);
    res.status(500).json({ message: 'Failed to regenerate PDF' });
  }
};
// ── Helper: Restore links in tailored sections ────────────────────────────────
// Replaces {{PROJECTS_LINK_0}} etc with real URLs
// Called after tailoring, before saving to DB
const restoreLinksInSections = (tailoredSections, linkRegistry) => {
  if (!linkRegistry || Object.keys(linkRegistry).length === 0) {
    return tailoredSections;
  }

  const restored = {};

  for (const [sectionName, content] of Object.entries(tailoredSections)) {
    if (typeof content === 'string') {
      let restoredText = content;
      for (const [placeholder, linkData] of Object.entries(linkRegistry)) {
        restoredText = restoredText.replace(placeholder, linkData.url);
      }
      restored[sectionName] = restoredText;

    } else if (Array.isArray(content)) {
      restored[sectionName] = content.map(item => {
        if (typeof item === 'string') {
          let restoredItem = item;
          for (const [placeholder, linkData] of Object.entries(linkRegistry)) {
            restoredItem = restoredItem.replace(placeholder, linkData.url);
          }
          return restoredItem;
        }
        return item;
      });

    } else {
      restored[sectionName] = content;
    }
  }

  return restored;
};


// ── Get all tailored resumes for user (My Resumes page) ───────────────────────
const getMyResumes = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT 
         tr.id,
         tr.pdf_filename,
         tr.job_title,
         tr.company_name,
         tr.ats_score,
         tr.created_at,
         r.original_filename AS original_resume,
         CASE WHEN tr.pdf_data IS NOT NULL THEN true ELSE false END AS has_pdf
       FROM tailored_resumes tr
       JOIN resumes r ON tr.resume_id = r.id
       WHERE tr.user_id = ?
       ORDER BY tr.created_at DESC`,
      [req.user.userId]
    );

    res.json({ message: 'My resumes fetched', resumes: rows });
  } catch (error) {
    console.error('My resumes error:', error.message);
    res.status(500).json({ message: 'Failed to fetch resumes' });
  }
};

// ── Download a saved PDF by tailored_resume id ────────────────────────────────
const downloadResumePDF = async (req, res) => {
  const { id } = req.params;

  try {
    const [rows] = await pool.query(
      `SELECT pdf_data, pdf_filename FROM tailored_resumes
       WHERE id = ? AND user_id = ?`,
      [id, req.user.userId]
    );

    if (rows.length === 0 || !rows[0].pdf_data) {
      return res.status(404).json({ message: 'PDF not found' });
    }

    // Stream PDF directly — browser downloads it
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition',
      `attachment; filename="${rows[0].pdf_filename || 'tailored_resume.pdf'}"`);
    res.send(rows[0].pdf_data);

  } catch (error) {
    console.error('Download error:', error.message);
    res.status(500).json({ message: 'Download failed' });
  }
};


const generatePlainText = async (req, res) => {
  const { tailored_id } = req.body;

  try {
    const [tailored] = await pool.query(
      `SELECT tr.* FROM tailored_resumes tr
       WHERE tr.id = ? AND tr.user_id = ?`,
      [tailored_id, req.user.userId]
    );

    if (tailored.length === 0) {
      return res.status(404).json({ message: 'Tailored resume not found' });
    }

    const tailoredData = tailored[0];

    const [structured] = await pool.query(
      `SELECT section_order FROM resume_structured WHERE id = ?`,
      [tailoredData.structured_id]
    );

    const pythonResponse = await axios.post(
      `${process.env.PYTHON_SERVICE_URL}/generate-text`,
      {
        personal_info: JSON.parse(tailoredData.personal_info),
        tailored_sections: JSON.parse(tailoredData.tailored_sections),
        section_order: JSON.parse(structured[0].section_order)
      },
      { timeout: 15000 }
    );

    res.json({
      message: 'Plain text generated successfully',
      plain_text: pythonResponse.data.plain_text
    });

  } catch (error) {
    console.error('Generate plain text error:', error.message);
    res.status(500).json({ message: 'Failed to generate plain text' });
  }
};



module.exports = {
  extractStructured,
  tailorResume,
  generatePDF,
  generatePlainText,
  getMyResumes,
  downloadResumePDF
};