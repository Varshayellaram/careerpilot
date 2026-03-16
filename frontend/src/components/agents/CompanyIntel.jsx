import { useState } from 'react';
import { companyAPI } from '../../services/api';
import { useApp } from '../../context/AppContext';
import LoadingSpinner from '../common/LoadingSpinner';
import { Building2, CheckCircle, ExternalLink } from 'lucide-react';

const CompanyIntel = ({ onComplete }) => {
  const { updatePipeline } = useApp();

  const [companyName, setCompanyName] = useState('');
  const [role, setRole] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [intel, setIntel] = useState(null);

  const handleSearch = async () => {
    if (!companyName.trim() || !role.trim()) {
      setError('Please enter both company name and role');
      return;
    }
    setLoading(true);
    setError('');

    try {
      const response = await companyAPI.getIntel(companyName, role);
      const intelData = response.data.intel;

      updatePipeline({ companyIntel: intelData });
      setIntel(intelData);

      setTimeout(() => onComplete({ companyIntel: intelData }), 1000);

    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch company data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingSpinner message="Researching company with AI..." />;
  }

  if (intel) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-green-100 rounded-full flex items-center
                          justify-center">
            <CheckCircle size={20} className="text-green-600" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-800">
              {intel.company_name} — Research Complete
            </h3>
            <p className="text-xs text-slate-500">
              {intel.culture_tone} culture
            </p>
          </div>
        </div>

        {/* Company summary */}
        <div className="bg-slate-50 rounded-xl p-4">
          <p className="text-sm text-slate-700">{intel.company_summary}</p>
        </div>

        {/* Recent highlights */}
        {intel.recent_highlights?.length > 0 && (
          <div>
            <p className="text-xs font-medium text-slate-500 mb-2">
              RECENT HIGHLIGHTS
            </p>
            <ul className="space-y-1">
              {intel.recent_highlights.slice(0, 3).map((h, i) => (
                <li key={i}
                    className="flex items-start gap-2 text-sm text-slate-700">
                  <span className="text-blue-500 mt-0.5">•</span>
                  {h}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Tech stack */}
        {intel.tech_stack?.length > 0 && (
          <div>
            <p className="text-xs font-medium text-slate-500 mb-2">
              TECH STACK
            </p>
            <div className="flex flex-wrap gap-2">
              {intel.tech_stack.map((tech, i) => (
                <span key={i}
                      className="bg-blue-100 text-blue-700 text-xs
                                 px-2 py-1 rounded-full">
                  {tech}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Cover letter hook */}
        {intel.cover_letter_hook && (
          <div className="bg-blue-50 rounded-xl p-4">
            <p className="text-xs font-medium text-blue-600 mb-1">
              💡 COVER LETTER HOOK
            </p>
            <p className="text-sm text-slate-700 italic">
              "{intel.cover_letter_hook}"
            </p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-slate-800">
          Company Research
        </h2>
        <p className="text-slate-500 text-sm mt-1">
          Let AI research the company so your resume speaks their language
        </p>
      </div>

      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">
            Company Name
          </label>
          <input
            type="text"
            value={companyName}
            onChange={e => setCompanyName(e.target.value)}
            placeholder="e.g. Razorpay, Google, Swiggy"
            className="w-full px-4 py-3 border border-slate-200 rounded-xl
                       text-sm focus:outline-none focus:ring-2
                       focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">
            Role Applying For
          </label>
          <input
            type="text"
            value={role}
            onChange={e => setRole(e.target.value)}
            placeholder="e.g. Software Engineer, Data Scientist"
            className="w-full px-4 py-3 border border-slate-200 rounded-xl
                       text-sm focus:outline-none focus:ring-2
                       focus:ring-blue-500"
          />
        </div>
      </div>

      {error && <p className="text-red-500 text-sm">{error}</p>}

      <button
        onClick={handleSearch}
        disabled={!companyName.trim() || !role.trim()}
        className="w-full bg-blue-600 text-white py-3 rounded-xl
                   font-medium hover:bg-blue-700 disabled:opacity-50
                   transition-all flex items-center justify-center gap-2"
      >
        <Building2 size={18} />
        Research Company
      </button>
    </div>
  );
};

export default CompanyIntel;