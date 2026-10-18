import React, { useState } from 'react';
import { X, Upload, FileText, AlertCircle, CheckCircle2 } from 'lucide-react';
import { api } from '../services/api';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  subjectId: number;
  subjectName: string;
  subjectCode?: string;
  onSuccess: () => void;
}

export const UploadDocumentModal: React.FC<Props> = ({
  isOpen,
  onClose,
  subjectId,
  subjectName,
  subjectCode,
  onSuccess,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [category, setCategory] = useState('AUTO_DETECT');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setError('Please select a file to upload.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('subject_id', subjectId.toString());
      formData.append('doc_category', category);

      await api.uploadDocument(formData);
      setFile(null);
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Upload failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 text-white relative shrink-0">
          <button
            onClick={onClose}
            className="absolute top-5 right-5 p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center space-x-2.5 mb-1.5">
            <div className="p-2 bg-indigo-500/20 border border-indigo-400/30 rounded-xl text-indigo-300">
              <Upload className="w-5 h-5" />
            </div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-300">
              Document Ingestion
            </span>
          </div>
          <h2 className="text-xl font-bold tracking-tight">Upload Document</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Target Subject: <span className="text-indigo-300 font-bold">{subjectName}</span> {subjectCode ? `(${subjectCode})` : ''}
          </p>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
          {error && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-start space-x-2.5">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <p className="text-xs font-semibold text-rose-800">{error}</p>
            </div>
          )}

          {/* File Picker */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 block">
              Academic File <span className="text-rose-500">*</span>
            </label>
            <div className="border-2 border-dashed border-slate-200 hover:border-indigo-400 rounded-2xl p-6 text-center bg-slate-50/50 transition">
              <input
                type="file"
                id="modal-file-upload"
                accept=".pdf,.docx,.pptx,.png,.jpg,.jpeg,.txt"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    setFile(e.target.files[0]);
                    setError(null);
                  }
                }}
                className="hidden"
              />
              <label htmlFor="modal-file-upload" className="cursor-pointer block space-y-2">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
                  <FileText className="w-5 h-5" />
                </div>
                {file ? (
                  <div>
                    <p className="text-xs font-bold text-indigo-700 truncate max-w-xs mx-auto">{file.name}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">{(file.size / 1024).toFixed(1)} KB &bull; Click to change</p>
                  </div>
                ) : (
                  <div>
                    <span className="text-xs font-bold text-indigo-600 hover:underline">Choose a file</span>
                    <span className="text-xs text-slate-500"> or drag and drop</span>
                    <p className="text-[10px] text-slate-400 mt-1">PDF, DOCX, PPTX, PNG, JPG, or TXT</p>
                  </div>
                )}
              </label>
            </div>
          </div>

          {/* Document Category */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 block">Document Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-600 transition"
            >
              <option value="AUTO_DETECT">Auto Detect (AI Classification)</option>
              <option value="LECTURE_NOTES">Lecture Notes</option>
              <option value="TEACHER_NOTES">Teacher Notes</option>
              <option value="HANDWRITTEN_NOTES">Handwritten Notes</option>
              <option value="SYLLABUS">Syllabus</option>
              <option value="PYQ">PYQ Collection</option>
              <option value="QUESTION_PAPER">Question Paper</option>
              <option value="MARKING_SCHEME">Marking Scheme</option>
              <option value="EVALUATED_ANSWER">Evaluated Answer</option>
              <option value="REFERENCE">Reference / Textbook</option>
              <option value="OTHER">Other</option>
            </select>
          </div>

          {/* Action Buttons */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-semibold transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !file}
              className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-600/20 transition flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <span>Uploading...</span>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Upload &amp; Process</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
