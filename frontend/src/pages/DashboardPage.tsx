import React, { useState, useEffect } from 'react';
import {
  Calendar, Clock, CheckCircle, Target, ArrowRight, BookOpen,
  Sparkles, AlertCircle, FileText, BarChart2, ShieldAlert, PenTool,
  Lightbulb, Plus, BookMarked, HelpCircle, ChevronRight
} from 'lucide-react';
import { api } from '../services/api';
import { StudentProfile, TopicItem, StudyPlan, Subject, SubjectProgressItem } from '../types';
import { PriorityBadge } from '../components/PriorityBadge';
import { AddSubjectModal } from '../components/AddSubjectModal';

interface Props {
  userName?: string;
  userEmail?: string;
  userRole?: string;
  onNavigate: (tab: string) => void;
  onOpenOnboarding: () => void;
}

export const DashboardPage: React.FC<Props> = ({
  userName = 'Student',
  userEmail,
  userRole,
  onNavigate,
  onOpenOnboarding,
}) => {
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [activeSubject, setActiveSubject] = useState<Subject | null>(null);
  const [subjectProgress, setSubjectProgress] = useState<SubjectProgressItem | null>(null);
  const [topics, setTopics] = useState<TopicItem[]>([]);
  const [plan, setPlan] = useState<StudyPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // 1. Load subjects first to determine if student has any
      const userSubs = await api.getSubjects().catch(() => []);
      setSubjects(userSubs);

      // 2. Load profile
      const profData = await api.getProfile().catch(() => null);
      setProfile(profData);

      if (userSubs.length > 0) {
        // Resolve active subject
        let currentSub = userSubs.find((s) => s.id === profData?.subject_id);
        if (!currentSub) {
          currentSub = userSubs[0];
          // Sync active subject in backend
          api.setActiveSubject(currentSub.id).catch(() => {});
        }
        setActiveSubject(currentSub);

        // Load active subject data in parallel
        const [progData, topicsData, planData] = await Promise.all([
          api.getSubjectProgress(currentSub.id).catch(() => null),
          api.getTopics(currentSub.id).catch(() => []),
          api.getStudyPlan(currentSub.id).catch(() => null)
        ]);

        setSubjectProgress(progData);
        setTopics(topicsData);
        setPlan(planData);
      } else {
        setActiveSubject(null);
        setSubjectProgress(null);
        setTopics([]);
        setPlan(null);
      }
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleTaskComplete = async (taskId: number) => {
    try {
      await api.updateTaskStatus(taskId, 'COMPLETED');
      loadData();
    } catch (err: any) {
      alert(`Error updating task: ${err.message}`);
    }
  };

  const displayName = userName || 'Student';
  const firstName = displayName.split(' ')[0];

  // Derived values for active subject
  const highPriorityTopics = topics.filter((t) => t.preparation_priority === 'HIGH');
  const weakTopicsList = profile?.weak_topics || [];
  const weakTopicsCount = weakTopicsList.length;

  // Use mathematically calculated subject progress if study tasks exist, else profile readiness
  const preparationProgress = subjectProgress?.preparation_progress;
  const todayTasks = plan?.tasks?.slice(0, 3) || [];
  const topTopic = highPriorityTopics[0] || topics[0];

  // =========================================================================
  // CASE A: NEW STUDENT EMPTY STATE (0 subjects)
  // Requirement 1.D: Immediately after registration, show friendly welcome,
  // prominent Add Subject button, and clear empty states for exams/performance/plans.
  // =========================================================================
  if (!loading && subjects.length === 0) {
    return (
      <div className="p-8 space-y-8 max-w-5xl mx-auto animate-in fade-in duration-300">
        {/* Welcome Banner */}
        <div className="relative overflow-hidden bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-8 md:p-10 text-white shadow-xl border border-slate-800">
          <div className="absolute top-0 right-0 -mr-16 -mt-16 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
          <div className="relative z-10 space-y-4 max-w-2xl">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              <span>Welcome to ExamIQ</span>
            </div>
            <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight">
              Welcome, {firstName}! Let&apos;s set up your exam strategy.
            </h2>
            <p className="text-slate-300 text-sm leading-relaxed">
              Welcome to ExamIQ! Add your first subject to start organizing your exam preparation, analyzing past question patterns, and generating a personalized schedule.
            </p>
            <div className="pt-2">
              <button
                onClick={() => setIsAddModalOpen(true)}
                className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-indigo-600/30 transition flex items-center space-x-2 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>+ Add Subject</span>
              </button>
            </div>
          </div>
        </div>

        {/* Empty State Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {/* Card 1: Subjects */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-xs space-y-3 text-center">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
              <BookOpen className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-bold text-slate-800">No Subjects Yet</h4>
            <p className="text-xs text-slate-500">
              Add your first course subject to begin uploading notes and syllabus documents.
            </p>
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="text-xs font-bold text-indigo-600 hover:text-indigo-800 cursor-pointer pt-1"
            >
              + Add First Subject &rarr;
            </button>
          </div>

          {/* Card 2: Exams */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-xs space-y-3 text-center">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
              <Calendar className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-bold text-slate-800">No Upcoming Exams</h4>
            <p className="text-xs text-slate-500">
              When you add a subject with an exam date, countdown and milestones will appear here.
            </p>
            <span className="text-xs font-medium text-slate-400 block pt-1">
              No exams scheduled
            </span>
          </div>

          {/* Card 3: Performance & Study Plan */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-xs space-y-3 text-center">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
              <BarChart2 className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-bold text-slate-800">No Performance Data Yet</h4>
            <p className="text-xs text-slate-500">
              Generate a study schedule or evaluate test answers to track evidence-backed progress.
            </p>
            <button
              onClick={() => onNavigate('plan')}
              className="text-xs font-bold text-emerald-600 hover:text-emerald-800 cursor-pointer pt-1"
            >
              Create Study Plan &rarr;
            </button>
          </div>
        </div>

        {/* Feature Explainer */}
        <div className="p-6 bg-slate-100/70 border border-slate-200 rounded-2xl space-y-3 text-left">
          <div className="flex items-center space-x-2 text-slate-800 font-bold text-xs uppercase tracking-wider">
            <Sparkles className="w-4 h-4 text-indigo-600" />
            <span>How ExamIQ Helps You Prepare</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
            <div className="space-y-1">
              <span className="text-xs font-bold text-slate-800 block">1. Document Intelligence</span>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                Upload lecture slides, scanned handwritten notes, and past question papers for automatic topic extraction.
              </p>
            </div>
            <div className="space-y-1">
              <span className="text-xs font-bold text-slate-800 block">2. Exam Pattern Analysis</span>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                Discover historical marks distribution and empirical question frequency from verified papers.
              </p>
            </div>
            <div className="space-y-1">
              <span className="text-xs font-bold text-slate-800 block">3. Answer Strategy Coach</span>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                Structure answers according to marking schemes, diagrams, formulas, and rubrics.
              </p>
            </div>
          </div>
        </div>

        {/* Global Add Subject Modal */}
        <AddSubjectModal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          onSuccess={() => {
            loadData();
          }}
        />
      </div>
    );
  }

  // =========================================================================
  // CASE B: STUDENT HAS SUBJECTS — DYNAMIC DATA DASHBOARD
  // =========================================================================
  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      {/* Top Welcome & Active Subject Banner */}
      <div className="relative overflow-hidden bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-8 text-white shadow-xl border border-slate-800">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              <span>Personalized Preparation Strategy Active</span>
            </div>
            <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight">
              Good morning, {firstName}!
            </h2>
            <p className="text-slate-300 text-xs md:text-sm max-w-xl leading-relaxed">
              Targeting <strong className="text-white">{activeSubject?.target_marks || profile?.target_marks || 85}%</strong> in{' '}
              <strong className="text-indigo-200">
                {activeSubject?.name || 'Active Subject'}
                {activeSubject?.code ? ` (${activeSubject.code})` : ''}
              </strong>. Here is your evidence-backed focus for today.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              onClick={() => onNavigate('my-subjects')}
              className="px-4 py-2.5 bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-slate-200 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center space-x-1.5"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>All Subjects ({subjects.length})</span>
            </button>
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="px-4 py-2.5 bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-slate-200 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center space-x-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Subject</span>
            </button>
            <button
              onClick={() => onNavigate('coach')}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-indigo-600/30 transition flex items-center space-x-2 cursor-pointer"
            >
              <PenTool className="w-3.5 h-3.5" />
              <span>Launch Answer Coach</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards: Dynamic Evidence-backed Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* KPI 1: Preparation Progress */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1">Preparation Progress</span>
            <div className="flex items-baseline space-x-1.5">
              {preparationProgress !== null && preparationProgress !== undefined ? (
                <>
                  <span className="text-3xl font-extrabold text-slate-900 font-mono">{preparationProgress}%</span>
                  <span className="text-xs text-emerald-600 font-semibold">+Tracked</span>
                </>
              ) : (
                <span className="text-sm font-bold text-slate-400">Not enough data yet</span>
              )}
            </div>
            <span className="text-[11px] text-slate-500 mt-1 block">
              {subjectProgress?.tasks_total
                ? `${subjectProgress.tasks_completed} of ${subjectProgress.tasks_total} eligible study tasks completed`
                : 'Create a study schedule to track progress'}
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
            <Target className="w-6 h-6" />
          </div>
        </div>

        {/* KPI 2: High Priority Topics */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1">High Priority Topics</span>
            <div className="flex items-baseline space-x-1.5">
              <span className="text-3xl font-extrabold text-rose-600 font-mono">{highPriorityTopics.length}</span>
              <span className="text-xs text-slate-500 font-medium">of {topics.length} total</span>
            </div>
            <span className="text-[11px] text-slate-500 mt-1 block">
              {highPriorityTopics.length > 0 ? 'Highest syllabus & mark weight' : 'Upload materials to rank topics'}
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center">
            <ShieldAlert className="w-6 h-6" />
          </div>
        </div>

        {/* KPI 3: Focus / Weak Areas */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1">Focus / Weak Areas</span>
            <div className="flex items-baseline space-x-1.5">
              <span className="text-3xl font-extrabold text-amber-600 font-mono">{weakTopicsCount}</span>
              <span className="text-xs text-slate-500 font-medium">topics</span>
            </div>
            <span className="text-[11px] text-slate-500 mt-1 block truncate max-w-[170px]" title={weakTopicsList.join(', ')}>
              {weakTopicsCount > 0 ? `${weakTopicsList.slice(0, 2).join(', ')}` : 'None flagged yet'}
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <AlertCircle className="w-6 h-6" />
          </div>
        </div>

        {/* KPI 4: Daily Study Hours & Exam Date */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1">Target Daily Study</span>
            <div className="flex items-baseline space-x-1.5">
              <span className="text-3xl font-extrabold text-indigo-600 font-mono">
                {activeSubject?.study_hours_per_day || profile?.available_hours_per_day || 3.0}
              </span>
              <span className="text-xs text-slate-500 font-medium">hours / day</span>
            </div>
            <span className="text-[11px] text-slate-500 mt-1 block">
              {activeSubject?.exam_date ? `${activeSubject.exam_date} Exam` : 'Exam Date TBD'}
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <Clock className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Main Content Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Cols: Study Today Tasks & Explainability */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-slate-900 tracking-tight">Study Today</h3>
              <p className="text-xs text-slate-500">
                Curated sequence for <strong>{activeSubject?.name}</strong> maximizing marks and retention
              </p>
            </div>
            <button
              onClick={() => onNavigate('plan')}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center space-x-1 cursor-pointer"
            >
              <span>Full Study Plan</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-3.5">
            {todayTasks.length > 0 ? (
              todayTasks.map((t, idx) => {
                const isDone = t.status === 'COMPLETED';
                return (
                  <div
                    key={t.id || idx}
                    className={`p-5 rounded-2xl border transition-all ${
                      isDone
                        ? 'bg-slate-50/70 border-slate-200 opacity-60'
                        : 'bg-white border-slate-200/90 shadow-sm hover:border-indigo-300'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-1.5">
                        <div className="flex items-center space-x-2">
                          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                            {t.task_type}
                          </span>
                          <PriorityBadge priority={t.priority} />
                          <span className="text-xs font-medium text-slate-400 flex items-center">
                            <Clock className="w-3 h-3 mr-1" />
                            {t.duration_minutes} min
                          </span>
                        </div>
                        <h4 className="text-sm font-bold text-slate-900">{t.title}</h4>
                        <p className="text-xs text-slate-600 leading-relaxed">{t.description}</p>
                      </div>

                      <div className="flex flex-col items-end gap-2 shrink-0">
                        {isDone ? (
                          <span className="inline-flex items-center text-xs font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                            <CheckCircle className="w-3.5 h-3.5 mr-1" />
                            Completed
                          </span>
                        ) : (
                          <button
                            onClick={() => handleTaskComplete(t.id)}
                            className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-600 text-indigo-700 hover:text-white rounded-lg text-xs font-semibold border border-indigo-200 transition-colors cursor-pointer"
                          >
                            Mark Done
                          </button>
                        )}
                        <button
                          onClick={() => onNavigate('coach')}
                          className="text-[11px] font-medium text-slate-500 hover:text-indigo-600 cursor-pointer"
                        >
                          Practice in Coach &rarr;
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="p-8 text-center bg-white rounded-2xl border border-slate-200/90 shadow-xs space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
                  <Calendar className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-slate-900">No Active Study Tasks Yet</h4>
                  <p className="text-xs text-slate-500 max-w-md mx-auto">
                    Generate your day-by-day study roadmap for {activeSubject?.name} to prioritize key topics and questions.
                  </p>
                </div>
                <button
                  onClick={onOpenOnboarding}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs transition cursor-pointer"
                >
                  Generate Study Schedule
                </button>
              </div>
            )}
          </div>

          {/* Dynamic Pedagogical Explainability Callout */}
          {topTopic ? (
            <div className="p-5 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/80 rounded-2xl space-y-2">
              <div className="flex items-center space-x-2 text-amber-900 font-bold text-xs uppercase tracking-wider">
                <Lightbulb className="w-4 h-4 text-amber-600" />
                <span>Pedagogical Transparency &bull; Why is {topTopic.name} High Priority?</span>
              </div>
              <p className="text-xs text-amber-800 leading-relaxed">
                <strong>{topTopic.name}</strong> has a priority score of <strong>{(topTopic.priority_score || 0.85).toFixed(2)}/1.00</strong> based on:
                historical question appearances (<strong>{topTopic.historical_frequency || 1} paper sets</strong>), average weight of <strong>{topTopic.avg_marks || 5.0} Marks</strong>, and core syllabus relevance.
              </p>
              <span className="text-[10px] text-amber-700/80 block italic">
                Note: Preparation Priority represents an evidence-based recommendation model, not a guarantee of upcoming exam questions.
              </span>
            </div>
          ) : (
            <div className="p-5 bg-indigo-50 border border-indigo-200/80 rounded-2xl space-y-2">
              <div className="flex items-center space-x-2 text-indigo-900 font-bold text-xs uppercase tracking-wider">
                <Lightbulb className="w-4 h-4 text-indigo-600" />
                <span>Topic Extraction & Ranking</span>
              </div>
              <p className="text-xs text-indigo-800 leading-relaxed">
                Upload your course syllabus or lecture notes in the Course Documents section to automatically extract topics, formulas, and historical frequencies.
              </p>
            </div>
          )}
        </div>

        {/* Right Col: Fast Insights & Quick Links */}
        <div className="space-y-6">
          {/* Quick Subject Switcher */}
          {subjects.length > 1 && (
            <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Switch Active Subject
                </h4>
                <button
                  onClick={() => onNavigate('my-subjects')}
                  className="text-[11px] font-semibold text-indigo-600 hover:underline cursor-pointer"
                >
                  Manage All
                </button>
              </div>
              <div className="space-y-1.5">
                {subjects.slice(0, 4).map((s) => {
                  const isActive = activeSubject?.id === s.id;
                  return (
                    <button
                      key={s.id}
                      onClick={async () => {
                        await api.setActiveSubject(s.id);
                        loadData();
                      }}
                      className={`w-full flex items-center justify-between p-2.5 rounded-xl text-xs font-semibold text-left transition cursor-pointer ${
                        isActive
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200/70'
                      }`}
                    >
                      <span className="truncate max-w-[180px]">{s.name}</span>
                      {isActive && <CheckCircle className="w-3.5 h-3.5 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Quick Search Shortcut */}
          <div className="p-5 bg-indigo-50 border border-indigo-200/70 rounded-2xl space-y-3">
            <h4 className="text-xs font-bold text-indigo-950 flex items-center space-x-1.5">
              <BookOpen className="w-4 h-4 text-indigo-600" />
              <span>Semantic Search Across Notes</span>
            </h4>
            <p className="text-xs text-indigo-800 leading-relaxed">
              Query lecture materials, handwritten notes, and past question papers conceptually without exact keyword matching.
            </p>
            <button
              onClick={() => onNavigate('search')}
              className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-xs transition cursor-pointer"
            >
              Open Academic Search
            </button>
          </div>

          {/* Exam Pattern Insight */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center">
                <BarChart2 className="w-4 h-4 mr-1.5 text-indigo-600" />
                Exam Pattern Analysis
              </h4>
              <button
                onClick={() => onNavigate('patterns')}
                className="text-[11px] font-semibold text-indigo-600 hover:underline cursor-pointer"
              >
                Inspect All
              </button>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              Inspect empirical question type distributions, proof requirements, and historical weightings for {activeSubject?.name}.
            </p>
            <button
              onClick={() => onNavigate('patterns')}
              className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-semibold transition cursor-pointer"
            >
              View Pattern Breakdown
            </button>
          </div>
        </div>
      </div>

      {/* Global Add Subject Modal */}
      <AddSubjectModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={() => {
          loadData();
        }}
      />
    </div>
  );
};
