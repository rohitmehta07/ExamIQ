import React, { useState, useEffect } from 'react';
import { X, BookOpen, Calendar, Target, Clock, AlertCircle, Sparkles, CheckCircle2 } from 'lucide-react';
import { api } from '../services/api';
import { Subject, SubjectCreatePayload } from '../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (subject: Subject) => void;
  initialSubject?: Subject | null;
}

export const AddSubjectModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onSuccess,
  initialSubject = null,
}) => {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [semester, setSemester] = useState('Semester 5');
  const [examDate, setExamDate] = useState('2026-11-25');
  const [targetMarks, setTargetMarks] = useState<number>(85);
  const [studyHours, setStudyHours] = useState<number>(3);
  const [description, setDescription] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [existingSubjectId, setExistingSubjectId] = useState<number | null>(null);

  useEffect(() => {
    if (initialSubject) {
      setName(initialSubject.name || '');
      setCode(initialSubject.code || '');
      setSemester(initialSubject.semester || 'Semester 5');
      setExamDate(initialSubject.exam_date || '2026-11-25');
      setTargetMarks(initialSubject.target_marks ?? 85);
      setStudyHours(initialSubject.study_hours_per_day ?? 3);
      setDescription(initialSubject.description || '');
    } else {
      setName('');
      setCode('');
      setSemester('Semester 5');
      setExamDate('2026-11-25');
      setTargetMarks(85);
      setStudyHours(3);
      setDescription('');
    }
    setError(null);
    setExistingSubjectId(null);
  }, [initialSubject, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please provide a valid Subject Name');
      return;
    }

    setLoading(true);
    setError(null);
    setExistingSubjectId(null);

    const payload: SubjectCreatePayload = {
      name: name.trim(),
      code: code.trim() ? code.trim().toUpperCase() : undefined,
      semester: semester.trim() || undefined,
      exam_date: examDate.trim() || undefined,
      target_marks: targetMarks ? Number(targetMarks) : 85,
      study_hours_per_day: studyHours ? Number(studyHours) : 3,
      description: description.trim() || undefined,
    };

    try {
      if (initialSubject) {
        const updated = await api.updateSubject(initialSubject.id, payload);
        onSuccess(updated);
        onClose();
      } else {
        const created = await api.createSubject(payload);
        onSuccess(created);
        onClose();
      }
    } catch (err: any) {
      const msg = err.message || 'Failed to save subject';
      setError(msg);
      // Check if duplicate detection offered to open existing
      if (msg.toLowerCase().includes('already have a subject')) {
        // Fetch subjects to find ID
        api.getSubjects().then((subs) => {
          const match = subs.find(
            (s) =>
              s.name.toLowerCase() === name.trim().toLowerCase() ||
              (code.trim() && s.code?.toLowerCase() === code.trim().toLowerCase())
          );
          if (match) setExistingSubjectId(match.id);
        }).catch(() => {});
      }
    } finally {
      setLoading(false);
    }
  };

  const handleOpenExisting = async () => {
    if (!existingSubjectId) return;
    try {
      await api.setActiveSubject(existingSubjectId);
      const sub = await api.getSubject(existingSubjectId);
      onSuccess(sub);
      onClose();
    } catch (err: any) {
      alert(`Could not open existing subject: ${err.message}`);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 text-white relative shrink-0">
          <button
            onClick={onClose}
            className="absolute top-5 right-5 p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center space-x-2.5 mb-1.5">
            <div className="p-2 bg-indigo-500/20 border border-indigo-400/30 rounded-xl text-indigo-300">
              <BookOpen className="w-5 h-5" />
            </div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-300">
              {initialSubject ? 'Subject Management' : 'Academic Curriculum'}
            </span>
          </div>
          <h2 className="text-xl font-bold tracking-tight">
            {initialSubject ? 'Edit Subject Details' : 'Add New Academic Subject'}
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Organize course notes, question papers, and calculate isolated exam progress.
          </p>
        </div>

        {/* Modal Body / Form */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4">
          {error && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex flex-col gap-2">
              <div className="flex items-start space-x-2.5">
                <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                <p className="text-xs font-semibold text-rose-800">{error}</p>
              </div>
              {existingSubjectId && (
                <button
                  type="button"
                  onClick={handleOpenExisting}
                  className="self-start px-3 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition cursor-pointer"
                >
                  Open Existing Subject &rarr;
                </button>
              )}
            </div>
          )}

          {/* Subject Name (Required) */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
              <span>Subject Name <span className="text-rose-500">*</span></span>
              <span className="text-[10px] text-slate-400 font-normal">Required</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Distributed Systems & Cloud Computing"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-600 transition"
            />
          </div>

          {/* Code & Semester in Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">Subject Code (Optional)</label>
              <input
                type="text"
                placeholder="e.g. CS501 / BT14503"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm uppercase focus:outline-hidden focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-600 transition"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">Semester / Academic Year</label>
              <select
                value={semester}
                onChange={(e) => setSemester(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-600 transition"
              >
                <option value="Semester 1">Semester 1</option>
                <option value="Semester 2">Semester 2</option>
                <option value="Semester 3">Semester 3</option>
                <option value="Semester 4">Semester 4</option>
                <option value="Semester 5">Semester 5</option>
                <option value="Semester 6">Semester 6</option>
                <option value="Semester 7">Semester 7</option>
                <option value="Semester 8">Semester 8</option>
              </select>
            </div>
          </div>

          {/* Target Exam Date & Target Marks */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 flex items-center space-x-1.5">
                <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                <span>Target Exam Date</span>
              </label>
              <input
                type="date"
                value={examDate}
                onChange={(e) => setExamDate(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-600 transition"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 flex items-center space-x-1.5">
                <Target className="w-3.5 h-3.5 text-indigo-600" />
                <span>Target Goal (% marks)</span>
              </label>
              <input
                type="number"
                min={40}
                max={100}
                value={targetMarks}
                onChange={(e) => setTargetMarks(Number(e.target.value))}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-600 transition"
              />
            </div>
          </div>

          {/* Daily Study Hours */}
          <div className="space-y-1">
            <div className="flex justify-between items-center">
              <label className="text-xs font-bold text-slate-700 flex items-center space-x-1.5">
                <Clock className="w-3.5 h-3.5 text-indigo-600" />
                <span>Daily Available Study Time</span>
              </label>
              <span className="text-xs font-extrabold text-indigo-600 font-mono">
                {studyHours} hrs/day
              </span>
            </div>
            <input
              type="range"
              min={1}
              max={8}
              step={0.5}
              value={studyHours}
              onChange={(e) => setStudyHours(parseFloat(e.target.value))}
              className="w-full accent-indigo-600 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-400 font-medium">
              <span>1 hr (Light)</span>
              <span>3 hrs (Standard)</span>
              <span>5 hrs (Intensive)</span>
              <span>8 hrs (Cramming)</span>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700">Course Description / Scope (Optional)</label>
            <textarea
              rows={2}
              placeholder="e.g. Focus areas include Raft protocol, MapReduce, CAP theorem, and consistency models."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:outline-hidden focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-600 transition"
            />
          </div>

          {/* Action Buttons */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-5 py-2.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-semibold transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-600/20 transition flex items-center space-x-2 cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <span>Saving...</span>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{initialSubject ? 'Save Changes' : 'Create Subject'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

