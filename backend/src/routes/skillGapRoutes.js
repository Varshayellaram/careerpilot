const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
  explainSkill,
  saveSkillDecision,
  calculateMatch,
  getSkillGapOptions,
  quickAddSkills,
  skipSkillGap
} = require('../controllers/skillGapController');

// ── Step 1: Show options to user after gap skills identified ──────────────────
// Returns 3 choices: guided / quick / skip
router.post('/options', protect, getSkillGapOptions);

// ── Step 2A: Guided mode — explain one skill at a time ────────────────────────
router.post('/explain', protect, explainSkill);

// ── Step 2A: Guided mode — save one skill decision ───────────────────────────
router.post('/decision', protect, saveSkillDecision);

// ── Step 2B: Quick mode — add all skills at once ─────────────────────────────
router.post('/quick-add', protect, quickAddSkills);

// ── Step 2C: Skip — bypass agent entirely ────────────────────────────────────
router.post('/skip', protect, skipSkillGap);

// ── Utility: calculate match percentage ──────────────────────────────────────
router.post('/match', protect, calculateMatch);

module.exports = router;