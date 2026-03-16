import { useState } from 'react';
import { useApp } from '../context/AppContext';
import ProgressBar from '../components/common/ProgressBar';
import ResumeUpload from '../components/resume/ResumeUpload';
import JDAnalyzer from '../components/agents/JDAnalyzer';
import SkillGap from '../components/agents/SkillGap';
import CompanyIntel from '../components/agents/CompanyIntel';
import ResumeTailor from '../components/agents/ResumeTailor';
import ATSScorer from '../components/agents/ATSScorer';
import { RotateCcw } from 'lucide-react';

// Pipeline steps configuration
const STEPS = [
  { label: 'Upload', component: ResumeUpload },
  { label: 'JD Analysis', component: JDAnalyzer },
  { label: 'Skill Gap', component: SkillGap },
  { label: 'Company', component: CompanyIntel },
  { label: 'Tailor', component: ResumeTailor },
  { label: 'ATS Score', component: ATSScorer }
];

const PipelinePage = () => {
  const { pipelineState, markStepComplete, resetPipeline } = useApp();
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState([]);

  const handleStepComplete = (stepIndex, data) => {
    // Mark step as complete
    setCompletedSteps(prev => [...new Set([...prev, stepIndex])]);
    markStepComplete(stepIndex);

    // Move to next step
    if (stepIndex < STEPS.length - 1) {
      setCurrentStep(stepIndex + 1);
    }
  };

  const handleReset = () => {
    resetPipeline();
    setCurrentStep(0);
    setCompletedSteps([]);
  };

  // Get current step component
  const CurrentComponent = STEPS[currentStep].component;

  return (
    <div className="max-w-2xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">
            Tailor Your Resume
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            5 AI agents working together to optimize your resume
          </p>
        </div>
        <button
          onClick={handleReset}
          className="flex items-center gap-2 text-sm text-slate-500
                     hover:text-slate-700 px-3 py-2 rounded-lg
                     hover:bg-slate-100 transition-all"
        >
          <RotateCcw size={14} />
          Start over
        </button>
      </div>

      {/* Progress bar */}
      <ProgressBar
        steps={STEPS.map(s => s.label)}
        currentStep={currentStep}
        completedSteps={completedSteps}
      />

      {/* Step content card */}
      <div className="mt-6 bg-white rounded-2xl border border-slate-200 p-6
                      shadow-sm">
        <CurrentComponent
          onComplete={(data) => handleStepComplete(currentStep, data)}
        />
      </div>

      {/* Step navigation — allow going back */}
      {currentStep > 0 && currentStep < STEPS.length - 1 && (
        <div className="mt-4 flex justify-start">
          <button
            onClick={() => setCurrentStep(prev => prev - 1)}
            className="text-sm text-slate-500 hover:text-slate-700
                       flex items-center gap-1"
          >
            ← Back to {STEPS[currentStep - 1].label}
          </button>
        </div>
      )}
    </div>
  );
};

export default PipelinePage;