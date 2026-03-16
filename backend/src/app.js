const express = require('express');
const cors = require('cors');
require('dotenv').config();

const authRoutes = require('./routes/authRoutes');
const resumeRoutes = require('./routes/resumeRoutes');
const jdRoutes = require('./routes/jdRoutes');
const skillGapRoutes = require('./routes/skillGapRoutes');
const companyIntelRoutes = require('./routes/companyIntelRoutes');
const resumeTailorRoutes = require('./routes/resumeTailorRoutes');
const atsScorerRoutes = require('./routes/atsScorerRoutes');

const app = express();

app.use(cors({ origin: 'http://localhost:5173' }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);           // register, login
app.use('/api/resume', resumeRoutes);       // upload, get resume
app.use('/api/jd', jdRoutes);               // analyze JD, skill gap
app.use('/api/skill-gap', skillGapRoutes);  // skill gap agent
app.use('/api/company', companyIntelRoutes); // company intel
app.use('/api/tailor', resumeTailorRoutes); // resume tailor agent
app.use('/api/ats', atsScorerRoutes);





// ── Health check ──────────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({ status: 'CareerPilot backend running ✅' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});