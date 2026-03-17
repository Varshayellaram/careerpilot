import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider, useApp } from './context/AppContext';
import Layout from './components/layout/Layout';
import Login from './components/auth/Login';
import Register from './components/auth/Register';
import Dashboard from './components/dashboard/Dashboard';
import PipelinePage from './pages/PipelinePage';
import ATSPage from './pages/ATSPage';
import MyResumesPage from './pages/MyResumesPage';

// ── Protected route ───────────────────────────────────────────────────────────
const ProtectedRoute = ({ children }) => {
  const { isLoggedIn } = useApp();
  return isLoggedIn ? children : <Navigate to="/login" replace />;
};

// ── Routes ────────────────────────────────────────────────────────────────────
const AppRoutes = () => {
  const { isLoggedIn } = useApp();

  return (
    <Routes>
      {/* Public */}
      <Route path="/login" element={
        isLoggedIn ? <Navigate to="/dashboard" /> : <Login />
      } />
      <Route path="/register" element={
        isLoggedIn ? <Navigate to="/dashboard" /> : <Register />
      } />

      {/* Protected */}
      <Route path="/dashboard" element={
        <ProtectedRoute>
          <Layout><Dashboard /></Layout>
        </ProtectedRoute>
      } />
      <Route path="/pipeline" element={
        <ProtectedRoute>
          <Layout><PipelinePage /></Layout>
        </ProtectedRoute>
      } />
      <Route path="/ats" element={
        <ProtectedRoute>
          <Layout><ATSPage /></Layout>
        </ProtectedRoute>
      } />
      <Route path="/resumes" element={
        <ProtectedRoute>
          <Layout><MyResumesPage /></Layout>
        </ProtectedRoute>
      } />

      {/* Redirects */}
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
};

const App = () => (
  <AppProvider>
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  </AppProvider>
);

export default App;