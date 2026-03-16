import { useState, useRef } from 'react';
import { resumeAPI } from '../../services/api';
import { useApp } from '../../context/AppContext';
import { Upload, FileText, CheckCircle, X } from 'lucide-react';

const ResumeUpload = ({ onComplete }) => {
  const { updatePipeline } = useApp();
  const fileInputRef = useRef(null);

  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [uploaded, setUploaded] = useState(false);

  // Handle file selection
  const handleFileSelect = (e) => {
    const selected = e.target.files[0];
    if (!selected) return;

    // Validate PDF only
    if (selected.type !== 'application/pdf') {
      setError('Only PDF files are accepted');
      return;
    }

    // Validate size (max 5MB)
    if (selected.size > 5 * 1024 * 1024) {
      setError('File size must be under 5MB');
      return;
    }

    setFile(selected);
    setError('');
  };

  // Handle drag and drop
  const handleDrop = (e) => {
    e.preventDefault();
    const dropped = e.dataTransfer.files[0];
    if (dropped) {
      if (dropped.type !== 'application/pdf') {
        setError('Only PDF files are accepted');
        return;
      }
      setFile(dropped);
      setError('');
    }
  };

  const handleDragOver = (e) => e.preventDefault();

  // Upload file to backend
  const handleUpload = async () => {
    if (!file) return;
    setLoading(true);
    setError('');

    try {
      const response = await resumeAPI.upload(file);
      const data = response.data;

      // Save resume data to global pipeline state
      updatePipeline({
        resumeId: data.resume_id,
        resumeFilename: file.name,
        personalInfo: data.personal_info,
        sectionsDetected: data.sections_detected
      });

      setUploaded(true);

      // Move to next step after short delay
      setTimeout(() => onComplete({
        resumeId: data.resume_id,
        personalInfo: data.personal_info
      }), 800);

    } catch (err) {
      setError(err.response?.data?.message || 'Upload failed');
    } finally {
      setLoading(false);
    }
  };

  // If already uploaded show success
  if (uploaded) {
    return (
      <div className="text-center py-8">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center
                        justify-center mx-auto mb-4">
          <CheckCircle size={32} className="text-green-600" />
        </div>
        <h3 className="text-lg font-semibold text-slate-800">
          Resume uploaded successfully
        </h3>
        <p className="text-slate-500 text-sm mt-1">{file?.name}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-slate-800">
          Upload Your Resume
        </h2>
        <p className="text-slate-500 text-sm mt-1">
          Upload your current resume PDF to get started
        </p>
      </div>

      {/* Drop zone */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onClick={() => fileInputRef.current?.click()}
        className="border-2 border-dashed border-slate-200 rounded-2xl p-10
                   text-center cursor-pointer hover:border-blue-400
                   hover:bg-blue-50 transition-all"
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf"
          onChange={handleFileSelect}
          className="hidden"
        />

        {file ? (
          <div className="flex items-center justify-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center
                            justify-center">
              <FileText size={20} className="text-blue-600" />
            </div>
            <div className="text-left">
              <p className="font-medium text-slate-800 text-sm">{file.name}</p>
              <p className="text-xs text-slate-500">
                {(file.size / 1024).toFixed(1)} KB
              </p>
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); setFile(null); }}
              className="ml-2 text-slate-400 hover:text-red-500"
            >
              <X size={16} />
            </button>
          </div>
        ) : (
          <div>
            <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center
                            justify-center mx-auto mb-3">
              <Upload size={22} className="text-slate-400" />
            </div>
            <p className="text-slate-600 font-medium">
              Drop your resume here
            </p>
            <p className="text-slate-400 text-sm mt-1">
              or click to browse — PDF only, max 5MB
            </p>
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <p className="text-red-500 text-sm">{error}</p>
      )}

      {/* Upload button */}
      {file && (
        <button
          onClick={handleUpload}
          disabled={loading}
          className="w-full bg-blue-600 text-white py-3 rounded-xl
                     font-medium hover:bg-blue-700 disabled:opacity-50
                     transition-all"
        >
          {loading ? 'Uploading and extracting...' : 'Upload Resume'}
        </button>
      )}
    </div>
  );
};

export default ResumeUpload;