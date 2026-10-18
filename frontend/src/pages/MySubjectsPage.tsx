import React, { useState, useEffect } from 'react';
import {
  BookOpen, Plus, Calendar, Clock, CheckCircle, AlertCircle,
  FileText, Target, ArrowRight, Trash2, Edit3, Filter,
  Layers, ChevronRight, Sparkles, BarChart3, HelpCircle, Upload
} from 'lucide-react';
import { api } from '../services/api';
import { SubjectProgressItem, SubjectOverviewResponse, Subject } from '../types';
import { AddSubjectModal } from '../components/AddSubjectModal';
import { UploadDocumentModal } from '../components/UploadDocumentModal';

interface Props {
  onNavigate: (tab: string) => void;
  onSubjectSelected?: (subjectId: number) => void;
}

export const MySubjectsPage: React.FC<Props> = ({ onNavigate, onSubjectSelected }) => {
  const [overview, setOverview] = useState<SubjectOverviewResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'ALL' | 'UPCOMING' | 'IN_PROGRESS' | 'NOT_STARTED' | 'COMPLETED'>('ALL');
  const [sortBy, setSortBy] = useState<'EXAM_DATE' | 'NAME' | 'PROGRESS'>('EXAM_DATE');

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [subjectToEdit, setSubjectToEdit] = useState<Subject | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  // Dedicated upload document modal state for subject-wise upload
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploadModalSubject, setUploadModalSubject] = useState<{ id: number; name: string; code?: string } | null>(null);

  useEffect(() => {
    loadOverview();
  }, []);

  const loadOverview = async () => {
    setLoading(true);
    try {
      const data = await api.getSubjectsOverview();
      setOverview(data);
    } catch (err) {
      console.error('Failed to load subjects overview:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenSubject = async (subjectId: number) => {
    try {
      await api.setActiveSubject(subjectId);
      if (onSubjectSelected) onSubjectSelected(subjectId);
      onNavigate('dashboard');
    } catch (err: any) {
      console.error('Failed to switch subject:', err);
      onNavigate('dashboard');
    }
  };

  const handleViewStudyPlan = async (subjectId: number) => {
    try {
      await api.setActiveSubject(subjectId);
      if (onSubjectSelected) onSubjectSelected(subjectId);
      onNavigate('plan');
    } catch {
      onNavigate('plan');
    }
  };

  const handleEditClick = async (item: SubjectProgressItem) => {
    try {
      const fullSub = await api.getSubject(item.subject_id);
      setSubjectToEdit(fullSub);
      setIsAddModalOpen(true);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteSubject = async (subjectId: number, subjectName: string) => {
    if (!window.confirm(`Are you sure you want to delete "${subjectName}"? This will permanently delete its study plan, documents, and progress data for your account.`)) {
      return;
    }

    try {
      setDeletingId(subjectId);
      await api.deleteSubject(subjectId);
      await loadOverview();
    } catch (err: any) {
      alert(`Failed to delete subject: ${err.message}`);
    } finally {
      setDeletingId(null);
    }
  };

  // Filter subjects
  const subjects = overview?.subjects || [];
  const filtered = subjects.filter((s) => {
    if (filter === 'UPCOMING') return s.days_remaining !== null && s.days_remaining !== undefined && s.days_remaining >= 0;
    if (filter === 'IN_PROGRESS') return s.progress_status === 'In progress';
    if (filter === 'NOT_STARTED') return s.progress_status === 'Not started' || s.progress_status === 'Not enough data';
    if (filter === 'COMPLETED') return s.progress_status === 'Completed' || (s.preparation_progress != null && s.preparation_progress >= 100);
    return true;
  });

  // Sort subjects
  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === 'NAME') {
      return a.subject_name.localeCompare(b.subject_name);
    }
    if (sortBy === 'PROGRESS') {
      const pA = a.preparation_progress ?? -1;
      const pB = b.preparation_progress ?? -1;
      return pB - pA;
    }
    // Default EXAM_DATE
    if (a.days_remaining === null || a.days_remaining === undefined) return 1;
    if (b.days_remaining === null || b.days_remaining === undefined) return -1;
    return a.days_remaining - b.days_remaining;
  });

  const summary = overview?.summary || {
    total_subjects: 0,
    upcoming_exams: 0,
    completed_tasks: 0,
    overall_progress: null
  };

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
              My Subjects
            </h1>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700">
              {summary.total_subjects} Enrolled
            </span>
          </div>
          <p className="text-xs md:text-sm text-slate-500 mt-1">
            Track your preparation and progress across all your subjects.
          </p>
        </div>

        <button
          onClick={() => {
            setSubjectToEdit(null);
            setIsAddModalOpen(true);
          }}
          className="self-start md:self-auto px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/20 transition flex items-center space-x-2 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>+ Add Subject</span>
        </button>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Total Subjects</span>
            <span className="text-3xl font-extrabold text-slate-900 font-mono">{summary.total_subjects}</span>
            <span className="text-[11px] text-slate-500 mt-1 block">Active course portfolios</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
            <BookOpen className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Upcoming Exams</span>
            <span className="text-3xl font-extrabold text-amber-600 font-mono">{summary.upcoming_exams}</span>
            <span className="text-[11px] text-slate-500 mt-1 block">Scheduled on calendar</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <Calendar className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Completed Tasks</span>
            <span className="text-3xl font-extrabold text-emerald-600 font-mono">{summary.completed_tasks}</span>
            <span className="text-[11px] text-slate-500 mt-1 block">Study roadmap milestones</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <CheckCircle className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Overall Progress</span>
            <div className="flex items-baseline space-x-1.5">
              {summary.overall_progress !== null ? (
                <>
                  <span className="text-3xl font-extrabold text-indigo-600 font-mono">{summary.overall_progress}%</span>
                  <span className="text-[10px] text-emerald-600 font-semibold">Tracked</span>
                </>
              ) : (
                <span className="text-sm font-bold text-slate-400">Not enough data yet</span>
              )}
            </div>
            <span className="text-[11px] text-slate-500 mt-1 block">
              {summary.overall_progress !== null ? 'Aggregated across all study tasks' : 'Add subjects & create study plan'}
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-violet-50 text-violet-600 flex items-center justify-center">
            <BarChart3 className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Controls Bar: Filter & Sort */}
      {summary.total_subjects > 0 && (
        <div className="bg-white p-4 rounded-2xl border border-slate-200 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center space-x-1.5 overflow-x-auto">
            <span className="text-xs font-bold text-slate-400 mr-2 flex items-center">
              <Filter className="w-3.5 h-3.5 mr-1" />
              Filter:
            </span>
            {(['ALL', 'UPCOMING', 'IN_PROGRESS', 'NOT_STARTED', 'COMPLETED'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                  filter === f
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {f === 'ALL' && 'All Subjects'}
                {f === 'UPCOMING' && 'Upcoming Exams'}
                {f === 'IN_PROGRESS' && 'In Progress'}
                {f === 'NOT_STARTED' && 'Not Started'}
                {f === 'COMPLETED' && 'Completed'}
              </button>
            ))}
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-xs font-bold text-slate-400">Sort by:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-3 py-1.5 bg-slate-100 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-hidden"
            >
              <option value="EXAM_DATE">Exam Date</option>
              <option value="NAME">Subject Name</option>
              <option value="PROGRESS">Preparation Progress</option>
            </select>
          </div>
        </div>
      )}

      {/* Main Subjects Grid / Empty State */}
      {summary.total_subjects === 0 ? (
        <div className="bg-white rounded-3xl p-12 border border-slate-200/90 text-center space-y-5 shadow-xs max-w-2xl mx-auto">
          <div className="w-16 h-16 rounded-3xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center mx-auto shadow-inner">
            <BookOpen className="w-8 h-8" />
          </div>
          <div className="space-y-1.5">
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">No subjects yet</h2>
            <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
              Add a subject to organize your study material, prepare for exams, and track your progress.
            </p>
          </div>
          <button
            onClick={() => {
              setSubjectToEdit(null);
              setIsAddModalOpen(true);
            }}
            className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-600/20 transition inline-flex items-center space-x-2 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>+ Add Your First Subject</span>
          </button>
        </div>
      ) : sorted.length === 0 ? (
        <div className="bg-white rounded-2xl p-8 border border-slate-200 text-center space-y-2">
          <p className="text-sm font-bold text-slate-700">No subjects matched the selected filter.</p>
          <button
            onClick={() => setFilter('ALL')}
            className="text-xs font-semibold text-indigo-600 hover:underline cursor-pointer"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sorted.map((item) => {
            const hasExamDate = Boolean(item.exam_date);
            const daysRem = item.days_remaining;
            const progressPct = item.preparation_progress;

            return (
              <div
                key={item.subject_id}
                className="bg-white rounded-3xl border border-slate-200/90 shadow-sm hover:shadow-md hover:border-indigo-300 transition-all flex flex-col justify-between overflow-hidden group"
              >
                {/* Card Top Banner */}
                <div className="p-6 border-b border-slate-100 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        {item.subject_code && (
                          <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200">
                            {item.subject_code}
                          </span>
                        )}
                        {item.semester && (
                          <span className="text-[10px] font-semibold text-slate-500">
                            {item.semester}
                          </span>
                        )}
                      </div>
                      <h3 className="text-base font-bold text-slate-900 group-hover:text-indigo-600 transition-colors line-clamp-1">
                        {item.subject_name}
                      </h3>
                    </div>

                    {/* Actions Menu */}
                    <div className="flex items-center space-x-1 shrink-0">
                      <button
                        onClick={() => handleEditClick(item)}
                        title="Edit Subject"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteSubject(item.subject_id, item.subject_name)}
                        disabled={deletingId === item.subject_id}
                        title="Delete Subject"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer disabled:opacity-50"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Exam Date & Days Countdown */}
                  <div className="flex items-center justify-between text-xs pt-1">
                    <div className="flex items-center space-x-1.5 text-slate-500">
                      <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                      <span>{hasExamDate ? item.exam_date : 'No exam date set'}</span>
                    </div>

                    {hasExamDate && daysRem !== null && daysRem !== undefined && (
                      <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${
                        daysRem >= 0
                          ? 'bg-amber-50 text-amber-800 border border-amber-200'
                          : 'bg-slate-100 text-slate-600'
                      }`}>
                        {daysRem >= 0 ? `${daysRem} Days Left` : 'Exam Passed'}
                      </span>
                    )}
                  </div>
                </div>

                {/* Card Middle: Progress & Task Breakdown */}
                <div className="p-6 space-y-4 flex-1">
                  {/* Preparation Progress Bar */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-slate-700">Preparation Progress</span>
                      <span className="font-extrabold text-indigo-600 font-mono">
                        {progressPct !== null && progressPct !== undefined
                          ? `${progressPct}%`
                          : item.progress_status}
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-indigo-500 to-violet-600 rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(100, Math.max(progressPct || 0, 0))}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Metrics Pills: Tasks, Documents, Topics */}
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="p-2.5 bg-slate-50 border border-slate-100 rounded-xl">
                      <span className="text-[10px] text-slate-400 block font-medium">Tasks</span>
                      <span className="text-xs font-bold text-slate-800">
                        {item.tasks_completed} / {item.tasks_total}
                      </span>
                    </div>
                    <div className="p-2.5 bg-slate-50 border border-slate-100 rounded-xl">
                      <span className="text-[10px] text-slate-400 block font-medium">Documents</span>
                      <span className="text-xs font-bold text-slate-800">
                        {item.documents_count}
                      </span>
                    </div>
                    <div className="p-2.5 bg-slate-50 border border-slate-100 rounded-xl">
                      <span className="text-[10px] text-slate-400 block font-medium">Topics</span>
                      <span className="text-xs font-bold text-slate-800">
                        {item.topics_count}
                      </span>
                    </div>
                  </div>

                  {/* Next Recommended Action */}
                  {item.next_recommended_action && (
                    <div className="p-3 bg-indigo-50/70 border border-indigo-100 rounded-xl space-y-1">
                      <div className="flex items-center space-x-1.5 text-[10px] font-bold text-indigo-800 uppercase tracking-wider">
                        <Sparkles className="w-3 h-3 text-indigo-600" />
                        <span>Recommended Next Step</span>
                      </div>
                      <p className="text-xs text-indigo-950 font-medium line-clamp-1">
                        {item.next_recommended_action}
                      </p>
                    </div>
                  )}
                </div>

                {/* Card Bottom: Action Buttons */}
                <div className="p-4 bg-slate-50/80 border-t border-slate-100 flex items-center justify-between gap-2">
                  <button
                    onClick={() => {
                      setUploadModalSubject({ id: item.subject_id, name: item.subject_name, code: item.subject_code });
                      setIsUploadModalOpen(true);
                    }}
                    className="px-3 py-2 text-xs font-semibold text-slate-700 hover:text-indigo-600 hover:bg-white rounded-xl border border-slate-200 transition cursor-pointer flex items-center justify-center space-x-1"
                    title="Upload document for this subject"
                  >
                    <Upload className="w-3.5 h-3.5 text-indigo-500" />
                    <span>Upload</span>
                  </button>
                  <button
                    onClick={() => handleViewStudyPlan(item.subject_id)}
                    className="flex-1 px-3 py-2 text-xs font-semibold text-slate-700 hover:text-indigo-600 hover:bg-white rounded-xl border border-slate-200 transition cursor-pointer text-center"
                  >
                    View Plan
                  </button>
                  <button
                    onClick={() => handleOpenSubject(item.subject_id)}
                    className="flex-1 px-3 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition flex items-center justify-center space-x-1 cursor-pointer"
                  >
                    <span>Open</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Subject-Wise Upload Document Modal */}
      {uploadModalSubject && (
        <UploadDocumentModal
          isOpen={isUploadModalOpen}
          onClose={() => {
            setIsUploadModalOpen(false);
            setUploadModalSubject(null);
          }}
          subjectId={uploadModalSubject.id}
          subjectName={uploadModalSubject.name}
          subjectCode={uploadModalSubject.code}
          onSuccess={() => {
            loadOverview();
          }}
        />
      )}

      {/* Global Add/Edit Modal */}
      <AddSubjectModal
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setSubjectToEdit(null);
        }}
        onSuccess={() => {
          loadOverview();
        }}
        initialSubject={subjectToEdit}
      />
    </div>
  );
};
