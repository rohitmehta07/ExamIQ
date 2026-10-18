import React from 'react';
import {
  LayoutDashboard,
  Target,
  BarChart3,
  CalendarDays,
  FileQuestion,
  PenTool,
  Search,
  FileText,
  LineChart,
  Cpu,
  LogOut,
  Sparkles,
  ClipboardCheck,
  GraduationCap,
  BookOpen,
  Plus,
  Info
} from 'lucide-react';
import { Subject } from '../types';

interface Props {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  userRole?: string;
  userName?: string;
  activeSubject?: Subject | null;
  onLogout: () => void;
  onAddSubject?: () => void;
}

export const Sidebar: React.FC<Props> = ({
  activeTab,
  setActiveTab,
  userRole = 'STUDENT',
  userName = 'Student',
  activeSubject = null,
  onLogout,
  onAddSubject,
}) => {
  const academicItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'my-subjects', label: 'My Subjects', icon: BookOpen },
    { id: 'topics', label: 'Topic Priority', icon: Target },
    { id: 'patterns', label: 'Exam Patterns', icon: BarChart3 },
    { id: 'plan', label: 'Study Plan', icon: CalendarDays },
    { id: 'questions', label: 'Question Bank', icon: FileQuestion },
    { id: 'coach', label: 'Answer Coach', icon: PenTool },
    { id: 'search', label: 'Academic Search', icon: Search },
    { id: 'documents', label: 'Course Documents', icon: FileText },
    { id: 'progress', label: 'My Progress', icon: LineChart },
  ];

  const aboutItems = [
    { id: 'about', label: 'About the App', icon: Info },
    { id: 'survey', label: 'HCI Usability Survey', icon: ClipboardCheck },
    { id: 'insights', label: 'System Insights', icon: Cpu },
  ];

  return (
    <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col shrink-0 border-r border-slate-800 select-none min-h-screen">
      {/* Brand Header */}
      <div className="p-5 border-b border-slate-800/80">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-violet-500 flex items-center justify-center text-white shadow-lg shadow-indigo-500/30">
            <GraduationCap className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-1.5">
              <span className="font-extrabold text-white text-lg tracking-tight">EXAMIQ</span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                v1.0
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium line-clamp-1">Intelligent Exam Strategy</p>
          </div>
        </div>

        {/* Current Dynamic Subject Chip */}
        {activeSubject ? (
          <div
            onClick={() => setActiveTab('my-subjects')}
            title="Click to view or switch subjects"
            className="mt-4 p-2.5 bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 rounded-xl flex items-center justify-between cursor-pointer transition group"
          >
            <div className="flex items-center space-x-2 min-w-0">
              <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0 animate-pulse"></span>
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Active Subject</p>
                <p className="text-xs font-semibold text-slate-200 truncate group-hover:text-indigo-300">
                  {activeSubject.code || activeSubject.name}
                </p>
              </div>
            </div>
            <span className="text-[10px] font-medium bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-full border border-indigo-500/30 shrink-0">
              {activeSubject.semester || 'Active'}
            </span>
          </div>
        ) : (
          <div
            onClick={onAddSubject || (() => setActiveTab('my-subjects'))}
            title="Click to add a subject"
            className="mt-4 p-2.5 bg-indigo-950/40 hover:bg-indigo-900/40 border border-indigo-800/60 rounded-xl flex items-center justify-between cursor-pointer transition"
          >
            <div className="flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0"></span>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-300">No Subject</p>
                <p className="text-xs font-semibold text-white">+ Add Subject</p>
              </div>
            </div>
            <Plus className="w-3.5 h-3.5 text-indigo-400" />
          </div>
        )}
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {/* Academic Modules Group */}
        <div className="flex items-center justify-between px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
          <span>Academic Modules</span>
          <button
            onClick={onAddSubject || (() => setActiveTab('my-subjects'))}
            title="Add Subject"
            className="hover:text-indigo-400 transition"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>
        {academicItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                isActive
                  ? 'bg-indigo-600 text-white font-semibold shadow-md shadow-indigo-600/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
              <span className="truncate">{item.label}</span>
              {item.id === 'coach' && (
                <span className="ml-auto text-[9px] font-bold bg-amber-400/20 text-amber-300 px-1.5 py-0.5 rounded border border-amber-400/30">
                  AI Coach
                </span>
              )}
            </button>
          );
        })}

        {/* About ExamIQ Group */}
        <div className="pt-4 mt-3 border-t border-slate-800/80">
          <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
            About ExamIQ
          </div>
          {aboutItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                  isActive
                    ? 'bg-indigo-600 text-white font-semibold shadow-md shadow-indigo-600/20'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* User Footer */}
      <div className="p-3 border-t border-slate-800/80 bg-slate-950/40">
        <div className="p-2.5 bg-slate-800/40 border border-slate-700/40 rounded-xl flex items-center justify-between">
          <div className="flex items-center space-x-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-indigo-900/60 border border-indigo-700/50 flex items-center justify-center text-xs font-bold text-indigo-300 shrink-0">
              {userName.charAt(0)}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-slate-200 truncate">{userName}</p>
              <p className="text-[10px] text-slate-400 capitalize">{userRole.toLowerCase()}</p>
            </div>
          </div>
          <button
            onClick={onLogout}
            title="Log Out"
            className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
};
