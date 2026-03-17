import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { tailorAPI } from '../services/api';
import { ArrowLeft, Copy, CheckCheck } from 'lucide-react';

const PlainTextPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [plainText, setPlainText] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchPlainText();
  }, [id]);

  const fetchPlainText = async () => {
    try {
      const res = await tailorAPI.getPlainText(id);
      setPlainText(res.data.plain_text);
    } catch (err) {
      setError('Failed to load plain text. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(plainText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // fallback for older browsers
      const textarea = document.createElement('textarea');
      textarea.value = plainText;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  if (loading) {
    return (
      <div style={{
        display: 'flex', justifyContent: 'center',
        alignItems: 'center', minHeight: '100vh',
        fontFamily: 'DM Sans, sans-serif'
      }}>
        <p style={{ color: 'var(--slate-400)' }}>Generating plain text...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column',
        justifyContent: 'center', alignItems: 'center',
        minHeight: '100vh', fontFamily: 'DM Sans, sans-serif', gap: '12px'
      }}>
        <p style={{ color: '#ef4444' }}>{error}</p>
        <button
          onClick={() => navigate('/resumes')}
          style={{
            padding: '8px 16px', background: 'var(--slate-800)',
            color: 'white', border: 'none', borderRadius: 'var(--radius-md)',
            cursor: 'pointer', fontFamily: 'DM Sans, sans-serif'
          }}
        >
          ← Back to My Resumes
        </button>
      </div>
    );
  }

  return (
    <div style={{
      fontFamily: 'DM Sans, sans-serif',
      maxWidth: '800px', margin: '0 auto',
      padding: '32px 24px', animation: 'fadeIn 0.4s ease'
    }}>

      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', marginBottom: '24px'
      }}>
        <button
          onClick={() => navigate('/resumes')}
          style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            background: 'none', border: 'none',
            color: 'var(--slate-500)', cursor: 'pointer',
            fontSize: '14px', fontFamily: 'DM Sans, sans-serif',
            transition: 'var(--transition)'
          }}
          onMouseEnter={e => e.currentTarget.style.color = 'var(--slate-800)'}
          onMouseLeave={e => e.currentTarget.style.color = 'var(--slate-500)'}
        >
          <ArrowLeft size={15} /> Back to My Resumes
        </button>

        <button
          onClick={handleCopy}
          style={{
            display: 'flex', alignItems: 'center', gap: '7px',
            padding: '9px 18px',
            background: copied
              ? 'linear-gradient(135deg, #16a34a, #15803d)'
              : 'var(--blue-600)',
            color: 'white', border: 'none',
            borderRadius: 'var(--radius-md)',
            fontSize: '13px', fontWeight: '600',
            cursor: 'pointer', fontFamily: 'DM Sans, sans-serif',
            transition: 'var(--transition)'
          }}
        >
          {copied
            ? <><CheckCheck size={15} /> Copied!</>
            : <><Copy size={15} /> Copy All</>
          }
        </button>
      </div>

      {/* Title */}
      <div style={{ marginBottom: '20px' }}>
        <h1 style={{
          fontSize: '22px', fontWeight: '700',
          color: 'var(--slate-900)', letterSpacing: '-0.4px'
        }}>
          Plain Text Resume
        </h1>
        <p style={{ fontSize: '13px', color: 'var(--slate-500)', marginTop: '5px' }}>
          Copy each section and paste into any job portal or resume template
        </p>
      </div>

      {/* Plain text content */}
      <div style={{
        background: 'white',
        border: '1.5px solid var(--slate-100)',
        borderRadius: 'var(--radius-xl)',
        boxShadow: 'var(--shadow-sm)',
        overflow: 'hidden'
      }}>
        <pre style={{
          margin: 0,
          padding: '28px 32px',
          fontSize: '13.5px',
          lineHeight: '1.75',
          color: 'var(--slate-700)',
          fontFamily: "'DM Mono', 'Courier New', monospace",
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
          overflowX: 'auto'
        }}>
          {plainText}
        </pre>
      </div>

      {/* Bottom copy button */}
      <div style={{ textAlign: 'center', marginTop: '20px' }}>
        <button
          onClick={handleCopy}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '7px',
            padding: '10px 24px',
            background: copied ? '#16a34a' : 'var(--slate-800)',
            color: 'white', border: 'none',
            borderRadius: 'var(--radius-md)',
            fontSize: '13px', fontWeight: '600',
            cursor: 'pointer', fontFamily: 'DM Sans, sans-serif',
            transition: 'var(--transition)'
          }}
        >
          {copied
            ? <><CheckCheck size={15} /> Copied to clipboard!</>
            : <><Copy size={15} /> Copy entire resume</>
          }
        </button>
      </div>
    </div>
  );
};

export default PlainTextPage;