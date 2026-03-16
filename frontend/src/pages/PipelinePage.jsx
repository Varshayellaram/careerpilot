import { useState } from 'react';
import { useApp } from '../context/AppContext';
import ResumeUpload from '../components/resume/ResumeUpload';
import JDAnalyzer from '../components/agents/JDAnalyzer';
import SkillGap from '../components/agents/SkillGap';
import CompanyIntel from '../components/agents/CompanyIntel';
import ResumeTailor from '../components/agents/ResumeTailor';
import ATSScorer from '../components/agents/ATSScorer';
import { RotateCcw, Check } from 'lucide-react';

const STEPS = [
  { label: 'Upload', component: ResumeUpload },
  { label: 'JD Analysis', component: JDAnalyzer },
  { label: 'Skill Gap', component: SkillGap },
  { label: 'Company', component: CompanyIntel },
  { label: 'Tailor', component: ResumeTailor },
  { label: 'ATS Score', component: ATSScorer },
];

const PipelinePage = () => {
  const { markStepComplete, resetPipeline } = useApp();
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState([]);

  const handleStepComplete = (stepIndex) => {
    setCompletedSteps(prev => [...new Set([...prev, stepIndex])]);
    markStepComplete(stepIndex);
    if (stepIndex < STEPS.length - 1) {
      setCurrentStep(stepIndex + 1);
    }
  };

  const handleReset = () => {
    resetPipeline();
    setCurrentStep(0);
    setCompletedSteps([]);
  };

  const CurrentComponent = STEPS[currentStep].component;

  return (
    <div style={{ fontFamily: 'DM Sans, sans-serif', animation: 'fadeIn 0.4s ease' }}>

      {/* Page header */}
      <div style={{
        display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', marginBottom: '28px'
      }}>
        <div>
          <h1 style={{
            fontSize: '26px', fontWeight: '700',
            color: 'var(--slate-900)', letterSpacing: '-0.5px'
          }}>
            Tailor Your Resume
          </h1>
          <p style={{ fontSize: '14px', color: 'var(--slate-500)', marginTop: '5px' }}>
            5 AI agents working together to optimize your resume
          </p>
        </div>
        <button
          onClick={handleReset}
          style={{
            display: 'flex', alignItems: 'center', gap: '7px',
            padding: '8px 14px',
            background: 'white',
            border: '1.5px solid var(--slate-200)',
            borderRadius: 'var(--radius-md)',
            fontSize: '13px', fontWeight: '500',
            color: 'var(--slate-600)',
            cursor: 'pointer',
            transition: 'var(--transition)',
            fontFamily: 'DM Sans, sans-serif'
          }}
          onMouseEnter={e => {
            e.currentTarget.style.borderColor = 'var(--slate-300)';
            e.currentTarget.style.background = 'var(--slate-50)';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.borderColor = 'var(--slate-200)';
            e.currentTarget.style.background = 'white';
          }}
        >
          <RotateCcw size={13} />
          Start over
        </button>
      </div>

      {/* Progress steps */}
      <div style={{
        background: 'white',
        borderRadius: 'var(--radius-xl)',
        padding: '20px 28px',
        border: '1.5px solid var(--slate-100)',
        boxShadow: 'var(--shadow-sm)',
        marginBottom: '20px'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'relative'
        }}>
          {/* Connecting line */}
          <div style={{
            position: 'absolute',
            top: '18px', left: '18px',
            right: '18px', height: '2px',
            background: 'var(--slate-100)',
            zIndex: 0
          }}>
            <div style={{
              height: '100%',
              background: 'linear-gradient(90deg, #2563eb, #3b82f6)',
              borderRadius: '99px',
              transition: 'width 0.5s cubic-bezier(0.4,0,0.2,1)',
              width: `${(completedSteps.length / (STEPS.length - 1)) * 100}%`
            }} />
          </div>

          {STEPS.map((step, index) => {
            const isCompleted = completedSteps.includes(index);
            const isCurrent = currentStep === index;

            return (
              <div key={index} style={{
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', zIndex: 1,
                cursor: isCompleted ? 'pointer' : 'default'
              }}
                onClick={() => isCompleted && setCurrentStep(index)}
              >
                <div style={{
                  width: '36px', height: '36px',
                  borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '12px', fontWeight: '700',
                  transition: 'var(--transition-slow)',
                  border: '2px solid',
                  borderColor: isCompleted
                    ? '#2563eb'
                    : isCurrent
                      ? '#2563eb'
                      : 'var(--slate-200)',
                  background: isCompleted
                    ? 'linear-gradient(135deg, #2563eb, #1d4ed8)'
                    : isCurrent
                      ? 'white'
                      : 'white',
                  color: isCompleted
                    ? 'white'
                    : isCurrent
                      ? '#2563eb'
                      : 'var(--slate-400)',
                  boxShadow: isCurrent
                    ? '0 0 0 4px rgba(37,99,235,0.12)'
                    : 'none'
                }}>
                  {isCompleted ? <Check size={14} /> : index + 1}
                </div>
                <span style={{
                  fontSize: '11px', fontWeight: '600',
                  marginTop: '8px',
                  color: isCompleted || isCurrent
                    ? '#2563eb'
                    : 'var(--slate-400)',
                  transition: 'var(--transition)',
                  whiteSpace: 'nowrap'
                }}>
                  {step.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Step content */}
      <div style={{
        background: 'white',
        borderRadius: 'var(--radius-xl)',
        padding: '32px',
        border: '1.5px solid var(--slate-100)',
        boxShadow: 'var(--shadow-sm)',
        animation: 'scaleIn 0.25s ease forwards',
        maxWidth: '680px',
        margin: '0 auto'
      }}>
        <CurrentComponent
          onComplete={() => handleStepComplete(currentStep)}
        />
      </div>

      {/* Back navigation */}
      {currentStep > 0 && currentStep < STEPS.length - 1 && (
        <div style={{ textAlign: 'center', marginTop: '16px' }}>
          <button
            onClick={() => setCurrentStep(prev => prev - 1)}
            style={{
              background: 'none', border: 'none',
              fontSize: '13px', color: 'var(--slate-400)',
              cursor: 'pointer', fontFamily: 'DM Sans, sans-serif',
              transition: 'var(--transition)'
            }}
            onMouseEnter={e => e.currentTarget.style.color = 'var(--slate-600)'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--slate-400)'}
          >
            ← Back to {STEPS[currentStep - 1].label}
          </button>
        </div>
      )}
    </div>
  );
};

export default PipelinePage;