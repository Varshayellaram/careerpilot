

const axios = require('axios');
const pool = require('../config/db');

// ── Get explanation for a skill user doesn't know ─────────────────────────────
// Called when user clicks "No, never used it" in the frontend
const explainSkill = async (req, res) => {
  const { skill_name, job_context } = req.body;

  try {
    // Forward request to Python AI service
    const response = await axios.post(
      `${process.env.PYTHON_SERVICE_URL}/explain-skill`,
      { skill_name, job_context }
    );

    res.json(response.data);

  } catch (error) {
    console.error('Explain skill error:', error.message);
    res.status(500).json({ message: 'Failed to explain skill' });
  }
};


// ── Save user's skill decision after conversation ─────────────────────────────
// Called when user decides whether to add skill to resume or not
const saveSkillDecision = async (req, res) => {
  const {
    skill_name,        // e.g. "AWS"
    proficiency_level, // "Beginner" / "Intermediate" / "Advanced" / null
    add_to_resume,     // true or false
    add_to_growth_plan // true or false
  } = req.body;

  try {
    if (add_to_resume) {
      // User wants skill on resume — save to user_skills table
      await pool.query(
        `INSERT INTO user_skills 
         (user_id, skill_name, proficiency_level, source) 
         VALUES (?, ?, ?, ?)`,
        [
          req.user.userId,
          skill_name,
          proficiency_level,
          'skill_gap_agent' // track where this skill came from
        ]
      );
    }

    if (add_to_growth_plan) {
      // User wants to learn it — save to growth plan table
      await pool.query(
        `INSERT INTO growth_plan 
         (user_id, skill_name, reason) 
         VALUES (?, ?, ?)`,
        [
          req.user.userId,
          skill_name,
          'Identified as gap skill during job application'
        ]
      );
    }

    res.json({
      message: 'Skill decision saved successfully',
      skill_name,
      add_to_resume,
      proficiency_level
    });

  } catch (error) {
    console.error('Save skill error:', error.message);
    res.status(500).json({ message: 'Failed to save skill decision' });
  }
};


// ── Calculate final match percentage after conversation ───────────────────────
// Shows user how much their profile improved after the conversation
const calculateMatch = async (req, res) => {
  const { jd_skills, resume_skills, added_skills } = req.body;

  try {
    const response = await axios.post(
      `${process.env.PYTHON_SERVICE_URL}/calculate-match`,
      { jd_skills, resume_skills, added_skills }
    );

    res.json(response.data);

  } catch (error) {
    console.error('Match calculation error:', error.message);
    res.status(500).json({ message: 'Failed to calculate match' });
  }
};

// ── Get skill gap mode selection data ────────────────────────────────────────
// First thing user sees after gap skills are identified
// Presents 3 options: guided / quick / skip
// User makes ONE choice before anything else happens
const getSkillGapOptions = async (req, res) => {
  const { gap_skills, jd_skills, resume_skills } = req.body;

  try {
    // Calculate current match percentage to show user what they're missing
    const matchResponse = await axios.post(
      `${process.env.PYTHON_SERVICE_URL}/calculate-match`,
      {
        jd_skills,
        resume_skills,
        added_skills: [] // nothing added yet
      }
    );

    const currentMatch = matchResponse.data.match_percentage_before;

    // Build response that frontend uses to show options UI
    res.json({
      message: 'Choose how you want to handle missing skills',
      gap_skills,                          // list of missing skills
      gap_count: gap_skills.length,        // e.g. 3
      current_match_percentage: currentMatch, // e.g. 40%
      options: [
        {
          id: 'guided',
          title: 'Guide me skill by skill',
          description: 'I will explain each skill and help you decide',
          icon: '🎓'
        },
        {
          id: 'quick',
          title: 'Let me add them myself',
          description: 'Show me all missing skills, I will pick my levels',
          icon: '⚡'
        },
        {
          id: 'skip',
          title: 'Skip, just use what I have',
          description: 'Continue with my current skills only',
          icon: '⏭️'
        }
      ]
    });

  } catch (error) {
    console.error('Skill gap options error:', error.message);
    res.status(500).json({ message: 'Failed to get skill gap options' });
  }
};


// ── Handle quick mode skill additions ─────────────────────────────────────────
// Called when user chose "quick" option and filled in their levels
// Saves all skill decisions in one shot instead of one by one
const quickAddSkills = async (req, res) => {
  const {
    selected_skills, // array of {skill_name, proficiency_level, add_to_resume}
    jd_skills,
    resume_skills
  } = req.body;

  try {
    const addedSkills = [];

    // Loop through each skill user decided on
    for (const skill of selected_skills) {

      if (skill.add_to_resume && skill.proficiency_level) {
        // Save to user_skills table
        await pool.query(
          `INSERT INTO user_skills 
           (user_id, skill_name, proficiency_level, source) 
           VALUES (?, ?, ?, ?)`,
          [
            req.user.userId,
            skill.skill_name,
            skill.proficiency_level,
            'quick_add' // track that user added this themselves
          ]
        );

        // Track for match percentage calculation
        addedSkills.push(skill.skill_name);
      }
    }

    // Calculate improved match percentage after additions
    const matchResponse = await axios.post(
      `${process.env.PYTHON_SERVICE_URL}/calculate-match`,
      {
        jd_skills,
        resume_skills,
        added_skills: addedSkills
      }
    );

    res.json({
      message: 'Skills added successfully',
      added_count: addedSkills.length,
      added_skills: addedSkills,
      match_percentage_before: matchResponse.data.match_percentage_before,
      match_percentage_after: matchResponse.data.match_percentage_after,
      improvement: matchResponse.data.improvement
    });

  } catch (error) {
    console.error('Quick add skills error:', error.message);
    res.status(500).json({ message: 'Failed to add skills' });
  }
};


// ── Handle skip option ────────────────────────────────────────────────────────
// User chose to skip skill gap agent entirely
// We still show them what they're missing so they're informed
// But we don't block them — respect their choice
const skipSkillGap = async (req, res) => {
  const { gap_skills, jd_skills, resume_skills } = req.body;

  try {
    // Calculate match with what they currently have
    const matchResponse = await axios.post(
      `${process.env.PYTHON_SERVICE_URL}/calculate-match`,
      {
        jd_skills,
        resume_skills,
        added_skills: [] // nothing added since they skipped
      }
    );

    res.json({
      message: 'Skipped skill gap agent',
      // Still show them gap skills so they are aware
      gap_skills_you_are_missing: gap_skills,
      current_match_percentage: matchResponse.data.match_percentage_before,
      // Gentle nudge — not forced
      tip: `You are missing ${gap_skills.length} skills. You can always update your skills from your profile later.`
    });

  } catch (error) {
    console.error('Skip skill gap error:', error.message);
    res.status(500).json({ message: 'Failed to skip skill gap' });
  }
};

module.exports = {
  explainSkill,
  saveSkillDecision,
  calculateMatch,
  getSkillGapOptions,   // ← new
  quickAddSkills,       // ← new
  skipSkillGap          // ← new
};