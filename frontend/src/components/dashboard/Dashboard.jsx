import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { Zap, Target, ArrowRight } from 'lucide-react';

const Dashboard = () => {
  const navigate = useNavigate();
  const { user } = useApp();

  const steps = [
    { num: '01', title: 'Upload Resume', desc: 'Upload your current PDF resume' },
    { num: '02', title: 'Analyze JD', desc: 'Paste the job description' },
    { num: '03', title: 'AI Tailors', desc: '5 agents optimize your resume' },
    { num: '04', title: 'Download', desc: 'Get tailored resume + ATS score' },
  ];

  return (
    <div style={{
      fontFamily: 'DM Sans, sans-serif',
      animation: 'fadeIn 0.4s ease forwards'
    }}>

      {/* Header */}
      <div style={{ marginBottom: '36px' }}>
        <h1 style={{
          fontSize: '28px', fontWeight: '700',
          color: 'var(--slate-900)', letterSpacing: '-0.5px',
          marginBottom: '8px'
        }}>
          Welcome back, {user?.name?.split(' ')[0]} 👋
        </h1>
        <p style={{ fontSize: '15px', color: 'var(--slate-500)' }}>
          Ready to tailor your resume for your next opportunity?
        </p>
      </div>

      {/* Feature cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '16px',
        marginBottom: '40px'
      }}
        className="stagger"
      >

        {/* Tailor Resume — primary */}
        <button
          onClick={() => navigate('/pipeline')}
          style={{
            background: 'linear-gradient(135deg, #1d4ed8 0%, #2563eb 50%, #3b82f6 100%)',
            border: 'none',
            borderRadius: 'var(--radius-xl)',
            padding: '28px',
            cursor: 'pointer',
            textAlign: 'left',
            color: 'white',
            transition: 'var(--transition-slow)',
            boxShadow: '0 4px 20px rgba(37,99,235,0.35)',
            position: 'relative',
            overflow: 'hidden',
            animation: 'fadeIn 0.4s ease forwards'
          }}
          onMouseEnter={e => {
            e.currentTarget.style.transform = 'translateY(-3px)';
            e.currentTarget.style.boxShadow = '0 8px 32px rgba(37,99,235,0.45)';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 4px 20px rgba(37,99,235,0.35)';
          }}
        >
          {/* Background glow */}
          <div style={{
            position: 'absolute', top: '-20px', right: '-20px',
            width: '120px', height: '120px',
            background: 'rgba(255,255,255,0.08)',
            borderRadius: '50%'
          }} />

          <div style={{
            width: '44px', height: '44px',
            background: 'rgba(255,255,255,0.15)',
            borderRadius: '12px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            marginBottom: '20px',
            backdropFilter: 'blur(4px)'
          }}>
            <Zap size={20} color="white" />
          </div>

          <div style={{
            fontSize: '18px', fontWeight: '700',
            marginBottom: '8px', letterSpacing: '-0.3px'
          }}>
            Tailor My Resume
          </div>
          <div style={{
            fontSize: '13.5px', color: 'rgba(255,255,255,0.75)',
            marginBottom: '20px', lineHeight: '1.5'
          }}>
            Run all 5 AI agents to optimize your resume for a specific job
          </div>
          <div style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            fontSize: '13px', fontWeight: '600',
            color: 'rgba(255,255,255,0.9)'
          }}>
            Get started <ArrowRight size={14} />
          </div>
        </button>

        {/* ATS Checker */}
        <button
          onClick={() => navigate('/ats')}
          style={{
            background: 'white',
            border: '1.5px solid var(--slate-200)',
            borderRadius: 'var(--radius-xl)',
            padding: '28px',
            cursor: 'pointer',
            textAlign: 'left',
            transition: 'var(--transition-slow)',
            boxShadow: 'var(--shadow-sm)',
            animation: 'fadeIn 0.4s ease 0.1s forwards',
            opacity: 0
          }}
          onMouseEnter={e => {
            e.currentTarget.style.transform = 'translateY(-3px)';
            e.currentTarget.style.boxShadow = 'var(--shadow-md)';
            e.currentTarget.style.borderColor = 'var(--blue-200)';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
            e.currentTarget.style.borderColor = 'var(--slate-200)';
          }}
        >
          <div style={{
            width: '44px', height: '44px',
            background: 'var(--blue-50)',
            borderRadius: '12px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            marginBottom: '20px'
          }}>
            <Target size={20} color="var(--blue-600)" />
          </div>

          <div style={{
            fontSize: '18px', fontWeight: '700',
            color: 'var(--slate-900)', marginBottom: '8px',
            letterSpacing: '-0.3px'
          }}>
            ATS Score Checker
          </div>
          <div style={{
            fontSize: '13.5px', color: 'var(--slate-500)',
            marginBottom: '20px', lineHeight: '1.5'
          }}>
            Instantly check how well your resume matches any job description
          </div>
          <div style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            fontSize: '13px', fontWeight: '600',
            color: 'var(--blue-600)'
          }}>
            Check score <ArrowRight size={14} />
          </div>
        </button>
      </div>

      {/* How it works */}
      <div style={{
        background: 'white',
        borderRadius: 'var(--radius-xl)',
        padding: '28px 32px',
        border: '1.5px solid var(--slate-100)',
        boxShadow: 'var(--shadow-sm)',
        animation: 'fadeIn 0.4s ease 0.2s forwards',
        opacity: 0
      }}>
        <h2 style={{
          fontSize: '16px', fontWeight: '700',
          color: 'var(--slate-800)', marginBottom: '24px',
          letterSpacing: '-0.3px'
        }}>
          How CareerPilot works
        </h2>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '16px'
        }}>
          {steps.map((step, i) => (
            <div key={i} style={{
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', textAlign: 'center',
              padding: '16px 8px',
              borderRadius: 'var(--radius-md)',
              transition: 'var(--transition)',
              cursor: 'default'
            }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--slate-50)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <div style={{
                width: '40px', height: '40px',
                background: 'var(--blue-50)',
                borderRadius: '10px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                marginBottom: '12px',
                fontSize: '12px', fontWeight: '700',
                color: 'var(--blue-600)'
              }}>
                {step.num}
              </div>
              <div style={{
                fontSize: '13px', fontWeight: '600',
                color: 'var(--slate-800)', marginBottom: '5px'
              }}>
                {step.title}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--slate-400)', lineHeight: '1.4' }}>
                {step.desc}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;