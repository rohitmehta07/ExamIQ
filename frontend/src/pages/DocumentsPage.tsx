import React, { useState, useEffect } from 'react';
import {
  Upload, FileText, CheckCircle2, Clock, AlertTriangle, RefreshCw,
  Trash2, Eye, ShieldCheck, Sparkles, Filter, AlertCircle, Plus, BookOpen,
  Calendar, Layers, CheckCircle
} from 'lucide-react';
import { api } from '../services/api';
import { DocumentItem, Subject } from '../types';
import { AddSubjectModal } from '../components/AddSubjectModal';

interface Props {
  activeSubject?: Subject | null;
  onSubjectChange?: (subjectId: number) => void;
  onDocumentCountChange?: () => void;
}

export const DocumentsPage: React.FC<Props> = ({
  activeSubject,
  onSubjectChange,
  onDocumentCountChange,
}) => {
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState<number | null>(activeSubject?.id || null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('AUTO_DETECT');
  const [fileToUpload, setFileToUpload] = useState<File | null>(null);
  const [isAddSubjectOpen, setIsAddSubjectOpen] = useState(false);
  const [uploadSuccessMsg, setUploadSuccessMsg] = useState<string | null>(null);

  // Sync when activeSubject changes from outside
  useEffect(() => {
    if (activeSubject?.id && activeSubject.id !== selectedSubjectId) {
      setSelectedSubjectId(activeSubject.id);
    }
  }, [activeSubject]);

  useEffect(() => {
    loadSubjectsAndDocs();
  }, [selectedSubjectId]);

  const loadSubjectsAndDocs = async () => {
    setLoading(true);
    try {
      const userSubs = await api.getSubjects().catch(() => []);
      setSubjects(userSubs);

      let targetId = selectedSubjectId;
      if (!targetId && userSubs.length > 0) {
        targetId = userSubs[0].id;
        setSelectedSubjectId(targetId);
      }

      if (targetId) {
        const docs = await api.getDocuments(targetId);
        setDocuments(docs);
      } else {
        setDocuments([]);
      }
    } catch (err) {
      console.error('Failed to load documents:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubjectSelect = (subId: number) => {
    setSelectedSubjectId(subId);
    if (onSubjectChange) onSubjectChange(subId);
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fileToUpload) {
      alert('Please select a file to upload.');
      return;
    }
    if (!selectedSubjectId) {
      alert('Please select a target subject for this document.');
      return;
    }

    setUploading(true);
    setUploadSuccessMsg(null);
    try {
      const formData = new FormData();
      formData.append('file', fileToUpload);
      formData.append('subject_id', selectedSubjectId.toString());
      formData.append('doc_category', selectedCategory);

      const created = await api.uploadDocument(formData);
      setFileToUpload(null);
      setUploadSuccessMsg(`"${created.filename}" uploaded successfully! Processing text and semantic index.`);

      // Immediately refresh documents for this subject
      const updatedDocs = await api.getDocuments(selectedSubjectId);
      setDocuments(updatedDocs);
      if (onDocumentCountChange) onDocumentCountChange();

      // Poll once after 2 seconds to update classification & OCR results
      setTimeout(async () => {
        if (selectedSubjectId) {
          const freshDocs = await api.getDocuments(selectedSubjectId);
          setDocuments(freshDocs);
          if (onDocumentCountChange) onDocumentCountChange();
        }
      }, 2000);
    } catch (err: any) {
      alert(`Upload failed: ${err.message}`);
    } finally {
      setUploading(false);
    }
  };

  const handleReprocess = async (docId: number) => {
    try {
      await api.processDocument(docId);
      if (selectedSubjectId) {
        const fresh = await api.getDocuments(selectedSubjectId);
        setDocuments(fresh);
      }
    } catch (err: any) {
      alert(`Reprocessing failed: ${err.message}`);
    }
  };

  const handleDelete = async (docId: number, docName: string) => {
    if (!window.confirm(`Are you sure you want to delete "${docName}"? This will remove its text chunks and embeddings from search results.`)) {
      return;
    }
    try {
      await api.deleteDocument(docId);
      if (selectedSubjectId) {
        const fresh = await api.getDocuments(selectedSubjectId);
        setDocuments(fresh);
        if (onDocumentCountChange) onDocumentCountChange();
      }
    } catch (err: any) {
      alert(`Delete failed: ${err.message}`);
    }
  };

  const currentSubject = subjects.find((s) => s.id === selectedSubjectId);

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      {/* Header & Subject Context */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Academic Documents</h1>
            {currentSubject && (
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                {currentSubject.code || currentSubject.name}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 max-w-2xl leading-relaxed mt-1">
            Subject-isolated document repository. Upload course notes, syllabus, and past exam papers to power your study plan and semantic retrieval.
          </p>
        </div>

        {/* Subject Switcher */}
        {subjects.length > 0 && (
          <div className="flex items-center space-x-2 self-start md:self-auto">
            <span className="text-xs font-bold text-slate-400">Subject:</span>
            <select
              value={selectedSubjectId || ''}
              onChange={(e) => handleSubjectSelect(Number(e.target.value))}
              className="px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800 shadow-xs focus:outline-hidden focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-600 transition"
            >
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} {s.code ? `(${s.code})` : ''}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Upload Box */}
      {subjects.length === 0 ? (
        <div className="bg-white p-10 rounded-3xl border border-slate-200 text-center space-y-4 max-w-xl mx-auto shadow-xs">
          <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
            <BookOpen className="w-7 h-7" />
          </div>
          <h3 className="text-lg font-bold text-slate-900">Add a subject first</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Uploaded materials must be assigned to an enrolled subject in your curriculum to isolate your study tasks and progress.
          </p>
          <button
            onClick={() => setIsAddSubjectOpen(true)}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-600/20 transition inline-flex items-center space-x-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>+ Add Your First Subject</span>
          </button>
        </div>
      ) : (
        <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
              <Upload className="w-4 h-4 text-indigo-600" />
              <span>Upload Document to {currentSubject?.name || 'Selected Subject'}</span>
            </h3>
            {currentSubject?.code && (
              <span className="text-[11px] font-extrabold uppercase px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                {currentSubject.code}
              </span>
            )}
          </div>

          {uploadSuccessMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center space-x-2 text-xs font-semibold text-emerald-800 animate-in fade-in">
              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{uploadSuccessMsg}</span>
            </div>
          )}

          <form onSubmit={handleUpload} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div className="space-y-1.5 md:col-span-1">
              <label className="text-xs font-bold text-slate-700 block">Target Subject</label>
              <select
                value={selectedSubjectId || ''}
                onChange={(e) => handleSubjectSelect(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800"
              >
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} {s.code ? `(${s.code})` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5 md:col-span-1">
              <label className="text-xs font-bold text-slate-700 block">Select File (PDF, DOCX, TXT, Image)</label>
              <input
                type="file"
                accept=".pdf,.docx,.pptx,.png,.jpg,.jpeg,.txt"
                onChange={(e) => setFileToUpload(e.target.files ? e.target.files[0] : null)}
                className="w-full text-xs text-slate-600 file:mr-2 file:py-1.5 file:px-2.5 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer"
              />
            </div>

            <div className="space-y-1.5 md:col-span-1">
              <label className="text-xs font-bold text-slate-700 block">Category</label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800"
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

            <div>
              <button
                type="submit"
                disabled={uploading || !fileToUpload}
                className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-600/20 transition disabled:opacity-50 cursor-pointer flex items-center justify-center space-x-1.5"
              >
                {uploading ? (
                  <span>Processing...</span>
                ) : (
                  <>
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload to Subject</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Documents Table */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Documents for {currentSubject?.name || 'Selected Subject'}
            </h3>
            <span className="text-[11px] text-slate-400">
              {documents.length} document{documents.length === 1 ? '' : 's'} assigned to this subject
            </span>
          </div>

          <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg">
            Subject ID: {selectedSubjectId}
          </span>
        </div>

        {documents.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <FileText className="w-10 h-10 text-slate-300 mx-auto" />
            <h4 className="text-sm font-bold text-slate-800">No documents in this subject yet</h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Upload notes or past question papers above to populate this subject's syllabus and knowledge base.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                <tr>
                  <th className="p-3.5">Filename</th>
                  <th className="p-3.5">Upload Date</th>
                  <th className="p-3.5">Type</th>
                  <th className="p-3.5">Category</th>
                  <th className="p-3.5">Processing Status</th>
                  <th className="p-3.5">Indexing</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {documents.map((doc) => {
                  const uploadDate = doc.created_at ? new Date(doc.created_at).toLocaleDateString() : 'Recent';
                  const fileExt = (doc.file_type || doc.filename.split('.').pop() || 'PDF').toUpperCase();

                  return (
                    <tr key={doc.id} className="hover:bg-slate-50/60 transition">
                      <td className="p-3.5 font-semibold text-slate-800">
                        <div className="flex items-center space-x-2.5">
                          <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg shrink-0">
                            <FileText className="w-4 h-4" />
                          </div>
                          <span className="truncate max-w-xs">{doc.filename}</span>
                        </div>
                      </td>
                      <td className="p-3.5 text-slate-500 font-medium">
                        {uploadDate}
                      </td>
                      <td className="p-3.5">
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-extrabold text-[10px]">
                          {fileExt}
                        </span>
                      </td>
                      <td className="p-3.5">
                        <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 font-medium text-[10px]">
                          {doc.doc_category.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="p-3.5">
                        {doc.status === 'PROCESSED' ? (
                          <span className="text-emerald-600 font-semibold flex items-center">
                            <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                            Processed ({doc.page_count} pg)
                          </span>
                        ) : doc.status === 'FAILED' ? (
                          <span className="text-rose-600 font-semibold flex items-center">
                            <AlertTriangle className="w-3.5 h-3.5 mr-1" />
                            Failed
                          </span>
                        ) : (
                          <span className="text-amber-600 font-semibold flex items-center">
                            <Clock className="w-3.5 h-3.5 mr-1" />
                            {doc.status}
                          </span>
                        )}
                      </td>
                      <td className="p-3.5">
                        {doc.indexing_status === 'INDEXED' || doc.status === 'PROCESSED' ? (
                          <span className="inline-flex items-center text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                            Indexed (SVD Vector)
                          </span>
                        ) : doc.indexing_status === 'FAILED' ? (
                          <span className="inline-flex items-center text-[10px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                            Failed
                          </span>
                        ) : (
                          <span className="inline-flex items-center text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                            Pending
                          </span>
                        )}
                      </td>
                      <td className="p-3.5 text-right space-x-1.5">
                        <button
                          onClick={() => handleReprocess(doc.id)}
                          title="Reprocess Document"
                          className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(doc.id, doc.filename)}
                          title="Delete Document"
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <AddSubjectModal
        isOpen={isAddSubjectOpen}
        onClose={() => setIsAddSubjectOpen(false)}
        onSuccess={() => {
          loadSubjectsAndDocs();
        }}
      />
    </div>
  );
};
