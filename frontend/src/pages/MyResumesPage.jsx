import { useEffect, useState } from 'react';
import { tailorAPI } from '../services/api';
import { Download, FileText, Calendar, Building2, Target, Inbox } from 'lucide-react';
import { useNavigate }  from 'react-router-dom';

const MyResumesPage = () => {
  const [resumes, setResumes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchResumes();
  }, []);

  const fetchResumes = async () => {
    try {
      const res = await tailorAPI.getMyResumes();
      setResumes(res.data.resumes);
    } catch (err) {
      console.error('Failed to fetch resumes:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (id, filename) => {
    setDownloading(id);
    try {
      const response = await tailorAPI.downloadResumePDF(id);
      const base64 = response.data.pdf_base64;
      const byteCharacters = atob(base64);
      const byteArray = new Uint8Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteArray[i] = byteCharacters.charCodeAt(i);
      }
      const blob = new Blob([byteArray], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename || 'tailored_resume.pdf';
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Download failed:', err);
    } finally {
      setDownloading(null);
    }
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: 'numeric', month: 'short', year: 'numeric'
    });
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}>
        <p style={{ color: 'var(--slate-400)', fontFamily: 'DM Sans, sans-serif' }}>
          Loading your resumes...
        </p>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: 'DM Sans, sans-serif', animation: 'fadeIn 0.4s ease' }}>

      {/* Header */}
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{
          fontSize: '26px', fontWeight: '700',
          color: 'var(--slate-900)', letterSpacing: '-0.5px'
        }}>
          My Resumes
        </h1>
        <p style={{ fontSize: '14px', color: 'var(--slate-500)', marginTop: '5px' }}>
          All your tailored resumes — download anytime
        </p>
      </div>

      {/* Empty state */}
      {resumes.length === 0 ? (
        <div style={{
          background: 'white', borderRadius: 'var(--radius-xl)',
          border: '1.5px solid var(--slate-100)',
          padding: '60px 32px', textAlign: 'center'
        }}>
          <Inbox size={40} style={{ color: 'var(--slate-300)', margin: '0 auto 16px' }} />
          <p style={{ fontSize: '16px', fontWeight: '600', color: 'var(--slate-600)' }}>
            No tailored resumes yet
          </p>
          <p style={{ fontSize: '14px', color: 'var(--slate-400)', marginTop: '6px' }}>
            Go to Tailor Resume to create your first one
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {resumes.map((resume) => (
            <div key={resume.id} style={{
              background: 'white',
              borderRadius: 'var(--radius-xl)',
              border: '1.5px solid var(--slate-100)',
              padding: '20px 24px',
              boxShadow: 'var(--shadow-sm)',
              display: 'flex', alignItems: 'center',
              gap: '16px', transition: 'var(--transition)'
            }}
              onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--blue-100)'}
              onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--slate-100)'}
            >
              {/* Icon */}
              <div style={{
                width: '44px', height: '44px', flexShrink: 0,
                background: 'var(--blue-50)', borderRadius: 'var(--radius-md)',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <FileText size={20} style={{ color: 'var(--blue-600)' }} />
              </div>

              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{
                  fontSize: '14px', fontWeight: '600',
                  color: 'var(--slate-800)',
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
                }}>
                  {resume.pdf_filename || resume.original_resume}
                </p>
                <div style={{
                  display: 'flex', gap: '14px', marginTop: '5px',
                  flexWrap: 'wrap'
                }}>
                  {resume.company_name && (
                    <span style={{
                      display: 'flex', alignItems: 'center', gap: '4px',
                      fontSize: '12px', color: 'var(--slate-500)'
                    }}>
                      <Building2 size={11} /> {resume.company_name}
                    </span>
                  )}
                  {resume.ats_score && (
                    <span style={{
                      display: 'flex', alignItems: 'center', gap: '4px',
                      fontSize: '12px',
                      color: resume.ats_score >= 70 ? '#16a34a' : resume.ats_score >= 50 ? '#d97706' : '#ef4444'
                    }}>
                      <Target size={11} /> ATS {resume.ats_score}/100
                    </span>
                  )}
                  <span style={{
                    display: 'flex', alignItems: 'center', gap: '4px',
                    fontSize: '12px', color: 'var(--slate-400)'
                  }}>
                    <Calendar size={11} /> {formatDate(resume.created_at)}
                  </span>
                </div>
              </div>

              {/* Buttons */}
              <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>

                {/* Download PDF */}
                {resume.has_pdf ? (
                  <button
                    onClick={() => handleDownload(resume.id, resume.pdf_filename)}
                    disabled={downloading === resume.id}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '6px',
                      padding: '8px 16px',
                      background: downloading === resume.id ? 'var(--slate-100)' : 'var(--blue-600)',
                      color: downloading === resume.id ? 'var(--slate-400)' : 'white',
                      border: 'none', borderRadius: 'var(--radius-md)',
                      fontSize: '13px', fontWeight: '600',
                      cursor: downloading === resume.id ? 'not-allowed' : 'pointer',
                      fontFamily: 'DM Sans, sans-serif',
                      transition: 'var(--transition)'
                    }}
                  >
                    <Download size={14} />
                    {downloading === resume.id ? 'Downloading...' : 'Download'}
                  </button>
                ) : (
                  <span style={{
                    fontSize: '12px', color: 'var(--slate-400)',
                    fontStyle: 'italic', alignSelf: 'center'
                  }}>
                    PDF not available
                  </span>
                )}

                {/* Plain Text */}
                <button
                  onClick={() => navigate(`/resumes/plaintext/${resume.id}`)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '6px',
                    padding: '8px 16px',
                    background: 'white',
                    color: 'var(--slate-600)',
                    border: '1.5px solid var(--slate-200)',
                    borderRadius: 'var(--radius-md)',
                    fontSize: '13px', fontWeight: '600',
                    cursor: 'pointer', fontFamily: 'DM Sans, sans-serif',
                    transition: 'var(--transition)'
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
                  <FileText size={14} />
                  Plain Text
                </button>

              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MyResumesPage;