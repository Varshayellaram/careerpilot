import { useState } from 'react';
import { jdAPI } from '../../services/api';
import { useApp } from '../../context/AppContext';
import LoadingSpinner from '../common/LoadingSpinner';
import { Search, CheckCircle, ChevronDown, ChevronUp } from 'lucide-react';



const JDAnalyzer = ({ onComplete }) => {
  const { pipelineState, updatePipeline } = useApp();



  const [jdText, setJdText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [analysis, setAnalysis] = useState(null);
  const [showDetails, setShowDetails] = useState(false);

  const handleAnalyze = async () => {
    if (!jdText.trim()) {
      setError('Please paste a job description');
      return;
    }
    setLoading(true);
    setError('');
    console.log('Pipeline state:', pipelineState);
    console.log('Resume ID:', pipelineState.resumeId);
    try {
      // Step 1 — Analyze JD
      const jdResponse = await jdAPI.analyze(jdText);
      const jdAnalysis = jdResponse.data.analysis;

      // Step 2 — Calculate skill gap
      const gapResponse = await jdAPI.skillGap(
        jdText,
        pipelineState.resumeId
      );

      const gapData = gapResponse.data;

      // Save to pipeline state
      updatePipeline({
        jdText,
        jdAnalysis,
        gapSkills: gapData.gap_skills || [],
        matchBefore: gapData.match_percentage_before || 0
      });

      setAnalysis({ jdAnalysis, gapData });

      // Move to next step after delay
      setTimeout(() => onComplete({
        jdAnalysis,
        gapSkills: gapData.gap_skills,
        matchBefore: gapData.match_percentage_before
      }), 1000);

    } catch (err) {
      setError(err.response?.data?.message || 'Analysis failed');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingSpinner message="Analyzing job description with AI..." />;
  }

  if (analysis) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-green-100 rounded-full flex items-center
                          justify-center">
            <CheckCircle size={20} className="text-green-600" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-800">JD Analysis Complete</h3>
            <p className="text-sm text-slate-500">
              Found {analysis.jdAnalysis.hard_skills?.length || 0} required skills
            </p>
          </div>
        </div>

        {/* Match score */}
        <div className="bg-blue-50 rounded-xl p-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-slate-700">
              Current Resume Match
            </span>
            <span className="text-2xl font-bold text-blue-600">
              {analysis.gapData.match_percentage_before}%
            </span>
          </div>
          <div className="w-full bg-blue-100 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full"
              style={{ width: `${analysis.gapData.match_percentage_before}%` }}
            ></div>
          </div>
        </div>

        {/* Gap skills */}
        {analysis.gapData.gap_skills?.length > 0 && (
          <div className="bg-orange-50 rounded-xl p-4">
            <p className="text-sm font-medium text-orange-700 mb-2">
              Missing Skills ({analysis.gapData.gap_skills.length})
            </p>
            <div className="flex flex-wrap gap-2">
              {analysis.gapData.gap_skills.map((skill, i) => (
                <span key={i}
                      className="bg-orange-100 text-orange-700 text-xs
                                 px-2 py-1 rounded-full">
                  {skill}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Toggle details */}
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="flex items-center gap-2 text-sm text-blue-600"
        >
          {showDetails ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          {showDetails ? 'Hide' : 'Show'} full analysis
        </button>

        {showDetails && (
          <div className="bg-slate-50 rounded-xl p-4 space-y-3">
            <div>
              <p className="text-xs font-medium text-slate-500 mb-1">
                HARD SKILLS REQUIRED
              </p>
              <div className="flex flex-wrap gap-1">
                {analysis.jdAnalysis.hard_skills?.map((s, i) => (
                  <span key={i}
                        className="bg-blue-100 text-blue-700 text-xs
                                   px-2 py-0.5 rounded-full">
                    {s}
                  </span>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500 mb-1">
                SENIORITY LEVEL
              </p>
              <span className="text-sm font-medium text-slate-800">
                {analysis.jdAnalysis.seniority_level}
              </span>
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500 mb-1">
                ROLE SUMMARY
              </p>
              <p className="text-sm text-slate-700">
                {analysis.jdAnalysis.role_summary}
              </p>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-slate-800">
          Paste Job Description
        </h2>
        <p className="text-slate-500 text-sm mt-1">
          Copy and paste the full job description you want to apply for
        </p>
      </div>

      <textarea
        value={jdText}
        onChange={e => setJdText(e.target.value)}
        placeholder="Paste the full job description here..."
        rows={10}
        className="w-full px-4 py-3 border border-slate-200 rounded-xl
                   text-sm focus:outline-none focus:ring-2
                   focus:ring-blue-500 resize-none"
      />

      {error && <p className="text-red-500 text-sm">{error}</p>}

      <button
        onClick={handleAnalyze}
        disabled={!jdText.trim()}
        className="w-full bg-blue-600 text-white py-3 rounded-xl
                   font-medium hover:bg-blue-700 disabled:opacity-50
                   transition-all flex items-center justify-center gap-2"
      >
        <Search size={18} />
        Analyze Job Description
      </button>
    </div>
  );
};

export default JDAnalyzer;