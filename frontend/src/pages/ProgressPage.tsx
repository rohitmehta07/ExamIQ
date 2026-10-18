import React, { useState, useEffect } from 'react';
import {
  LineChart, TrendingUp, Award, AlertCircle, CheckCircle2, Circle,
  PlusCircle, Save, BookOpen, Clock, Target, Sparkles, RefreshCw,
  FileText, FileQuestion, CalendarDays, CheckSquare, Layers,
  ChevronRight, ArrowRight, ShieldCheck, Info
} from 'lucide-react';
import { api } from '../services/api';
import {
  Subject, SubjectProgressItem, TopicItem, StudyPlan,
  StudyTask, StudentProfile, DocumentItem
} from '../types';
import { PriorityBadge } from '../components/PriorityBadge';

interface Props {
  activeSubject?: Subject | null;
  onSubjectChange?: (subjectId?: number) => void;
  onNavigate?: (tab: string) => void;
}

export const ProgressPage: React.FC<Props> = ({
  activeSubject,
  onSubjectChange,
  onNavigate
}) => {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState<number | null>(activeSubject?.id || null);
  const [progress, setProgress] = useState<SubjectProgressItem | null>(null);
  const [topics, setTopics] = useState<TopicItem[]>([]);
  const [studyPlan, setStudyPlan] = useState<StudyPlan | null>(null);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [performances, setPerformances] = useState<any[]>([]);

  // Score Entry state
  const [selectedTopicId, setSelectedTopicId] = useState<number | null>(null);
  const [inputScore, setInputScore] = useState<number>(7.0);
  const [inputMax, setInputMax] = useState<number>(10.0);
  const [notes, setNotes] = useState<string>('');

  // UI state
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [savingScore, setSavingScore] = useState(false);
  const [togglingTaskId, setTogglingTaskId] = useState<number | null>(null);
  const [taskFilter, setTaskFilter] = useState<'ALL' | 'PENDING' | 'COMPLETED'>('ALL');

  // Sync activeSubject from props
  useEffect(() => {
    if (activeSubject?.id && activeSubject.id !== selectedSubjectId) {
      setSelectedSubjectId(activeSubject.id);
    }
  }, [activeSubject?.id]);

  // Load subject list and initial data
  useEffect(() => {
    loadSubjectsAndData();
  }, [selectedSubjectId]);

  const loadSubjectsAndData = async (isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const userSubs = await api.getSubjects().catch(() => []);
      setSubjects(userSubs);

      let targetId = selectedSubjectId;
      if (!targetId && userSubs.length > 0) {
        targetId = userSubs[0].id;
        setSelectedSubjectId(targetId);
      }

      if (targetId) {
        const [progData, topicList, planData, docList, perfData] = await Promise.all([
          api.getSubjectProgress(targetId).catch(() => null),
          api.getTopics(targetId).catch(() => []),
          api.getStudyPlan(targetId).catch(() => null),
          api.getDocuments(targetId).catch(() => []),
          api.getPerformance().catch(() => [])
        ]);

        setProgress(progData);
        setTopics(topicList);
        setStudyPlan(planData);
        setDocuments(docList);
        setPerformances(perfData);

        if (topicList.length > 0) {
          setSelectedTopicId((prev) => (prev && topicList.some((t) => t.id === prev) ? prev : topicList[0].id));
        } else {
          setSelectedTopicId(null);
        }
      } else {
        setProgress(null);
        setTopics([]);
        setStudyPlan(null);
        setDocuments([]);
      }
    } catch (err) {
      console.error('Failed to load subject progress data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleSubjectSelect = (subId: number) => {
    setSelectedSubjectId(subId);
    onSubjectChange?.(subId);
  };

  const handleToggleTaskStatus = async (task: StudyTask) => {
    if (!task.id) return;
    setTogglingTaskId(task.id);
    const newStatus = task.status === 'COMPLETED' ? 'PENDING' : 'COMPLETED';

    try {
      await api.updateTaskStatus(task.id, newStatus);
      // Immediately reload subject progress and study plan to recalculate task completion percentage
      if (selectedSubjectId) {
        const [updatedProg, updatedPlan] = await Promise.all([
          api.getSubjectProgress(selectedSubjectId).catch(() => null),
          api.getStudyPlan(selectedSubjectId).catch(() => null)
        ]);
        if (updatedProg) setProgress(updatedProg);
        if (updatedPlan) setStudyPlan(updatedPlan);
      }
    } catch (err: any) {
      alert(`Failed to update task: ${err.message}`);
    } finally {
      setTogglingTaskId(null);
    }
  };

  const handleSaveScore = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTopicId) return;
    setSavingScore(true);
    try {
      await api.addPerformance(selectedTopicId, inputScore, inputMax, notes);
      setNotes('');
      // Reload performance and progress data
      if (selectedSubjectId) {
        const [perfData, progData] = await Promise.all([
          api.getPerformance().catch(() => []),
          api.getSubjectProgress(selectedSubjectId).catch(() => null)
        ]);
        setPerformances(perfData);
        if (progData) setProgress(progData);
      }
    } catch (err: any) {
      alert(`Error saving score: ${err.message}`);
    } finally {
      setSavingScore(false);
    }
  };

  if (loading && !progress) {
    return (
      <div className="p-8 max-w-7xl mx-auto flex flex-col items-center justify-center min-h-[400px] text-slate-500">
        <RefreshCw className="w-8 h-8 animate-spin text-indigo-600 mb-3" />
        <p className="text-sm font-semibold">Calculating subject-specific metrics & progress...</p>
      </div>
    );
  }

  if (subjects.length === 0) {
    return (
      <div className="p-8 max-w-4xl mx-auto text-center space-y-4">
        <div className="bg-white p-12 rounded-3xl border border-slate-200/90 shadow-xs space-y-4">
          <BookOpen className="w-12 h-12 text-slate-400 mx-auto" />
          <h2 className="text-2xl font-black text-slate-900">No Subjects Enrolled</h2>
          <p className="text-sm text-slate-500 max-w-md mx-auto">
            You must add an enrolled subject in your curriculum before tracking documents, topics, and task progress.
          </p>
          <button
            onClick={() => onNavigate?.('my-subjects')}
            className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-xl shadow-md shadow-indigo-600/20 transition cursor-pointer"
          >
            Add Subject in My Subjects
          </button>
        </div>
      </div>
    );
  }

  const selectedSub = subjects.find((s) => s.id === selectedSubjectId) || subjects[0];
  const eligibleTasks = studyPlan?.tasks?.filter((t) => (t.status || '').toUpperCase() !== 'CANCELLED') || [];
  const filteredTasks = eligibleTasks.filter((t) => {
    if (taskFilter === 'PENDING') return (t.status || '').toUpperCase() === 'PENDING';
    if (taskFilter === 'COMPLETED') return (t.status || '').toUpperCase() === 'COMPLETED';
    return true;
  });

  // Calculate or retrieve honest completion percentage
  const taskCompletionPct = progress?.task_completion_percentage ?? progress?.preparation_progress ?? null;
  const tasksCompleted = progress?.tasks_completed ?? 0;
  const tasksPending = progress?.tasks_pending ?? (progress?.tasks_total ? Math.max(0, progress.tasks_total - tasksCompleted) : 0);
  const tasksTotal = progress?.tasks_total ?? 0;

  // Important topics list for this subject
  const importantTopicsList = topics.filter((t) => t.is_manually_marked || (t.preparation_priority || '').toUpperCase() === 'HIGH');

  // Days remaining label & badge
  const daysRem = progress?.days_remaining;
  const examUrgency = progress?.exam_urgency || (daysRem !== null && daysRem !== undefined ? (daysRem <= 7 ? 'CRITICAL' : daysRem <= 30 ? 'UPCOMING' : 'SCHEDULED') : 'NOT_SCHEDULED');

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      {/* Subject Selector & Header */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-200">
              Subject-Specific My Progress
            </span>
            {selectedSub.code && (
              <span className="text-xs font-bold text-slate-500 font-mono">
                {selectedSub.code}
              </span>
            )}
          </div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight mt-1">
            {selectedSub.name}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Progress and preparation metrics strictly isolated to your authenticated account and chosen course.
          </p>
        </div>

        {/* Subject Switcher & Refresh */}
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2 bg-slate-50 border border-slate-200/90 p-1.5 rounded-2xl">
            <BookOpen className="w-4 h-4 text-slate-400 ml-2" />
            <select
              value={selectedSub.id}
              onChange={(e) => handleSubjectSelect(parseInt(e.target.value, 10))}
              className="bg-transparent text-xs font-bold text-slate-800 pr-3 py-1 outline-none cursor-pointer"
            >
              {subjects.map((sub) => (
                <option key={sub.id} value={sub.id}>
                  {sub.code ? `${sub.code} - ${sub.name}` : sub.name}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={() => loadSubjectsAndData(true)}
            disabled={refreshing}
            title="Refresh subject metrics"
            className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-indigo-600' : ''}`} />
          </button>
        </div>
      </div>

      {/* Upcoming Exam Countdown & Target Card */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Exam Countdown */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Upcoming Exam</span>
            <CalendarDays className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="my-2">
            <div className="flex items-baseline space-x-2">
              <span className="text-3xl font-black text-slate-900 font-mono">
                {daysRem !== null && daysRem !== undefined ? `${daysRem}` : 'TBD'}
              </span>
              <span className="text-xs font-bold text-slate-500">
                {daysRem !== null && daysRem !== undefined ? 'Days Remaining' : 'Date Not Set'}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 font-medium">
              {progress?.exam_date ? `Exam on ${progress.exam_date}` : 'Set in My Subjects'}
            </p>
          </div>
          <div>
            <span
              className={`inline-block px-2 py-0.5 rounded text-[10px] font-extrabold uppercase border ${
                examUrgency === 'CRITICAL'
                  ? 'bg-rose-50 text-rose-700 border-rose-200'
                  : examUrgency === 'UPCOMING'
                  ? 'bg-amber-50 text-amber-700 border-amber-200'
                  : examUrgency === 'SCHEDULED'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-slate-50 text-slate-600 border-slate-200'
              }`}
            >
              {examUrgency === 'CRITICAL' && 'Exam Imminent (< 7 Days)'}
              {examUrgency === 'UPCOMING' && 'Approaching (< 30 Days)'}
              {examUrgency === 'SCHEDULED' && 'Scheduled On Track'}
              {examUrgency === 'OVERDUE' && 'Exam Date Passed'}
              {examUrgency === 'NOT_SCHEDULED' && 'Unscheduled'}
            </span>
          </div>
        </div>

        {/* Target Marks */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Target Goal</span>
            <Target className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="my-2">
            <div className="flex items-baseline space-x-2">
              <span className="text-3xl font-black text-emerald-600 font-mono">
                {progress?.target_marks ?? 85}%
              </span>
              <span className="text-xs font-bold text-slate-500">Target Marks</span>
            </div>
            <p className="text-[11px] text-slate-500 font-medium">
              Daily Pace: {progress?.study_hours_per_day ?? 2.5} hrs/day
            </p>
          </div>
          <div className="text-[10px] text-slate-400">
            Semester: {progress?.semester || selectedSub.semester || 'Current'}
          </div>
        </div>

        {/* Task Completion Percentage */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs flex flex-col justify-between md:col-span-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Task Completion Rate</span>
            <CheckSquare className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="my-2 flex items-center justify-between">
            <div>
              <div className="flex items-baseline space-x-2">
                <span className="text-4xl font-black text-indigo-600 font-mono">
                  {taskCompletionPct !== null ? `${taskCompletionPct}%` : '0%'}
                </span>
                <span className="text-xs font-bold text-slate-500">
                  ({tasksCompleted} of {tasksTotal} tasks completed)
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium">
                Status: <span className="font-bold text-slate-800">{progress?.progress_status || 'Not started'}</span>
              </p>
            </div>
            <div className="text-right">
              <span className="text-xs font-extrabold text-amber-600 bg-amber-50 px-2 py-1 rounded border border-amber-200 block mb-1">
                {tasksPending} Pending Tasks
              </span>
            </div>
          </div>
          {/* Progress Bar */}
          <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
            <div
              className="bg-gradient-to-r from-indigo-500 to-indigo-600 h-2 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, Math.max(0, taskCompletionPct || 0))}%` }}
            />
          </div>
        </div>
      </div>

      {/* Explicit Calculation Formula & Mastery Policy Banner */}
      <div className="bg-indigo-50/70 border border-indigo-200/90 rounded-2xl p-5 flex items-start space-x-3.5">
        <Info className="w-5 h-5 text-indigo-700 shrink-0 mt-0.5" />
        <div className="space-y-1.5 text-xs">
          <div className="flex items-center space-x-2">
            <span className="font-extrabold text-indigo-950 uppercase tracking-wider text-[11px]">
              Strict Progress Formula
            </span>
            <span className="font-mono text-indigo-800 bg-white px-2 py-0.5 rounded border border-indigo-200 text-[11px] font-bold">
              Completion % = (Completed Tasks / Total Eligible Tasks) × 100%
            </span>
          </div>
          <p className="text-indigo-900 leading-relaxed font-medium">
            <strong>Important Policy:</strong> Uploaded notes and documents represent study inventory and are <strong className="text-indigo-950 underline">never treated as proof of mastery</strong>. Your preparation progress is calculated solely from verified completed study tasks and practice questions. Empty subjects without tasks evaluate safely to <strong>0% / Not started</strong> with zero division errors.
          </p>
        </div>
      </div>

      {/* 3-Column Metrics Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card 1: Document Inventory */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center space-x-2">
              <FileText className="w-4 h-4 text-indigo-600" />
              <h3 className="text-sm font-bold text-slate-900">Document Materials</h3>
            </div>
            <span className="text-xs font-mono font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
              {progress?.documents_count ?? documents.length} Files
            </span>
          </div>

          <div className="space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-600">Lecture Notes & Guides:</span>
              <span className="font-bold font-mono text-slate-900">
                {progress?.notes_documents_count ?? documents.filter((d) => d.doc_category === 'LECTURE_NOTES').length}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-600">Previous Year Papers (PYQ):</span>
              <span className="font-bold font-mono text-slate-900">
                {progress?.pyq_documents_count ?? documents.filter((d) => ['QUESTION_PAPER', 'PYQ'].includes(d.doc_category)).length}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-600">Syllabus Breakdown:</span>
              <span className="font-bold font-mono text-slate-900">
                {progress?.syllabus_documents_count ?? documents.filter((d) => d.doc_category === 'SYLLABUS').length}
              </span>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
            <span className="text-[11px] text-slate-400">Inventory only</span>
            <button
              onClick={() => onNavigate?.('documents')}
              className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center space-x-1 cursor-pointer"
            >
              <span>Manage Docs</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Card 2: Extracted & Important Topics */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center space-x-2">
              <Target className="w-4 h-4 text-emerald-600" />
              <h3 className="text-sm font-bold text-slate-900">Topic Intelligence</h3>
            </div>
            <span className="text-xs font-mono font-bold bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded border border-emerald-200">
              {progress?.topics_count ?? topics.length} Extracted
            </span>
          </div>

          <div className="space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-600 font-semibold">Important Focus Topics:</span>
              <span className="font-extrabold font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                {progress?.important_topics_count ?? importantTopicsList.length}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-600">High Frequency (PYQ Evidence):</span>
              <span className="font-bold font-mono text-slate-900">
                {progress?.high_priority_topics_count ?? topics.filter((t) => (t.preparation_priority || '').toUpperCase() === 'HIGH').length}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-600">Student Marked Important:</span>
              <span className="font-bold font-mono text-slate-900">
                {progress?.manually_marked_topics_count ?? topics.filter((t) => t.is_manually_marked).length}
              </span>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
            <span className="text-[11px] text-slate-400">
              {progress?.topics_completed ?? 0} Completed
            </span>
            <button
              onClick={() => onNavigate?.('topics')}
              className="text-xs font-bold text-emerald-600 hover:text-emerald-800 flex items-center space-x-1 cursor-pointer"
            >
              <span>View Topics</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Card 3: Question Bank Readiness */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center space-x-2">
              <FileQuestion className="w-4 h-4 text-violet-600" />
              <h3 className="text-sm font-bold text-slate-900">Question Bank</h3>
            </div>
            <span className="text-xs font-mono font-bold bg-violet-50 text-violet-700 px-2 py-0.5 rounded border border-violet-200">
              {progress?.questions_count ?? 0} Questions
            </span>
          </div>

          <div className="space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-600">PYQ Real Exam Questions:</span>
              <span className="font-bold font-mono text-slate-900">
                {progress?.pyq_questions_count ?? 0}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-600">AI Generated Practice:</span>
              <span className="font-bold font-mono text-slate-900">
                {progress?.generated_questions_count ?? 0}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-600">Next Action:</span>
              <span className="font-medium text-slate-800 truncate max-w-[150px]" title={progress?.next_recommended_action || ''}>
                {progress?.next_recommended_action || 'Complete pending tasks'}
              </span>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
            <span className="text-[11px] text-slate-400">Available Practice</span>
            <button
              onClick={() => onNavigate?.('questions')}
              className="text-xs font-bold text-violet-600 hover:text-violet-800 flex items-center space-x-1 cursor-pointer"
            >
              <span>Practice Questions</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Grid: Interactive Tasks Checklist & Important Topics / Evaluations */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Cols: Interactive Subject Study Tasks Checklist */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 flex items-center space-x-2">
                  <CheckSquare className="w-5 h-5 text-indigo-600" />
                  <span>Subject Study Tasks Checklist</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Check tasks to record verified progress. Calculations refresh live and persist across reloads.
                </p>
              </div>

              {/* Task Filters */}
              <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-xl">
                {(['ALL', 'PENDING', 'COMPLETED'] as const).map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setTaskFilter(filter)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                      taskFilter === filter
                        ? 'bg-white text-indigo-700 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {filter === 'ALL' && 'All'}
                    {filter === 'PENDING' && 'Pending'}
                    {filter === 'COMPLETED' && 'Completed'}
                  </button>
                ))}
              </div>
            </div>

            {/* Task Item List */}
            {filteredTasks.length > 0 ? (
              <div className="divide-y divide-slate-100">
                {filteredTasks.map((task) => {
                  const isCompleted = (task.status || '').toUpperCase() === 'COMPLETED';
                  const isToggling = togglingTaskId === task.id;

                  return (
                    <div
                      key={task.id}
                      className={`p-4 flex items-center justify-between transition ${
                        isCompleted ? 'bg-slate-50/60' : 'hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-start space-x-3.5 min-w-0 flex-1">
                        <button
                          onClick={() => handleToggleTaskStatus(task)}
                          disabled={isToggling}
                          className="mt-0.5 text-slate-400 hover:text-indigo-600 transition cursor-pointer disabled:opacity-50"
                        >
                          {isToggling ? (
                            <RefreshCw className="w-5 h-5 animate-spin text-indigo-600" />
                          ) : isCompleted ? (
                            <CheckCircle2 className="w-5 h-5 text-emerald-600 fill-emerald-50" />
                          ) : (
                            <Circle className="w-5 h-5 text-slate-300 hover:text-indigo-500" />
                          )}
                        </button>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center space-x-2">
                            <span
                              className={`text-xs font-bold ${
                                isCompleted ? 'line-through text-slate-400' : 'text-slate-900'
                              }`}
                            >
                              {task.title}
                            </span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                              Day {task.day_number}
                            </span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-50 text-indigo-700">
                              {task.task_type}
                            </span>
                          </div>
                          {task.description && (
                            <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">
                              {task.description}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center space-x-3 shrink-0 ml-4">
                        <span className="text-xs font-mono font-semibold text-slate-400 flex items-center">
                          <Clock className="w-3.5 h-3.5 mr-1" />
                          {task.duration_minutes || 60}m
                        </span>
                        <span
                          className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded ${
                            isCompleted
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}
                        >
                          {isCompleted ? 'Done' : 'Pending'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-12 text-center space-y-3">
                <CheckSquare className="w-10 h-10 text-slate-300 mx-auto" />
                <p className="text-xs text-slate-500 font-medium">
                  {studyPlan
                    ? 'No tasks match the selected filter.'
                    : 'No study plan generated for this subject yet.'}
                </p>
                <button
                  onClick={() => onNavigate?.('plan')}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
                >
                  Generate Subject Study Plan
                </button>
              </div>
            )}
          </div>

          {/* Record Topic Evaluation Score */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                <PlusCircle className="w-4 h-4 text-indigo-600" />
                <span>Record Subject Topic Score</span>
              </h3>
              <span className="text-[11px] text-slate-400">Personalized Diagnostic</span>
            </div>

            {topics.length > 0 ? (
              <form onSubmit={handleSaveScore} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                <div className="space-y-1.5 md:col-span-1">
                  <label className="text-xs font-semibold text-slate-700 block">Select Course Topic</label>
                  <select
                    value={selectedTopicId || ''}
                    onChange={(e) => setSelectedTopicId(parseInt(e.target.value, 10))}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800"
                  >
                    {topics.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between">
                    <label className="text-xs font-semibold text-slate-700">Marks Scored</label>
                    <span className="text-[11px] text-slate-400">Out of Max</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      value={inputScore}
                      onChange={(e) => setInputScore(parseFloat(e.target.value) || 0)}
                      className="w-full p-2 border border-slate-300 rounded-xl text-xs font-bold text-center text-slate-800"
                    />
                    <span className="text-slate-400 font-bold">/</span>
                    <input
                      type="number"
                      step="0.5"
                      min="1"
                      value={inputMax}
                      onChange={(e) => setInputMax(parseFloat(e.target.value) || 1)}
                      className="w-full p-2 border border-slate-300 rounded-xl text-xs font-bold text-center text-slate-800"
                    />
                  </div>
                </div>

                <div>
                  <button
                    type="submit"
                    disabled={savingScore}
                    className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs transition disabled:opacity-50 flex items-center justify-center space-x-1.5 cursor-pointer"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>{savingScore ? 'Updating...' : 'Save Evaluation'}</span>
                  </button>
                </div>
              </form>
            ) : (
              <p className="text-xs text-slate-400">
                Upload course notes or syllabus to extract topics for score recording.
              </p>
            )}
          </div>
        </div>

        {/* Right Col: Important Focus Topics */}
        <div className="space-y-6">
          {/* Important Focus Topics Card */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h4 className="text-xs font-bold uppercase tracking-wider text-rose-600 flex items-center">
                <AlertCircle className="w-4 h-4 mr-1.5" />
                Key Focus Topics ({importantTopicsList.length})
              </h4>
              <span className="text-[10px] text-slate-400 font-mono">
                {selectedSub.code || selectedSub.name}
              </span>
            </div>

            <div className="space-y-2.5">
              {importantTopicsList.length > 0 ? (
                importantTopicsList.slice(0, 6).map((topic) => (
                  <div
                    key={topic.id}
                    className="p-3 bg-slate-50 hover:bg-slate-100/80 border border-slate-200/80 rounded-2xl transition"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-slate-900 truncate pr-2">
                        {topic.name}
                      </span>
                      <PriorityBadge priority={topic.preparation_priority || 'MEDIUM'} className="text-[10px] px-2 py-0.2" />
                    </div>
                    <div className="flex items-center space-x-3 text-[10px] text-slate-500">
                      <span>Weight: {Math.round((topic.syllabus_weight || 0.8) * 100)}%</span>
                      {(topic.pyq_appearances || 0) > 0 && (
                        <span className="text-indigo-600 font-bold">
                          {topic.pyq_appearances} PYQ Qs
                        </span>
                      )}
                      {topic.is_manually_marked && (
                        <span className="text-amber-600 font-bold">Marked</span>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl text-xs text-slate-500 text-center">
                  No topics marked as high priority yet.
                </div>
              )}
            </div>

            <button
              onClick={() => onNavigate?.('topics')}
              className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition flex items-center justify-center space-x-1 cursor-pointer"
            >
              <span>Explore All Topics</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Diagnostic Evaluations */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-xs space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center">
              <Award className="w-4 h-4 mr-1.5 text-indigo-600" />
              Recorded Quiz Evaluations ({performances.length})
            </h4>

            {performances.length > 0 ? (
              <div className="divide-y divide-slate-100 max-h-[300px] overflow-y-auto pr-1">
                {performances.slice(0, 5).map((perf) => {
                  const pct = Math.round((perf.score / (perf.max_score || 10)) * 100);
                  return (
                    <div key={perf.id} className="py-2.5 flex items-center justify-between">
                      <div className="min-w-0 pr-2">
                        <span className="text-xs font-bold text-slate-900 block truncate">
                          {perf.topic_name}
                        </span>
                        <span
                          className={`text-[9px] font-bold px-1.5 py-0.2 rounded border ${
                            pct >= 75
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : pct >= 50
                              ? 'bg-amber-50 text-amber-700 border-amber-200'
                              : 'bg-rose-50 text-rose-700 border-rose-200'
                          }`}
                        >
                          {pct >= 75 ? 'Proficient' : pct >= 50 ? 'Moderate' : 'Needs Practice'}
                        </span>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-xs font-bold font-mono text-slate-900">
                          {perf.score}/{perf.max_score}
                        </span>
                        <span className="text-[10px] text-slate-400 block font-mono">
                          {pct}%
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-slate-400">
                No quiz scores recorded yet for diagnostic tracking.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
