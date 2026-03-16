import { createContext, useContext, useState, useEffect } from 'react';

// ── Create context ────────────────────────────────────────────────────────────
const AppContext = createContext();

// ── Provider component ────────────────────────────────────────────────────────
// Wraps entire app — any component can access this state
export const AppProvider = ({ children }) => {

  // ── Auth state ──────────────────────────────────────────────────────────────
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);

  // ── Pipeline state ──────────────────────────────────────────────────────────
  // Stores outputs from each agent so they can be passed to next agent
  const [pipelineState, setPipelineState] = useState({
    // Resume data
    resumeId: null,
    resumeFilename: null,
    structuredId: null,
    personalInfo: null,

    // Agent 1 output
    jdText: null,
    jdAnalysis: null,

    // Agent 2 output
    gapSkills: [],
    addedSkills: [],
    matchBefore: 0,
    matchAfter: 0,

    // Agent 3 output
    companyIntel: null,

    // Agent 4 output
    tailoredId: null,
    tailoredSections: null,

    // Agent 5 output
    atsScore: null,
    atsComparison: null,

    // Pipeline progress
    currentStep: 0,
    completedSteps: []
  });

  // ── Load user from localStorage on app start ────────────────────────────────
  useEffect(() => {
    const savedToken = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    if (savedToken && savedUser) {
      setToken(savedToken);
      setUser(JSON.parse(savedUser));
    }
  }, []);

  // ── Auth functions ──────────────────────────────────────────────────────────
  const login = (userData, userToken) => {
    setUser(userData);
    setToken(userToken);
    localStorage.setItem('token', userToken);
    localStorage.setItem('user', JSON.stringify(userData));
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    setPipelineState({});
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  };

  // ── Pipeline functions ──────────────────────────────────────────────────────
  const updatePipeline = (updates) => {
    setPipelineState(prev => ({ ...prev, ...updates }));
  };

  const markStepComplete = (step) => {
    setPipelineState(prev => ({
      ...prev,
      completedSteps: [...new Set([...prev.completedSteps, step])],
      currentStep: step + 1
    }));
  };

  const resetPipeline = () => {
    setPipelineState({
      resumeId: null,
      resumeFilename: null,
      structuredId: null,
      personalInfo: null,
      jdText: null,
      jdAnalysis: null,
      gapSkills: [],
      addedSkills: [],
      matchBefore: 0,
      matchAfter: 0,
      companyIntel: null,
      tailoredId: null,
      tailoredSections: null,
      atsScore: null,
      atsComparison: null,
      currentStep: 0,
      completedSteps: []
    });
  };

  return (
    <AppContext.Provider value={{
      // Auth
      user,
      token,
      isLoggedIn: !!token,
      login,
      logout,
      // Pipeline
      pipelineState,
      updatePipeline,
      markStepComplete,
      resetPipeline
    }}>
      {children}
    </AppContext.Provider>
  );
};

// ── Custom hook ───────────────────────────────────────────────────────────────
// Use this in any component: const { user, pipelineState } = useApp()
export const useApp = () => useContext(AppContext);