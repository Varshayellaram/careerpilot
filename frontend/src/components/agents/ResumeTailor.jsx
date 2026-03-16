import { useState } from 'react';
import { resumeAPI, tailorAPI } from '../../services/api';
import { useApp } from '../../context/AppContext';
import LoadingSpinner from '../common/LoadingSpinner';
import { Wand2, CheckCircle, Download, FileText } from 'lucide-react';

const ResumeTailor = ({ onComplete }) => {
  const { pipelineState, updatePipeline } = useApp();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [tailored, setTailored] = useState(null);
  const [downloading, setDownloading] = useState(false);

  const handleTailor = async () => {
    setLoading(true);
    setError('');

    try {
      // Step 1 — Extract structured data from resume
      const structuredResponse = await resumeAPI.extractStructured(
        pipelineState.resumeId
      );
      const structuredId = structuredResponse.data.structured_id;

      updatePipeline({ structuredId });

      // Step 2 — Tailor resume
      const tailorResponse = await tailorAPI.tailor({
        structured_id: structuredId,
        resume_id: pipelineState.resumeId,
        jd_analysis: pipelineState.jdAnalysis,
        company_intel: pipelineState.companyIntel,
        added_skills: pipelineState.addedSkills || []
      });

      const tailoredData = tailorResponse.data;
      updatePipeline({ tailoredId: tailoredData.tailored_id });
      setTailored(tailoredData);

      onComplete({ tailoredId: tailoredData.tailored_id });

    } catch (err) {
      setError(err.response?.data?.message || 'Tailoring failed');
    } finally {
      setLoading(false);
    }
  };

  // Download PDF
  const handleDownloadPDF = async () => {
    setDownloading(true);
    try {
      const response = await tailorAPI.generatePDF(
        pipelineState.tailoredId
      );
      const base64 = response.data.pdf_base64;

      // Decode and download
      const byteCharacters = atob(base64);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `tailored_resume.pdf`;
      link.click();
      URL.revokeObjectURL(url);

    } catch (err) {
      setError('Failed to download PDF');
    } finally {
      setDownloading(false);
    }
  };

  // Download plain text
  const handleDownloadText = async () => {
    try {
      const response = await tailorAPI.generateText(
        pipelineState.tailoredId
      );
      const text = response.data.plain_text;

      const blob = new Blob([text], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'tailored_resume.txt';
      link.click();
      URL.revokeObjectURL(url);

    } catch (err) {
      setError('Failed to download text');
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <LoadingSpinner message="AI is tailoring your resume..." />
        <div className="bg-blue-50 rounded-xl p-4">
          <p className="text-sm text-blue-700 text-center">
            Applying 3-layer tailoring: Keywords → Impact → Culture
          </p>
        </div>
      </div>
    );
  }

  if (tailored) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-green-100 rounded-full flex items-center
                          justify-center">
            <CheckCircle size={20} className="text-green-600" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-800">
              Resume Tailored Successfully
            </h3>
            <p className="text-sm text-slate-500">
              {tailored.changes?.length || 0} improvements made
            </p>
          </div>
        </div>

        {/* Tailoring summary */}
        {tailored.tailoring_summary && (
          <div className="bg-blue-50 rounded-xl p-4">
            <p className="text-sm text-slate-700">
              {tailored.tailoring_summary}
            </p>
          </div>
        )}

        {/* Changes list */}
        {tailored.changes?.length > 0 && (
          <div className="space-y-2 max-h-48 overflow-y-auto">
            <p className="text-xs font-medium text-slate-500">
              CHANGES MADE
            </p>
            {tailored.changes.slice(0, 5).map((change, i) => (
              <div key={i}
                   className="bg-white border border-slate-100 rounded-lg p-3">
                <p className="text-xs font-medium text-blue-600 mb-1">
                  {change.section?.toUpperCase()}
                </p>
                <p className="text-xs text-slate-500">{change.reason}</p>
              </div>
            ))}
          </div>
        )}

        {/* Download buttons */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={handleDownloadPDF}
            disabled={downloading}
            className="flex items-center justify-center gap-2 py-3
                       bg-blue-600 text-white rounded-xl font-medium
                       hover:bg-blue-700 disabled:opacity-50 transition-all"
          >
            <Download size={16} />
            {downloading ? 'Generating...' : 'Download PDF'}
          </button>
          <button
            onClick={handleDownloadText}
            className="flex items-center justify-center gap-2 py-3
                       bg-white border border-slate-200 text-slate-700
                       rounded-xl font-medium hover:bg-slate-50 transition-all"
          >
            <FileText size={16} />
            Plain Text
          </button>
        </div>

        {error && <p className="text-red-500 text-sm">{error}</p>}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-slate-800">
          Tailor Your Resume
        </h2>
        <p className="text-slate-500 text-sm mt-1">
          AI will apply 3-layer tailoring using all the data collected
        </p>
      </div>

      {/* Summary of what will happen */}
      <div className="space-y-2">
        {[
          { layer: 'Layer 1', title: 'Keyword Injection', desc: 'ATS keywords added naturally' },
          { layer: 'Layer 2', title: 'Impact Rewriting', desc: 'Bullets rewritten with strong verbs' },
          { layer: 'Layer 3', title: 'Culture Matching', desc: `Tone matched to ${pipelineState.companyIntel?.culture_tone || 'company'} culture` }
        ].map((item, i) => (
          <div key={i}
               className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
            <span className="text-xs font-bold text-blue-600 w-14">
              {item.layer}
            </span>
            <div>
              <p className="text-sm font-medium text-slate-800">{item.title}</p>
              <p className="text-xs text-slate-500">{item.desc}</p>
            </div>
          </div>
        ))}
      </div>

      {error && <p className="text-red-500 text-sm">{error}</p>}

      <button
        onClick={handleTailor}
        className="w-full bg-blue-600 text-white py-3 rounded-xl
                   font-medium hover:bg-blue-700 transition-all
                   flex items-center justify-center gap-2"
      >
        <Wand2 size={18} />
        Tailor My Resume
      </button>
    </div>
  );
};

export default ResumeTailor;