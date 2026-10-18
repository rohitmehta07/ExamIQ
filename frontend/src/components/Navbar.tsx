import React from 'react';
import { Calendar, UserCheck, Shield, Sparkles, MessageSquare, BookOpen } from 'lucide-react';
import { Subject } from '../types';

interface Props {
  currentTab: string;
  userName?: string;
  userRole?: string;
  activeSubject?: Subject | null;
  daysRemaining?: number | null;
  onOpenSurvey: () => void;
  onSwitchUser: (role: 'STUDENT' | 'ADMIN') => void;
  onNavigate?: (tab: string) => void;
}

export const Navbar: React.FC<Props> = ({
  currentTab,
  userName = 'Student',
  userRole = 'STUDENT',
  activeSubject = null,
  daysRemaining = null,
  onOpenSurvey,
  onSwitchUser,
  onNavigate,
}) => {
  const titles: Record<string, { title: string; subtitle: string }> = {
    dashboard: { title: 'Exam Readiness Dashboard', subtitle: 'Evidence-backed daily study focus, active roadmap, and progress tracking.' },
    'my-subjects': { title: 'My Subjects & Progress', subtitle: 'Track your preparation, task completion, and exam dates across all your subjects.' },
    topics: { title: 'Topic Preparation Priority', subtitle: 'Explainable pedagogical ranking combining frequency, marks, recency, and weaknesses.' },
    patterns: { title: 'Exam Pattern Intelligence', subtitle: 'Empirical marks distribution and question types from historical exam papers.' },
    plan: { title: 'Personalized Study Schedule', subtitle: 'Dynamic day-by-day plan with Learn, Practice, Revise, and Mock Test milestones.' },
    questions: { title: 'Question Bank & Marking Criteria', subtitle: 'Verified course exam questions and historical PYQ patterns.' },
    coach: { title: 'Answer Strategy & Writing Coach', subtitle: 'Mark-oriented answer structure, suggested diagrams, keywords, and rubric evaluation.' },
    search: { title: 'Semantic Academic Search', subtitle: 'Conceptual retrieval across lecture slides, notes, and scanned papers.' },
    documents: { title: 'Academic Document Ingestion', subtitle: 'PDF parsing, selective RapidOCR on scanned notes, and automatic classification.' },
    progress: { title: 'My Performance & Strengths', subtitle: 'Personalized strength/weakness inference and topic score management.' },
    about: { title: 'About ExamIQ', subtitle: 'Pedagogical philosophy, architecture, and student exam preparation capabilities.' },
    survey: { title: 'HCI Usability & SUS Research', subtitle: 'Standard System Usability Scale evaluation for human-centered learning.' },
    insights: { title: 'System Architecture & ML Pipeline', subtitle: 'Technical insights for college project presentation and evaluation.' },
  };

  const current = titles[currentTab] || { title: 'ExamIQ', subtitle: 'Intelligent Exam Strategy' };

  return (
    <header className="h-18 bg-white border-b border-slate-200 px-8 flex items-center justify-between shrink-0 shadow-xs">
      <div>
        <h1 className="text-xl font-bold text-slate-800 tracking-tight">{current.title}</h1>
        <p className="text-xs text-slate-500 font-medium">{current.subtitle}</p>
      </div>

      <div className="flex items-center space-x-3.5">
        {/* Dynamic Countdown or Subject Badge */}
        {activeSubject && daysRemaining !== null && daysRemaining !== undefined && daysRemaining >= 0 ? (
          <div
            onClick={() => onNavigate && onNavigate('my-subjects')}
            title="Click to view all subjects"
            className="hidden lg:flex items-center space-x-2 px-3 py-1.5 bg-indigo-50 border border-indigo-200/80 rounded-xl cursor-pointer hover:bg-indigo-100 transition"
          >
            <Calendar className="w-4 h-4 text-indigo-600" />
            <span className="text-xs font-semibold text-indigo-900">
              {activeSubject.code || activeSubject.name} in <strong className="text-indigo-700">{daysRemaining} Days</strong>
            </span>
          </div>
        ) : activeSubject ? (
          <div
            onClick={() => onNavigate && onNavigate('my-subjects')}
            title="Click to view all subjects"
            className="hidden lg:flex items-center space-x-2 px-3 py-1.5 bg-slate-100 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-200 transition"
          >
            <BookOpen className="w-4 h-4 text-slate-600" />
            <span className="text-xs font-semibold text-slate-700">
              {activeSubject.code || activeSubject.name}
            </span>
          </div>
        ) : null}

        {/* HCI Survey Quick Launch */}
        <button
          onClick={onOpenSurvey}
          className="flex items-center space-x-1.5 px-3 py-1.5 bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-800 rounded-xl text-xs font-semibold transition cursor-pointer"
          title="Give Usability Feedback"
        >
          <MessageSquare className="w-3.5 h-3.5 text-amber-600" />
          <span>HCI Survey</span>
        </button>

        {/* Active User Account Badge */}
        <div className="flex items-center space-x-2 px-3 py-1.5 bg-slate-100/80 border border-slate-200 rounded-xl">
          <div className="w-6 h-6 rounded-lg bg-indigo-600 text-white flex items-center justify-center text-[11px] font-bold">
            {userName ? userName.charAt(0).toUpperCase() : 'U'}
          </div>
          <div className="text-left">
            <span className="text-xs font-bold text-slate-800 block leading-tight">{userName || 'Student'}</span>
            <span className="text-[10px] text-slate-500 font-medium capitalize">{userRole.toLowerCase()} Account</span>
          </div>
        </div>

        {/* Demo Data Quick Switcher */}
        <div className="hidden xl:flex items-center space-x-1 bg-slate-50 p-1 rounded-xl border border-slate-200">
          <button
            onClick={() => onSwitchUser('STUDENT')}
            className="flex items-center space-x-1 px-2.5 py-1 rounded-lg text-[11px] font-medium text-slate-600 hover:text-indigo-600 hover:bg-white transition cursor-pointer"
            title="Load Pre-populated Demo Student (Aarav Sharma)"
          >
            <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Demo Student</span>
          </button>
        </div>
      </div>
    </header>
  );
};
