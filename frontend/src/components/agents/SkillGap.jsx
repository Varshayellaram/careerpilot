import { useState } from 'react';
import { skillGapAPI } from '../../services/api';
import { useApp } from '../../context/AppContext';
import LoadingSpinner from '../common/LoadingSpinner';
import {
  BookOpen, Zap, SkipForward,
  CheckCircle, ChevronRight
} from 'lucide-react';

const SkillGap = ({ onComplete }) => {
  const { pipelineState, updatePipeline } = useApp();

  const [mode, setMode] = useState(null); // 'guided' | 'quick' | 'skip'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  // Quick mode state
  const [quickSelections, setQuickSelections] = useState(
    (pipelineState.gapSkills || []).map(skill => ({
      skill_name: skill,
      proficiency_level: null,
      add_to_resume: false
    }))
  );

  // Guided mode state
  const [currentSkillIndex, setCurrentSkillIndex] = useState(0);
  const [guidedStep, setGuidedStep] = useState('ask'); // ask | level | explain | learn | add
  const [explanation, setExplanation] = useState(null);
  const [loadingExplanation, setLoadingExplanation] = useState(false);
  const [addedSkills, setAddedSkills] = useState([]);

  const gapSkills = pipelineState.gapSkills || [];
  const currentSkill = gapSkills[currentSkillIndex];

  // ── Guided mode handlers ────────────────────────────────────────────────────

  const handleKnowSkill = async (knows) => {
    if (knows) {
      setGuidedStep('level');
    } else {
      // Fetch explanation from AI
      setLoadingExplanation(true);
      try {
        const response = await skillGapAPI.explain(
          currentSkill,
          pipelineState.jdAnalysis?.role_summary || 'Software Engineer role'
        );
        setExplanation(response.data);
        setGuidedStep('explain');
      } catch (err) {
        setError('Failed to get explanation');
      } finally {
        setLoadingExplanation(false);
      }
    }
  };

  const handleSelectLevel = async (level) => {
    // Save decision
    await skillGapAPI.saveDecision({
      skill_name: currentSkill,
      proficiency_level: level,
      add_to_resume: true,
      add_to_growth_plan: false
    });

    setAddedSkills(prev => [...prev, {
      skill_name: currentSkill,
      proficiency_level: level
    }]);

    moveToNextSkill();
  };

  const handleWantToLearn = async (wants) => {
    if (wants) {
      setGuidedStep('add');
    } else {
      moveToNextSkill();
    }
  };

  const handleAddToResume = async (add) => {
    if (add) {
      await skillGapAPI.saveDecision({
        skill_name: currentSkill,
        proficiency_level: 'Beginner',
        add_to_resume: true,
        add_to_growth_plan: true
      });
      setAddedSkills(prev => [...prev, {
        skill_name: currentSkill,
        proficiency_level: 'Beginner'
      }]);
    }
    moveToNextSkill();
  };

  const moveToNextSkill = () => {
    if (currentSkillIndex < gapSkills.length - 1) {
      setCurrentSkillIndex(prev => prev + 1);
      setGuidedStep('ask');
      setExplanation(null);
    } else {
      finishGuidedMode();
    }
  };

  const finishGuidedMode = async () => {
    await calculateFinalMatch(addedSkills);
  };

  // ── Quick mode handler ──────────────────────────────────────────────────────

  const handleQuickAdd = async () => {
    setLoading(true);
    try {
      const response = await skillGapAPI.quickAdd({
        selected_skills: quickSelections,
        jd_skills: pipelineState.jdAnalysis?.hard_skills || [],
        resume_skills: pipelineState.jdAnalysis?.hard_skills?.filter(
          s => !gapSkills.includes(s)
        ) || []
      });

      const added = quickSelections.filter(s => s.add_to_resume);
      await calculateFinalMatch(added);

    } catch (err) {
      setError('Failed to save skills');
    } finally {
      setLoading(false);
    }
  };

  // ── Skip handler ────────────────────────────────────────────────────────────

  const handleSkip = async () => {
    setLoading(true);
    try {
      await skillGapAPI.skip({
        gap_skills: gapSkills,
        jd_skills: pipelineState.jdAnalysis?.hard_skills || [],
        resume_skills: []
      });
      await calculateFinalMatch([]);
    } catch (err) {
      setError('Failed to skip');
    } finally {
      setLoading(false);
    }
  };

  // ── Calculate final match ───────────────────────────────────────────────────

  const calculateFinalMatch = async (added) => {
    const matchResponse = await skillGapAPI.calculateMatch({
      jd_skills: pipelineState.jdAnalysis?.hard_skills || [],
      resume_skills: pipelineState.jdAnalysis?.hard_skills?.filter(
        s => !gapSkills.includes(s)
      ) || [],
      added_skills: added.map(s => s.skill_name)
    });

    updatePipeline({
      addedSkills: added,
      matchAfter: matchResponse.data.match_percentage_after
    });

    setDone(true);
    setTimeout(() => onComplete({ addedSkills: added }), 800);
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  if (loading) return <LoadingSpinner message="Processing skills..." />;

  // No gap skills — skip this step
  if (gapSkills.length === 0) {
    return (
      <div className="text-center py-8">
        <CheckCircle size={48} className="text-green-500 mx-auto mb-4" />
        <h3 className="font-semibold text-slate-800 text-lg">
          Your resume already has all required skills!
        </h3>
        <button
          onClick={() => onComplete({ addedSkills: [] })}
          className="mt-4 bg-blue-600 text-white px-6 py-2 rounded-xl
                     font-medium hover:bg-blue-700"
        >
          Continue
        </button>
      </div>
    );
  }

  // Done state
  if (done) {
    return (
      <div className="text-center py-8">
        <CheckCircle size={48} className="text-green-500 mx-auto mb-4" />
        <h3 className="font-semibold text-slate-800 text-lg">
          Skills updated successfully
        </h3>
        <div className="mt-4 bg-blue-50 rounded-xl p-4 inline-block">
          <p className="text-blue-600 font-bold text-2xl">
            {pipelineState.matchAfter}%
          </p>
          <p className="text-slate-500 text-sm">Match after update</p>
        </div>
      </div>
    );
  }

  // Mode selection screen
  if (!mode) {
    return (
      <div className="space-y-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800">
            Skill Gap Found
          </h2>
          <p className="text-slate-500 text-sm mt-1">
            You are missing {gapSkills.length} skills from this JD.
            How would you like to proceed?
          </p>
        </div>

        {/* Gap skills preview */}
        <div className="bg-orange-50 rounded-xl p-4">
          <p className="text-sm font-medium text-orange-700 mb-2">
            Missing skills:
          </p>
          <div className="flex flex-wrap gap-2">
            {gapSkills.map((skill, i) => (
              <span key={i}
                    className="bg-orange-100 text-orange-700 text-xs
                               px-2 py-1 rounded-full">
                {skill}
              </span>
            ))}
          </div>
        </div>

        {/* Mode options */}
        <div className="space-y-3">
          <button
            onClick={() => setMode('guided')}
            className="w-full flex items-center gap-4 p-4 bg-white border
                       border-slate-200 rounded-xl hover:border-blue-400
                       hover:bg-blue-50 transition-all text-left"
          >
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center
                            justify-center flex-shrink-0">
              <BookOpen size={18} className="text-blue-600" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-slate-800">
                🎓 Guide me skill by skill
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                I'll explain each skill and help you decide
              </p>
            </div>
            <ChevronRight size={16} className="text-slate-400" />
          </button>

          <button
            onClick={() => setMode('quick')}
            className="w-full flex items-center gap-4 p-4 bg-white border
                       border-slate-200 rounded-xl hover:border-blue-400
                       hover:bg-blue-50 transition-all text-left"
          >
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center
                            justify-center flex-shrink-0">
              <Zap size={18} className="text-green-600" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-slate-800">
                ⚡ Let me add them myself
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                Show me all missing skills, I'll pick my levels
              </p>
            </div>
            <ChevronRight size={16} className="text-slate-400" />
          </button>

          <button
            onClick={handleSkip}
            className="w-full flex items-center gap-4 p-4 bg-white border
                       border-slate-200 rounded-xl hover:border-slate-300
                       transition-all text-left"
          >
            <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center
                            justify-center flex-shrink-0">
              <SkipForward size={18} className="text-slate-500" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-slate-800">
                ⏭️ Skip, use what I have
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                Continue with my current skills only
              </p>
            </div>
            <ChevronRight size={16} className="text-slate-400" />
          </button>
        </div>
      </div>
    );
  }

  // ── Guided mode UI ──────────────────────────────────────────────────────────
  if (mode === 'guided') {
    return (
      <div className="space-y-4">
        {/* Progress */}
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-800">
            Skill {currentSkillIndex + 1} of {gapSkills.length}
          </h2>
          <span className="text-sm text-slate-500">
            {currentSkill}
          </span>
        </div>

        {/* Progress bar */}
        <div className="w-full bg-slate-100 rounded-full h-1.5">
          <div
            className="bg-blue-600 h-1.5 rounded-full transition-all"
            style={{
              width: `${((currentSkillIndex) / gapSkills.length) * 100}%`
            }}
          ></div>
        </div>

        {/* Ask if they know */}
        {guidedStep === 'ask' && (
          <div className="space-y-4">
            <div className="bg-blue-50 rounded-xl p-5">
              <p className="font-medium text-slate-800">
                Do you have any experience with{' '}
                <span className="text-blue-600 font-bold">{currentSkill}</span>?
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => handleKnowSkill(true)}
                className="py-3 bg-green-600 text-white rounded-xl
                           font-medium hover:bg-green-700"
              >
                ✅ Yes, I know it
              </button>
              <button
                onClick={() => handleKnowSkill(false)}
                className="py-3 bg-slate-100 text-slate-700 rounded-xl
                           font-medium hover:bg-slate-200"
              >
                ❌ No, never used it
              </button>
            </div>
          </div>
        )}

        {/* Select level */}
        {guidedStep === 'level' && (
          <div className="space-y-4">
            <div className="bg-blue-50 rounded-xl p-5">
              <p className="font-medium text-slate-800">
                What is your{' '}
                <span className="text-blue-600 font-bold">{currentSkill}</span>{' '}
                level?
              </p>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {['Beginner', 'Intermediate', 'Advanced'].map(level => (
                <button
                  key={level}
                  onClick={() => handleSelectLevel(level)}
                  className="py-3 bg-white border border-slate-200 text-slate-700
                             rounded-xl font-medium hover:border-blue-400
                             hover:bg-blue-50 transition-all"
                >
                  {level}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Show explanation */}
        {guidedStep === 'explain' && (
          <div className="space-y-4">
            {loadingExplanation ? (
              <LoadingSpinner message="Generating explanation..." />
            ) : explanation ? (
              <div className="space-y-3">
                <div className="bg-blue-50 rounded-xl p-5">
                  <h4 className="font-bold text-slate-800 mb-2">
                    What is {currentSkill}?
                  </h4>
                  <p className="text-sm text-slate-700 mb-3">
                    {explanation.simple_explanation}
                  </p>
                  <div className="bg-white rounded-lg p-3">
                    <p className="text-xs font-medium text-slate-500 mb-1">
                      🌍 REAL WORLD ANALOGY
                    </p>
                    <p className="text-sm text-slate-700">
                      {explanation.real_world_analogy}
                    </p>
                  </div>
                  <p className="text-xs text-slate-500 mt-3">
                    💼 {explanation.why_job_needs_it}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => handleWantToLearn(false)}
                    className="py-3 bg-slate-100 text-slate-700 rounded-xl
                               font-medium hover:bg-slate-200"
                  >
                    Skip for now
                  </button>
                  <button
                    onClick={() => handleWantToLearn(true)}
                    className="py-3 bg-blue-600 text-white rounded-xl
                               font-medium hover:bg-blue-700"
                  >
                    🚀 I want to learn it
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        )}

        {/* Add to resume */}
        {guidedStep === 'add' && (
          <div className="space-y-4">
            <div className="bg-green-50 rounded-xl p-5">
              <p className="font-medium text-slate-800">
                Shall I add{' '}
                <span className="text-green-600 font-bold">{currentSkill}</span>{' '}
                as a Beginner skill on your resume?
              </p>
              <p className="text-xs text-slate-500 mt-2">
                This shows recruiters you're actively upskilling
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => handleAddToResume(false)}
                className="py-3 bg-slate-100 text-slate-700 rounded-xl
                           font-medium hover:bg-slate-200"
              >
                ❌ No, skip it
              </button>
              <button
                onClick={() => handleAddToResume(true)}
                className="py-3 bg-blue-600 text-white rounded-xl
                           font-medium hover:bg-blue-700"
              >
                ✅ Yes, add as Beginner
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── Quick mode UI ───────────────────────────────────────────────────────────
  if (mode === 'quick') {
    return (
      <div className="space-y-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800">
            Add Your Skills
          </h2>
          <p className="text-slate-500 text-sm mt-1">
            Select which skills to add and your proficiency level
          </p>
        </div>

        <div className="space-y-3">
          {quickSelections.map((item, index) => (
            <div key={index}
                 className="bg-white border border-slate-200 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="font-medium text-slate-800">
                  {item.skill_name}
                </span>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={item.add_to_resume}
                    onChange={e => {
                      const updated = [...quickSelections];
                      updated[index].add_to_resume = e.target.checked;
                      setQuickSelections(updated);
                    }}
                    className="w-4 h-4 accent-blue-600"
                  />
                  <span className="text-sm text-slate-600">Add to resume</span>
                </label>
              </div>

              {item.add_to_resume && (
                <div className="flex gap-2">
                  {['Beginner', 'Intermediate', 'Advanced'].map(level => (
                    <button
                      key={level}
                      onClick={() => {
                        const updated = [...quickSelections];
                        updated[index].proficiency_level = level;
                        setQuickSelections(updated);
                      }}
                      className={`flex-1 py-1.5 text-xs rounded-lg font-medium
                                 transition-all
                                 ${item.proficiency_level === level
                                   ? 'bg-blue-600 text-white'
                                   : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                 }`}
                    >
                      {level}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {error && <p className="text-red-500 text-sm">{error}</p>}

        <button
          onClick={handleQuickAdd}
          className="w-full bg-blue-600 text-white py-3 rounded-xl
                     font-medium hover:bg-blue-700 transition-all"
        >
          Save and Continue
        </button>
      </div>
    );
  }
};

export default SkillGap;