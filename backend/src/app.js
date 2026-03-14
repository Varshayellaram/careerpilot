const express = require('express');
const cors = require('cors');
require('dotenv').config();

//importing routes
const authRoutes = require('./routes/authRoutes');
const resumeRoutes = require('./routes/resumeRoutes');
const jdRoutes = require('./routes/jdRoutes');
const skillGapRoutes = require('./routes/skillGapRoutes');
const companyIntelRoutes = require('./routes/companyIntelRoutes');

const app = express();
app.use(cors({ origin: 'http://localhost:5173' }));  
app.use(express.json());
app.use(express.urlencoded())

// Navigating to Routes based on the user/frontend requested api
app.use('/api/auth', authRoutes);   //when frontend req is localhost:5000/api/auth/register or localhost:5000/api/auth/login this line will be executed and this api/auth will be sent to authRoutes file and navigates to that file
app.use('/api/resume', resumeRoutes);  //when frontend req is localhost:5000/api/resume/ this line will execute and navigate to resumeRoutes file
app.use('/api/jd', jdRoutes);
app.use('/api/skill-gap', skillGapRoutes);
app.use('/api/company', companyIntelRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'CareerPilot backend running ✅' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});