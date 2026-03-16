import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import {
  Zap, Target, ArrowRight,
  FileText, TrendingUp, CheckCircle
} from 'lucide-react';

const Dashboard = () => {
  const navigate = useNavigate();
  const { user } = useApp();

  // Feature cards shown on dashboard
  const features = [
    {
      icon: Zap,
      title: 'Tailor My Resume',
      description: 'Run all 5 AI agents to tailor your resume for a specific job',
      action: () => navigate('/pipeline'),
      color: 'blue',
      primary: true
    },
    {
      icon: Target,
      title: 'ATS Score Checker',
      description: 'Instantly check how well your resume matches a job description',
      action: () => navigate('/ats'),
      color: 'green',
      primary: false
    }
  ];

  // How it works steps
  const steps = [
    { number: '01', title: 'Upload Resume', desc: 'Upload your PDF resume' },
    { number: '02', title: 'Paste Job Description', desc: 'Add the JD you want to apply for' },
    { number: '03', title: 'AI Analyzes', desc: '5 agents work together to tailor your resume' },
    { number: '04', title: 'Download', desc: 'Get your tailored resume and ATS score' }
  ];

  return (
    <div className="max-w-5xl mx-auto">

      {/* Welcome header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-800">
          Welcome back, {user?.name?.split(' ')[0]} 👋
        </h1>
        <p className="text-slate-500 mt-2">
          Ready to tailor your resume for your next opportunity?
        </p>
      </div>

      {/* Main action cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
        {features.map((feature, index) => {
          const Icon = feature.icon;
          return (
            <button
              key={index}
              onClick={feature.action}
              className={`p-6 rounded-2xl text-left transition-all
                         hover:shadow-md hover:-translate-y-0.5
                         ${feature.primary
                           ? 'bg-blue-600 text-white'
                           : 'bg-white border border-slate-200 text-slate-800'
                         }`}
            >
              <div className={`w-12 h-12 rounded-xl flex items-center
                              justify-center mb-4
                              ${feature.primary
                                ? 'bg-blue-500'
                                : 'bg-blue-50'
                              }`}>
                <Icon size={22}
                      className={feature.primary ? 'text-white' : 'text-blue-600'} />
              </div>
              <h3 className="text-lg font-bold mb-2">{feature.title}</h3>
              <p className={`text-sm mb-4
                            ${feature.primary
                              ? 'text-blue-100'
                              : 'text-slate-500'
                            }`}>
                {feature.description}
              </p>
              <div className={`flex items-center gap-2 text-sm font-medium
                              ${feature.primary
                                ? 'text-blue-100'
                                : 'text-blue-600'
                              }`}>
                Get started
                <ArrowRight size={16} />
              </div>
            </button>
          );
        })}
      </div>

      {/* How it works */}
      <div className="bg-white rounded-2xl border border-slate-200 p-8">
        <h2 className="text-lg font-bold text-slate-800 mb-6">
          How CareerPilot works
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {steps.map((step, index) => (
            <div key={index} className="text-center">
              <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center
                              justify-center mx-auto mb-3">
                <span className="text-blue-600 font-bold text-sm">
                  {step.number}
                </span>
              </div>
              <h4 className="font-semibold text-slate-800 text-sm mb-1">
                {step.title}
              </h4>
              <p className="text-xs text-slate-500">{step.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;