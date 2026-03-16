import { useState, useEffect } from 'react';
import { atsAPI } from '../../services/api';
import { useApp } from '../../context/AppContext';
import LoadingSpinner from '../common/LoadingSpinner';
import ScoreCard from '../common/ScoreCard';
import { Target, TrendingUp, AlertCircle, CheckCircle } from 'lucide-react';

const ATSScorer = ({ onComplete }) => {
  const { pipelineState, updatePipeline } = useApp();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [comparison, setComparison] = useState(null);

  // Auto-run when component mounts
  useEffect(() => {
    if (pipelineState.tailoredId) {
      handleScore();
    }
  }, [pipelineState.tailoredId]); // ← re-runs when tailoredId changes

  const handleScore = async () => {
    console.log('Scoring tailored_id:', pipelineState.tailoredId);
    setLoading(true);
    setError('');

    try {
      const response = await atsAPI.compare(pipelineState.tailoredId);
      const comp = response.data.comparison;

      updatePipeline({ atsComparison: comp });
      setComparison(comp);

      if (onComplete) onComplete({ comparison: comp });

    } catch (err) {
      setError(err.response?.data?.message || 'Scoring failed');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingSpinner message="Calculating ATS scores..." />;
  }

  if (error) {
    return (
      <div className="space-y-4">
        <p className="text-red-500 text-sm">{error}</p>
        <button
          onClick={handleScore}
          className="bg-blue-600 text-white px-6 py-2 rounded-xl"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!comparison) return null;

  const { original, tailored, improvement } = comparison;

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-slate-800">
          ATS Score Analysis
        </h2>
        <p className="text-slate-500 text-sm mt-1">
          How your resume performs against this job description
        </p>
      </div>

      {/* Before vs After */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-slate-50 rounded-xl p-4 text-center">
          <p className="text-xs font-medium text-slate-500 mb-2">
            BEFORE TAILORING
          </p>
          <p className="text-4xl font-bold text-slate-600">
            {original.total_score}
          </p>
          <p className="text-sm text-slate-500">/ 100</p>
        </div>
        <div className="bg-blue-50 rounded-xl p-4 text-center">
          <p className="text-xs font-medium text-blue-600 mb-2">
            AFTER TAILORING
          </p>
          <p className="text-4xl font-bold text-blue-600">
            {tailored.total_score}
          </p>
          <p className="text-sm text-blue-500">/ 100</p>
        </div>
      </div>

      {/* Improvement badge */}
      {improvement > 0 && (
        <div className="bg-green-50 rounded-xl p-3 flex items-center gap-3">
          <TrendingUp size={20} className="text-green-600" />
          <p className="text-sm font-medium text-green-700">
            +{improvement} points improvement from tailoring 🚀
          </p>
        </div>
      )}

      {/* Score breakdown */}
      <div className="space-y-3">
        <p className="text-xs font-medium text-slate-500">
          SCORE BREAKDOWN (TAILORED)
        </p>
        <ScoreCard
          title="Keyword Match"
          score={tailored.keyword_score}
          maxScore={40}
        />
        <ScoreCard
          title="Structure"
          score={tailored.structure_score}
          maxScore={30}
        />
        <ScoreCard
          title="Content Quality"
          score={tailored.quality_score}
          maxScore={30}
        />
      </div>

      {/* Skills found */}
      <div className="grid grid-cols-2 gap-3">
        {tailored.hard_skills_found?.length > 0 && (
          <div className="bg-green-50 rounded-xl p-3">
            <p className="text-xs font-medium text-green-700 mb-2">
              ✅ SKILLS FOUND
            </p>
            <div className="flex flex-wrap gap-1">
              {tailored.hard_skills_found.map((s, i) => (
                <span key={i}
                      className="bg-green-100 text-green-700 text-xs
                                 px-2 py-0.5 rounded-full">
                  {s}
                </span>
              ))}
            </div>
          </div>
        )}

        {tailored.hard_skills_missing?.length > 0 && (
          <div className="bg-orange-50 rounded-xl p-3">
            <p className="text-xs font-medium text-orange-700 mb-2">
              ⚠️ STILL MISSING
            </p>
            <div className="flex flex-wrap gap-1">
              {tailored.hard_skills_missing.map((s, i) => (
                <span key={i}
                      className="bg-orange-100 text-orange-700 text-xs
                                 px-2 py-0.5 rounded-full">
                  {s}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Fixes */}
      {tailored.fixes?.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-slate-500">
            TOP IMPROVEMENTS TO MAKE
          </p>
          {tailored.fixes.slice(0, 3).map((fix, i) => (
            <div key={i}
                 className="bg-white border border-slate-200 rounded-xl p-3">
              <div className="flex items-start gap-2">
                <AlertCircle size={14}
                             className="text-orange-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-slate-800">
                    {fix.issue}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {fix.suggestion}
                  </p>
                  <span className={`text-xs mt-1 inline-block px-2 py-0.5
                                   rounded-full
                                   ${fix.priority === 'High'
                                     ? 'bg-red-100 text-red-600'
                                     : fix.priority === 'Medium'
                                       ? 'bg-orange-100 text-orange-600'
                                       : 'bg-slate-100 text-slate-500'
                                   }`}>
                    {fix.priority} priority • +{fix.impact} pts
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Strengths */}
      {tailored.strengths?.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-slate-500">
            WHAT'S WORKING WELL
          </p>
          {tailored.strengths.map((s, i) => (
            <div key={i} className="flex items-start gap-2">
              <CheckCircle size={14}
                           className="text-green-500 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-slate-700">{s}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ATSScorer;