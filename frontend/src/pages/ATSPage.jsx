import { useState } from 'react';
import { resumeAPI, atsAPI } from '../services/api';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ScoreCard from '../components/common/ScoreCard';
import { Target, Upload, Search, AlertCircle, CheckCircle, ArrowRight } from 'lucide-react';

const ATSPage = () => {
  const [resumeFile, setResumeFile] = useState(null);
  const [jdText, setJdText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file?.type !== 'application/pdf') {
      setError('Only PDF files accepted');
      return;
    }
    setResumeFile(file);
    setError('');
  };

  const handleScore = async () => {
    if (!resumeFile || !jdText.trim()) {
      setError('Please upload a resume and paste a job description');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const uploadResponse = await resumeAPI.upload(resumeFile);
      const newResumeId = uploadResponse.data.resume_id;
      const scoreResponse = await atsAPI.score(newResumeId, jdText);
      setResult(scoreResponse.data.score);
    } catch (err) {
      setError(err.response?.data?.message || 'Scoring failed');
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score) => {
    if (score >= 80) return '#16a34a';
    if (score >= 60) return '#2563eb';
    if (score >= 40) return '#f97316';
    return '#ef4444';
  };

  const getScoreLabel = (score) => {
    if (score >= 80) return 'Excellent';
    if (score >= 60) return 'Good';
    if (score >= 40) return 'Needs Work';
    return 'Poor';
  };

  if (loading) {
    return (
      <div style={{ maxWidth: '640px', margin: '0 auto', fontFamily: 'DM Sans, sans-serif' }}>
        <LoadingSpinner message="Analyzing your resume against the job description..." />
      </div>
    );
  }

  return (
    <div style={{ fontFamily: 'DM Sans, sans-serif', animation: 'fadeIn 0.4s ease' }}>

      {/* Header */}
      <div style={{ marginBottom: '28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
          <div style={{
            width: '40px', height: '40px',
            background: 'var(--blue-50)',
            borderRadius: '10px',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <Target size={20} color="var(--blue-600)" />
          </div>
          <h1 style={{
            fontSize: '26px', fontWeight: '700',
            color: 'var(--slate-900)', letterSpacing: '-0.5px'
          }}>
            ATS Score Checker
          </h1>
        </div>
        <p style={{ fontSize: '14px', color: 'var(--slate-500)', marginLeft: '52px' }}>
          Check how well your resume matches any job description instantly
        </p>
      </div>

      {!result ? (
        <div style={{
          maxWidth: '640px',
          background: 'white',
          borderRadius: 'var(--radius-xl)',
          padding: '32px',
          border: '1.5px solid var(--slate-100)',
          boxShadow: 'var(--shadow-sm)'
        }}>

          {/* Upload */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block', fontSize: '13px',
              fontWeight: '600', color: 'var(--slate-700)',
              marginBottom: '8px'
            }}>
              Upload Resume (PDF)
            </label>
            <label style={{
              display: 'flex', alignItems: 'center', gap: '12px',
              padding: '14px 18px',
              border: '2px dashed var(--slate-200)',
              borderRadius: 'var(--radius-md)',
              cursor: 'pointer',
              transition: 'var(--transition)',
              background: resumeFile ? 'var(--blue-50)' : 'transparent'
            }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = 'var(--blue-400)';
                e.currentTarget.style.background = 'var(--blue-50)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = 'var(--slate-200)';
                e.currentTarget.style.background = resumeFile ? 'var(--blue-50)' : 'transparent';
              }}
            >
              <Upload size={18} color={resumeFile ? 'var(--blue-600)' : 'var(--slate-400)'} />
              <span style={{
                fontSize: '13.5px',
                color: resumeFile ? 'var(--blue-700)' : 'var(--slate-500)',
                fontWeight: resumeFile ? '500' : '400'
              }}>
                {resumeFile ? resumeFile.name : 'Click to upload PDF resume'}
              </span>
              <input type="file" accept=".pdf" onChange={handleFileSelect} style={{ display: 'none' }} />
            </label>
          </div>

          {/* JD */}
          <div style={{ marginBottom: '24px' }}>
            <label style={{
              display: 'block', fontSize: '13px',
              fontWeight: '600', color: 'var(--slate-700)',
              marginBottom: '8px'
            }}>
              Job Description
            </label>
            <textarea
              value={jdText}
              onChange={e => setJdText(e.target.value)}
              placeholder="Paste the full job description here..."
              rows={8}
              style={{
                width: '100%', padding: '12px 14px',
                border: '1.5px solid var(--slate-200)',
                borderRadius: 'var(--radius-md)',
                fontSize: '13.5px',
                fontFamily: 'DM Sans, sans-serif',
                color: 'var(--slate-800)',
                resize: 'vertical', outline: 'none',
                transition: 'var(--transition)',
                lineHeight: '1.6'
              }}
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

          {error && (
            <p style={{
              color: '#dc2626', fontSize: '13px',
              marginBottom: '16px'
            }}>{error}</p>
          )}

          <button
            onClick={handleScore}
            disabled={!resumeFile || !jdText.trim()}
            style={{
              width: '100%', padding: '13px',
              background: (!resumeFile || !jdText.trim())
                ? 'var(--slate-200)'
                : 'linear-gradient(135deg, #2563eb, #1d4ed8)',
              color: (!resumeFile || !jdText.trim()) ? 'var(--slate-400)' : 'white',
              border: 'none', borderRadius: 'var(--radius-md)',
              fontSize: '14px', fontWeight: '600',
              fontFamily: 'DM Sans, sans-serif',
              cursor: (!resumeFile || !jdText.trim()) ? 'not-allowed' : 'pointer',
              transition: 'var(--transition)',
              display: 'flex', alignItems: 'center',
              justifyContent: 'center', gap: '8px',
              boxShadow: (!resumeFile || !jdText.trim())
                ? 'none' : '0 2px 8px rgba(37,99,235,0.3)'
            }}
            onMouseEnter={e => {
              if (resumeFile && jdText.trim()) {
                e.currentTarget.style.transform = 'translateY(-1px)';
                e.currentTarget.style.boxShadow = '0 4px 16px rgba(37,99,235,0.4)';
              }
            }}
            onMouseLeave={e => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = (!resumeFile || !jdText.trim())
                ? 'none' : '0 2px 8px rgba(37,99,235,0.3)';
            }}
          >
            <Search size={16} />
            Check ATS Score
          </button>
        </div>

      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '16px',
          maxWidth: '900px',
          animation: 'fadeIn 0.4s ease'
        }}>

          {/* Score card */}
          <div style={{
            background: 'white',
            borderRadius: 'var(--radius-xl)',
            padding: '28px',
            border: '1.5px solid var(--slate-100)',
            boxShadow: 'var(--shadow-sm)',
            textAlign: 'center',
            gridColumn: '1 / -1'
          }}>
            <p style={{
              fontSize: '11px', fontWeight: '700',
              color: 'var(--slate-400)', letterSpacing: '1px',
              textTransform: 'uppercase', marginBottom: '12px'
            }}>
              ATS Score
            </p>
            <div style={{
              fontSize: '72px', fontWeight: '800',
              color: getScoreColor(result.total_score),
              letterSpacing: '-3px', lineHeight: '1',
              marginBottom: '8px'
            }}>
              {result.total_score}
            </div>
            <div style={{
              display: 'inline-block',
              background: `${getScoreColor(result.total_score)}15`,
              color: getScoreColor(result.total_score),
              padding: '4px 12px',
              borderRadius: '99px',
              fontSize: '13px', fontWeight: '600',
              marginBottom: '12px'
            }}>
              {getScoreLabel(result.total_score)}
            </div>
            <p style={{ fontSize: '13.5px', color: 'var(--slate-500)' }}>
              {result.score_summary}
            </p>
          </div>

          {/* Breakdown */}
          <div style={{
            background: 'white',
            borderRadius: 'var(--radius-xl)',
            padding: '24px',
            border: '1.5px solid var(--slate-100)',
            boxShadow: 'var(--shadow-sm)'
          }}>
            <p style={{
              fontSize: '13px', fontWeight: '700',
              color: 'var(--slate-800)', marginBottom: '16px'
            }}>
              Score Breakdown
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <ScoreCard title="Keyword Match" score={result.keyword_score} maxScore={40} />
              <ScoreCard title="Structure" score={result.structure_score} maxScore={30} />
              <ScoreCard title="Content Quality" score={result.quality_score} maxScore={30} />
            </div>
          </div>

          {/* Fixes */}
          <div style={{
            background: 'white',
            borderRadius: 'var(--radius-xl)',
            padding: '24px',
            border: '1.5px solid var(--slate-100)',
            boxShadow: 'var(--shadow-sm)'
          }}>
            <p style={{
              fontSize: '13px', fontWeight: '700',
              color: 'var(--slate-800)', marginBottom: '16px'
            }}>
              Top Improvements
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {result.fixes?.slice(0, 4).map((fix, i) => (
                <div key={i} style={{
                  display: 'flex', gap: '10px',
                  padding: '12px',
                  background: 'var(--slate-50)',
                  borderRadius: 'var(--radius-md)',
                  transition: 'var(--transition)'
                }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--blue-50)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'var(--slate-50)'}
                >
                  <AlertCircle size={14} color="#f97316" style={{ flexShrink: 0, marginTop: '2px' }} />
                  <div>
                    <p style={{ fontSize: '13px', fontWeight: '600', color: 'var(--slate-800)' }}>
                      {fix.issue}
                    </p>
                    <p style={{ fontSize: '12px', color: 'var(--slate-500)', marginTop: '3px' }}>
                      {fix.suggestion}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* CTA */}
          <div style={{
            background: 'linear-gradient(135deg, #1d4ed8, #2563eb)',
            borderRadius: 'var(--radius-xl)',
            padding: '28px',
            textAlign: 'center',
            color: 'white',
            gridColumn: '1 / -1',
            boxShadow: '0 4px 20px rgba(37,99,235,0.3)'
          }}>
            <p style={{ fontSize: '18px', fontWeight: '700', marginBottom: '8px' }}>
              Want a higher score?
            </p>
            <p style={{
              fontSize: '13.5px', color: 'rgba(255,255,255,0.75)',
              marginBottom: '20px'
            }}>
              Use our full tailoring pipeline to optimize your resume
            </p>
            <button
              onClick={() => window.location.href = '/pipeline'}
              style={{
                background: 'white', color: '#2563eb',
                border: 'none', borderRadius: 'var(--radius-md)',
                padding: '10px 24px',
                fontSize: '14px', fontWeight: '600',
                fontFamily: 'DM Sans, sans-serif',
                cursor: 'pointer',
                transition: 'var(--transition)',
                display: 'inline-flex', alignItems: 'center', gap: '8px'
              }}
              onMouseEnter={e => {
                e.currentTarget.style.transform = 'translateY(-1px)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              Tailor My Resume <ArrowRight size={14} />
            </button>
          </div>

          {/* Reset */}
          <button
            onClick={() => { setResult(null); setResumeFile(null); setJdText(''); }}
            style={{
              gridColumn: '1 / -1',
              background: 'none', border: 'none',
              fontSize: '13px', color: 'var(--slate-400)',
              cursor: 'pointer', fontFamily: 'DM Sans, sans-serif',
              padding: '8px', transition: 'var(--transition)'
            }}
            onMouseEnter={e => e.currentTarget.style.color = 'var(--slate-600)'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--slate-400)'}
          >
            ← Check another resume
          </button>
        </div>
      )}
    </div>
  );
};

export default ATSPage;