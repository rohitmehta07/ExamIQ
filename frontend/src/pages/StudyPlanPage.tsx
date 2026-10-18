import React, { useState, useEffect } from 'react';
import {
  CalendarDays, Clock, CheckCircle2, Circle, RotateCcw, AlertTriangle,
  Sparkles, ArrowRight, Filter, ChevronRight, PenTool, BookOpen, Printer, Download
} from 'lucide-react';
import { api } from '../services/api';
import { StudyPlan, StudyTask } from '../types';
import { PriorityBadge } from '../components/PriorityBadge';

interface Props {
  onNavigate: (tab: string) => void;
  onOpenOnboarding: () => void;
}

export const StudyPlanPage: React.FC<Props> = ({ onNavigate, onOpenOnboarding }) => {
  const [plan, setPlan] = useState<StudyPlan | null>(null);
  const [currentSubject, setCurrentSubject] = useState<{ name: string; code?: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState<number | 'ALL'>('ALL');
  const [filterType, setFilterType] = useState<string>('ALL');

  useEffect(() => {
    loadPlan();
  }, []);

  const loadPlan = async () => {
    setLoading(true);
    try {
      const [data, subs, prof] = await Promise.all([
        api.getStudyPlan(),
        api.getSubjects().catch(() => []),
        api.getProfile().catch(() => null),
      ]);
      setPlan(data);
      if (subs.length > 0) {
        const active = subs.find((s) => s.id === prof?.subject_id) || subs[0];
        setCurrentSubject(active);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (task: StudyTask) => {
    const newStatus = task.status === 'COMPLETED' ? 'PENDING' : 'COMPLETED';
    try {
      await api.updateTaskStatus(task.id, newStatus);
      loadPlan();
    } catch (err: any) {
      alert(`Error updating task: ${err.message}`);
    }
  };

  const handleReschedule = async (task: StudyTask) => {
    const newDay = task.day_number + 1;
    try {
      await api.rescheduleTask(task.id, newDay);
      loadPlan();
    } catch (err: any) {
      alert(`Error rescheduling task: ${err.message}`);
    }
  };

  const handleExportPlan = () => {
    if (!plan || !plan.tasks) return;
    const subTitle = currentSubject ? `${currentSubject.name} ${currentSubject.code ? `(${currentSubject.code})` : ''}` : 'Course Study Plan';
    let content = `# ExamIQ - Study Schedule\nSubject: ${subTitle}\nGenerated: ${new Date().toLocaleDateString()}\nExam Date: ${plan.exam_date || 'TBD'}\n\n`;
    const days = Array.from(new Set(plan.tasks.map((t) => t.day_number))).sort((a, b) => a - b);
    days.forEach((day) => {
      content += `## Day ${day}\n`;
      const dayTasks = plan.tasks.filter((t) => t.day_number === day);
      dayTasks.forEach((t) => {
        content += `- [${t.status === 'COMPLETED' ? 'x' : ' '}] [${t.task_type}] ${t.topic_name || t.title} (${t.duration_minutes || 60} mins)\n`;
      });
      content += '\n';
    });
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'ExamIQ_Study_Schedule.md';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="p-8 text-center text-slate-500 text-sm">
        Synthesizing personalized study timeline...
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="p-8 max-w-4xl mx-auto space-y-8">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Personalized Study Schedule</h2>
          <p className="text-xs text-slate-500 max-w-xl leading-relaxed">
            Your customized roadmap toward the university examination.
          </p>
        </div>

        <div className="bg-white rounded-3xl p-12 border border-slate-200/90 shadow-sm text-center space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center mx-auto text-indigo-600">
            <CalendarDays className="w-8 h-8" />
          </div>
          <div className="space-y-2 max-w-md mx-auto">
            <h3 className="text-xl font-bold text-slate-900">No Active Study Schedule</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              You haven't generated your personalized schedule yet. ExamIQ can build an optimized day-by-day sequence tailored to your available daily hours, target score, and weak topics.
            </p>
          </div>
          <div>
            <button
              onClick={onOpenOnboarding}
              className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-600/25 transition cursor-pointer"
            >
              Generate My Study Schedule
            </button>
          </div>
        </div>
      </div>
    );
  }

  const tasks = plan.tasks || [];
  const completedCount = tasks.filter((t) => t.status === 'COMPLETED').length;
  const progressPct = tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : 0;

  // Group days
  const allDays = Array.from(new Set(tasks.map((t) => t.day_number))).sort((a, b) => a - b);

  const filteredTasks = tasks.filter((t) => {
    if (selectedDay !== 'ALL' && t.day_number !== selectedDay) return false;
    if (filterType !== 'ALL' && t.task_type !== filterType) return false;
    return true;
  });

  const getTaskTypeBadge = (type: string) => {
    if (type === 'MOCK_TEST') {
      return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-700 border border-rose-200">Mock Test</span>;
    } else if (type === 'REVISE') {
      return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-700 border border-emerald-200">Revision</span>;
    } else if (type === 'PRACTICE') {
      return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-700 border border-amber-200">Practice</span>;
    }
    return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-700 border border-indigo-200">Learn</span>;
  };

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      {/* Header and Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Personalized Study Schedule</h2>
          <p className="text-xs text-slate-500 max-w-xl leading-relaxed">
            {plan?.total_days || 14}-Day preparation timeline targeted toward the Nov 15, 2026 examination date.
          </p>
        </div>

        <div className="flex items-center space-x-2.5">
          <button
            onClick={handleExportPlan}
            className="flex items-center space-x-1.5 px-3 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-xl text-xs font-semibold shadow-xs transition cursor-pointer"
            title="Download Markdown Schedule"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Export Plan</span>
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center space-x-1.5 px-3 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-xl text-xs font-semibold shadow-xs transition cursor-pointer"
            title="Print Schedule"
          >
            <Printer className="w-3.5 h-3.5 text-slate-500" />
            <span>Print</span>
          </button>
          <button
            onClick={onOpenOnboarding}
            className="flex items-center space-x-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-md shadow-indigo-600/20 transition cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Regenerate Plan</span>
          </button>
        </div>
      </div>

      {/* Progress Card */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Preparation Progress</span>
          <div className="flex items-baseline space-x-2">
            <span className="text-3xl font-extrabold text-slate-900 font-mono">{progressPct}%</span>
            <span className="text-xs font-semibold text-slate-500">
              ({completedCount} of {tasks.length} tasks completed)
            </span>
          </div>
          <div className="w-72 bg-slate-100 h-2 rounded-full overflow-hidden mt-2">
            <div
              className="bg-gradient-to-r from-indigo-500 to-emerald-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${progressPct}%` }}
            ></div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 text-center divide-x divide-slate-100">
          <div className="px-3">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Duration</span>
            <span className="text-sm font-bold text-slate-800 block">{plan?.total_days || 14} Days</span>
          </div>
          <div className="px-3">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Total Hours</span>
            <span className="text-sm font-bold text-slate-800 block font-mono">{plan?.total_hours || 42} Hrs</span>
          </div>
          <div className="px-3">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Daily Pacing</span>
            <span className="text-sm font-bold text-indigo-600 block">3.0 Hrs/Day</span>
          </div>
        </div>
      </div>

      {/* Filter and Day Pills */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Day selector pills */}
        <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 max-w-full">
          <button
            onClick={() => setSelectedDay('ALL')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition shrink-0 ${
              selectedDay === 'ALL'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-white border text-slate-600 hover:bg-slate-50'
            }`}
          >
            All Days ({tasks.length})
          </button>
          {allDays.map((d) => {
            const count = tasks.filter((t) => t.day_number === d).length;
            const isDayDone = tasks.filter((t) => t.day_number === d).every((t) => t.status === 'COMPLETED');
            return (
              <button
                key={d}
                onClick={() => setSelectedDay(d)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition shrink-0 flex items-center space-x-1.5 ${
                  selectedDay === d
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-white border text-slate-600 hover:bg-slate-50'
                }`}
              >
                <span>Day {d}</span>
                {isDayDone && <CheckCircle2 className="w-3 h-3 text-emerald-400" />}
              </button>
            );
          })}
        </div>

        {/* Task Type Filters */}
        <div className="flex items-center space-x-1 shrink-0 bg-slate-100 p-1 rounded-xl">
          {['ALL', 'LEARN', 'PRACTICE', 'REVISE', 'MOCK_TEST'].map((type) => (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition ${
                filterType === type
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {type === 'ALL' ? 'All Types' : type}
            </button>
          ))}
        </div>
      </div>

      {/* Tasks List */}
      <div className="space-y-4">
        {filteredTasks.length > 0 ? (
          filteredTasks.map((task) => {
            const isCompleted = task.status === 'COMPLETED';
            return (
              <div
                key={task.id}
                className={`bg-white rounded-2xl border p-5 transition-all flex flex-col md:flex-row md:items-center justify-between gap-5 ${
                  isCompleted
                    ? 'border-slate-200 bg-slate-50/60 opacity-60'
                    : 'border-slate-200/90 shadow-xs hover:border-indigo-300'
                }`}
              >
                <div className="flex items-start space-x-4">
                  <button
                    onClick={() => handleToggleStatus(task)}
                    className="mt-1 text-slate-400 hover:text-indigo-600 transition shrink-0"
                  >
                    {isCompleted ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    ) : (
                      <Circle className="w-5 h-5" />
                    )}
                  </button>

                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-extrabold text-slate-800 bg-slate-100 px-2 py-0.5 rounded">
                        Day {task.day_number}
                      </span>
                      {getTaskTypeBadge(task.task_type)}
                      <PriorityBadge priority={task.priority} />
                      <span className="text-xs text-slate-400 flex items-center font-medium">
                        <Clock className="w-3 h-3 mr-1" />
                        {task.duration_minutes} min
                      </span>
                      {task.scheduled_date && (
                        <span className="text-xs text-slate-400 font-mono">
                          {task.scheduled_date}
                        </span>
                      )}
                    </div>

                    <h4 className={`text-sm font-bold text-slate-900 ${isCompleted ? 'line-through text-slate-500' : ''}`}>
                      {task.title}
                    </h4>

                    <p className="text-xs text-slate-600 leading-relaxed max-w-2xl">
                      {task.description}
                    </p>

                    {task.resources && task.resources.length > 0 && (
                      <div className="flex items-center space-x-1.5 text-[11px] text-slate-400 pt-1">
                        <BookOpen className="w-3 h-3 text-slate-400" />
                        <span>Resources: {task.resources.join(', ')}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center space-x-2 shrink-0 md:self-center">
                  <button
                    onClick={() => onNavigate('coach')}
                    className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold rounded-xl border border-indigo-200 transition flex items-center space-x-1"
                  >
                    <PenTool className="w-3.5 h-3.5" />
                    <span>Answer Coach</span>
                  </button>

                  <button
                    onClick={() => handleReschedule(task)}
                    className="px-3 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-medium rounded-xl transition"
                    title="Move to next day"
                  >
                    Reschedule (+1 Day)
                  </button>

                  <button
                    onClick={() => handleToggleStatus(task)}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition ${
                      isCompleted
                        ? 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                        : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
                    }`}
                  >
                    {isCompleted ? 'Mark Pending' : 'Complete'}
                  </button>
                </div>
              </div>
            );
          })
        ) : (
          <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 text-slate-400 text-xs">
            No tasks found matching the selected filters.
          </div>
        )}
      </div>
    </div>
  );
};
