import { useState } from 'react';
import { resumeAPI, atsAPI } from '../services/api';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ScoreCard from '../components/common/ScoreCard';
import { Target, Upload, Search, AlertCircle, CheckCircle } from 'lucide-react';

const ATSPage = () => {
  const [resumeFile, setResumeFile] = useState(null);
  const [jdText, setJdText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const [resumeId, setResumeId] = useState(null);

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
      // Upload resume first
      const uploadResponse = await resumeAPI.upload(resumeFile);
      const newResumeId = uploadResponse.data.resume_id;
      setResumeId(newResumeId);

      // Score against JD
      const scoreResponse = await atsAPI.score(newResumeId, jdText);
      setResult(scoreResponse.data.score);

    } catch (err) {
      setError(err.response?.data?.message || 'Scoring failed');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto">
        <LoadingSpinner message="Analyzing resume against job description..." />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <Target size={24} className="text-blue-600" />
          ATS Score Checker
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          Check how well your resume matches any job description instantly
        </p>
      </div>

      {!result ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-6
                        shadow-sm space-y-5">

          {/* Resume upload */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Upload Resume (PDF)
            </label>
            <label className="flex items-center gap-3 p-4 border-2 border-dashed
                              border-slate-200 rounded-xl cursor-pointer
                              hover:border-blue-400 hover:bg-blue-50
                              transition-all">
              <Upload size={18} className="text-slate-400" />
              <span className="text-sm text-slate-500">
                {resumeFile ? resumeFile.name : 'Click to upload PDF'}
              </span>
              <input
                type="file"
                accept=".pdf"
                onChange={handleFileSelect}
                className="hidden"
              />
            </label>
          </div>

          {/* JD input */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Job Description
            </label>
            <textarea
              value={jdText}
              onChange={e => setJdText(e.target.value)}
              placeholder="Paste the job description here..."
              rows={8}
              className="w-full px-4 py-3 border border-slate-200 rounded-xl
                         text-sm focus:outline-none focus:ring-2
                         focus:ring-blue-500 resize-none"
            />
          </div>

          {error && <p className="text-red-500 text-sm">{error}</p>}

          <button
            onClick={handleScore}
            disabled={!resumeFile || !jdText.trim()}
            className="w-full bg-blue-600 text-white py-3 rounded-xl
                       font-medium hover:bg-blue-700 disabled:opacity-50
                       transition-all flex items-center justify-center gap-2"
          >
            <Search size={18} />
            Check ATS Score
          </button>
        </div>
      ) : (
        <div className="space-y-4">

          {/* Total score */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6
                          shadow-sm text-center">
            <p className="text-sm font-medium text-slate-500 mb-2">
              ATS SCORE
            </p>
            <div className={`text-6xl font-bold mb-2
                            ${result.total_score >= 80
                              ? 'text-green-600'
                              : result.total_score >= 60
                                ? 'text-blue-600'
                                : result.total_score >= 40
                                  ? 'text-orange-500'
                                  : 'text-red-500'
                            }`}>
              {result.total_score}
            </div>
            <p className="text-slate-400 text-sm">out of 100</p>
            <p className="text-slate-600 text-sm mt-3">
              {result.score_summary}
            </p>
          </div>

          {/* Score breakdown */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6
                          shadow-sm space-y-3">
            <p className="text-sm font-bold text-slate-800">Score Breakdown</p>
            <ScoreCard title="Keyword Match" score={result.keyword_score} maxScore={40} />
            <ScoreCard title="Structure" score={result.structure_score} maxScore={30} />
            <ScoreCard title="Content Quality" score={result.quality_score} maxScore={30} />
          </div>

          {/* Fixes */}
          {result.fixes?.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6
                            shadow-sm space-y-3">
              <p className="text-sm font-bold text-slate-800">
                How to improve
              </p>
              {result.fixes.map((fix, i) => (
                <div key={i}
                     className="flex items-start gap-2 p-3 bg-slate-50 rounded-xl">
                  <AlertCircle size={14}
                               className="text-orange-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-slate-800">
                      {fix.issue}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {fix.suggestion}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* CTA to tailor */}
          <div className="bg-blue-600 rounded-2xl p-6 text-white text-center">
            <p className="font-bold text-lg mb-2">
              Want to improve this score?
            </p>
            <p className="text-blue-100 text-sm mb-4">
              Use our full tailoring pipeline to optimize your resume
            </p>
            <button
              onClick={() => window.location.href = '/pipeline'}
              className="bg-white text-blue-600 px-6 py-2 rounded-xl
                         font-medium hover:bg-blue-50 transition-all"
            >
              Tailor My Resume →
            </button>
          </div>

          {/* Reset */}
          <button
            onClick={() => {
              setResult(null);
              setResumeFile(null);
              setJdText('');
            }}
            className="w-full text-sm text-slate-500 hover:text-slate-700
                       py-2"
          >
            Check another resume
          </button>
        </div>
      )}
    </div>
  );
};

export default ATSPage;