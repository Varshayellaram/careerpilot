import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { authAPI } from '../../services/api';
import { Zap, Eye, EyeOff, ArrowRight } from 'lucide-react';

const Login = () => {
  const navigate = useNavigate();
  const { login } = useApp();
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const response = await authAPI.login(formData);
      login(response.data.user, response.data.token);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    width: '100%',
    padding: '11px 14px',
    border: '1.5px solid var(--slate-200)',
    borderRadius: 'var(--radius-md)',
    fontSize: '14px',
    fontFamily: 'DM Sans, sans-serif',
    color: 'var(--slate-800)',
    background: 'white',
    transition: 'var(--transition)',
    outline: 'none'
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #f8fafc 0%, #eff6ff 50%, #f8fafc 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      fontFamily: 'DM Sans, sans-serif'
    }}>

      {/* Background decoration */}
      <div style={{
        position: 'fixed', top: '-100px', right: '-100px',
        width: '400px', height: '400px',
        background: 'radial-gradient(circle, rgba(37,99,235,0.06) 0%, transparent 70%)',
        borderRadius: '50%', pointerEvents: 'none'
      }} />
      <div style={{
        position: 'fixed', bottom: '-80px', left: '-80px',
        width: '300px', height: '300px',
        background: 'radial-gradient(circle, rgba(37,99,235,0.04) 0%, transparent 70%)',
        borderRadius: '50%', pointerEvents: 'none'
      }} />

      <div style={{
        width: '100%', maxWidth: '400px',
        animation: 'fadeIn 0.4s ease forwards'
      }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{
            width: '48px', height: '48px',
            background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
            borderRadius: '14px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px',
            boxShadow: '0 4px 16px rgba(37,99,235,0.35)',
            animation: 'pulse-ring 2s infinite'
          }}>
            <Zap size={22} color="white" />
          </div>
          <h1 style={{
            fontSize: '24px', fontWeight: '700',
            color: 'var(--slate-900)', letterSpacing: '-0.5px'
          }}>
            Welcome back
          </h1>
          <p style={{ fontSize: '14px', color: 'var(--slate-500)', marginTop: '6px' }}>
            Sign in to CareerPilot
          </p>
        </div>

        {/* Card */}
        <div style={{
          background: 'white',
          borderRadius: 'var(--radius-xl)',
          padding: '32px',
          boxShadow: 'var(--shadow-lg)',
          border: '1px solid var(--slate-100)'
        }}>

          {error && (
            <div style={{
              background: 'var(--red-50)',
              border: '1px solid #fecaca',
              color: '#dc2626',
              padding: '10px 14px',
              borderRadius: 'var(--radius-md)',
              fontSize: '13px',
              marginBottom: '20px',
              animation: 'scaleIn 0.2s ease'
            }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '18px' }}>
              <label style={{
                display: 'block', fontSize: '13px',
                fontWeight: '600', color: 'var(--slate-700)',
                marginBottom: '7px'
              }}>
                Email address
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={e => setFormData({ ...formData, email: e.target.value })}
                placeholder="you@example.com"
                required
                style={inputStyle}
                onFocus={e => {
                  e.target.style.borderColor = 'var(--blue-500)';
                  e.target.style.boxShadow = '0 0 0 3px rgba(37,99,235,0.1)';
                }}
                onBlur={e => {
                  e.target.style.borderColor = 'var(--slate-200)';
                  e.target.style.boxShadow = 'none';
                }}
              />
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{
                display: 'block', fontSize: '13px',
                fontWeight: '600', color: 'var(--slate-700)',
                marginBottom: '7px'
              }}>
                Password
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={e => setFormData({ ...formData, password: e.target.value })}
                  placeholder="Enter your password"
                  required
                  style={{ ...inputStyle, paddingRight: '44px' }}
                  onFocus={e => {
                    e.target.style.borderColor = 'var(--blue-500)';
                    e.target.style.boxShadow = '0 0 0 3px rgba(37,99,235,0.1)';
                  }}
                  onBlur={e => {
                    e.target.style.borderColor = 'var(--slate-200)';
                    e.target.style.boxShadow = 'none';
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute', right: '12px',
                    top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none',
                    cursor: 'pointer', color: 'var(--slate-400)',
                    display: 'flex', alignItems: 'center',
                    transition: 'var(--transition)'
                  }}
                >
                  {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                padding: '12px',
                background: loading
                  ? 'var(--slate-300)'
                  : 'linear-gradient(135deg, #2563eb, #1d4ed8)',
                color: 'white',
                border: 'none',
                borderRadius: 'var(--radius-md)',
                fontSize: '14px',
                fontWeight: '600',
                fontFamily: 'DM Sans, sans-serif',
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'var(--transition)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: loading ? 'none' : '0 2px 8px rgba(37,99,235,0.3)'
              }}
              onMouseEnter={e => {
                if (!loading) {
                  e.currentTarget.style.transform = 'translateY(-1px)';
                  e.currentTarget.style.boxShadow = '0 4px 16px rgba(37,99,235,0.4)';
                }
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = loading ? 'none' : '0 2px 8px rgba(37,99,235,0.3)';
              }}
            >
              {loading ? 'Signing in...' : (
                <>Sign in <ArrowRight size={15} /></>
              )}
            </button>
          </form>

          <p style={{
            textAlign: 'center', fontSize: '13px',
            color: 'var(--slate-500)', marginTop: '20px'
          }}>
            Don't have an account?{' '}
            <Link to="/register" style={{
              color: 'var(--blue-600)', fontWeight: '600',
              textDecoration: 'none'
            }}
              onMouseEnter={e => e.target.style.textDecoration = 'underline'}
              onMouseLeave={e => e.target.style.textDecoration = 'none'}
            >
              Create one
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;