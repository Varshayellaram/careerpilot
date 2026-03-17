import axios from 'axios';

// ── Base URL ──────────────────────────────────────────────────────────────────
const BASE_URL = 'http://localhost:5000/api';

// ── Axios instance ────────────────────────────────────────────────────────────
// Automatically adds token to every request
// No need to manually add Authorization header anywhere
const api = axios.create({
  baseURL: BASE_URL,
  timeout: 120000 // 2 minutes for long AI operations
});

// ── Request interceptor ───────────────────────────────────────────────────────
// Runs before every request — adds token from localStorage
api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ── Response interceptor ──────────────────────────────────────────────────────
// Runs after every response
// If 401 — token expired, redirect to login
api.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// AUTH APIs
// ─────────────────────────────────────────────────────────────────────────────
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data)
};

// ─────────────────────────────────────────────────────────────────────────────
// RESUME APIs
// ─────────────────────────────────────────────────────────────────────────────
export const resumeAPI = {
  // Upload PDF resume
  upload: (file) => {
    const formData = new FormData();
    formData.append('resume', file);
    return api.post('/resume/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
  // Get resume by ID
  get: (id) => api.get(`/resume/${id}`),
  // Extract structured data for tailoring
  extractStructured: (resumeId) =>
    api.post('/tailor/extract-structured', { resume_id: resumeId })
};

// ─────────────────────────────────────────────────────────────────────────────
// JD ANALYZER APIs — Agent 1
// ─────────────────────────────────────────────────────────────────────────────
export const jdAPI = {
  // Analyze job description
  analyze: (jdText) => api.post('/jd/analyze', { jd_text: jdText }),
  // Calculate skill gap
  skillGap: (jdText, resumeId) =>
    api.post('/jd/skill-gap', { jd_text: jdText, resume_id: resumeId })
};

// ─────────────────────────────────────────────────────────────────────────────
// SKILL GAP APIs — Agent 2
// ─────────────────────────────────────────────────────────────────────────────
export const skillGapAPI = {
  // Get options (guided/quick/skip)
  getOptions: (data) => api.post('/skill-gap/options', data),
  // Explain a skill
  explain: (skillName, jobContext) =>
    api.post('/skill-gap/explain', {
      skill_name: skillName,
      job_context: jobContext
    }),
  // Save skill decision
  saveDecision: (data) => api.post('/skill-gap/decision', data),
  // Quick add skills
  quickAdd: (data) => api.post('/skill-gap/quick-add', data),
  // Skip skill gap
  skip: (data) => api.post('/skill-gap/skip', data),
  // Calculate match percentage
  calculateMatch: (data) => api.post('/skill-gap/match', data)
};

// ─────────────────────────────────────────────────────────────────────────────
// COMPANY INTEL APIs — Agent 3
// ─────────────────────────────────────────────────────────────────────────────
export const companyAPI = {
  // Get company intelligence
  getIntel: (companyName, role) =>
    api.post('/company/intel', {
      company_name: companyName,
      role: role
    })
};

// ─────────────────────────────────────────────────────────────────────────────
// RESUME TAILOR APIs — Agent 4
// ─────────────────────────────────────────────────────────────────────────────
export const tailorAPI = {
  tailor: (data) => api.post('/tailor/resume', data),
  generatePDF: (tailoredId) =>
    api.post('/tailor/pdf', { tailored_id: tailoredId }),
  generateText: (tailoredId) =>
    api.post('/tailor/text', { tailored_id: tailoredId }),   // ← comma added
  getMyResumes: () =>
    api.get('/tailor/my-resumes'),
  downloadResumePDF: (id) =>
    api.post('/tailor/pdf', { tailored_id: id }),
  getPlainText: (tailoredId) =>
    api.post('/tailor/text', { tailored_id: tailoredId }),

};

// ─────────────────────────────────────────────────────────────────────────────
// ATS SCORER APIs — Agent 5
// ─────────────────────────────────────────────────────────────────────────────
export const atsAPI = {
  // Standalone score check
  score: (resumeId, jdText) =>
    api.post('/ats/score', {
      resume_id: resumeId,
      jd_text: jdText
    }),
  // Before/after comparison
  compare: (tailoredId) =>
    api.post('/ats/compare', { tailored_id: tailoredId })
};

export default api;