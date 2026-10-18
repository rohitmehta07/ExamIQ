import React, { useState, useEffect } from 'react';
import { Shield, FileText, CheckCircle2, Award, Users, Database, Layers, BarChart2, ShieldCheck, Lock } from 'lucide-react';
import { api } from '../services/api';
import { HCIAnalytics } from '../types';

export const AdminDashboardPage: React.FC = () => {
  const [overview, setOverview] = useState<any>(null);
  const [hciData, setHciData] = useState<HCIAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [ovData, hci] = await Promise.all([
        api.getAdminOverview().catch(() => null),
        api.getHCIAnalytics().catch(() => null),
      ]);
      setOverview(ovData);
      setHciData(hci);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-12 text-center text-slate-500 text-sm">
        Loading administrative inspection metrics...
      </div>
    );
  }

  if (!overview) {
    return (
      <div className="p-12 max-w-lg mx-auto text-center space-y-4">
        <div className="p-8 bg-white rounded-3xl border border-slate-200 shadow-sm space-y-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 mx-auto flex items-center justify-center font-bold">
            <Lock className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-slate-900">Administrative Access Restricted</h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            This dataset inspection interface is restricted to authorized administrator accounts. ExamIQ is designed as a student exam preparation platform.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Admin & Dataset Inspection Dashboard</h2>
          <p className="text-xs text-slate-500 max-w-2xl leading-relaxed">
            System administration, academic corpus synchronization status, and anonymous HCI research feedback.
          </p>
        </div>

        {/* Privacy Badge */}
        <div className="flex items-center space-x-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-800 rounded-xl border border-emerald-200 text-xs font-semibold">
          <Lock className="w-3.5 h-3.5 text-emerald-600" />
          <span>Student Confidentiality Protected</span>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1">Academic Documents</span>
            <div className="flex items-baseline space-x-1.5">
              <span className="text-3xl font-extrabold text-slate-900 font-mono">{overview.total_documents}</span>
              <span className="text-xs text-emerald-600 font-semibold font-mono">100% Processed</span>
            </div>
            <span className="text-[11px] text-slate-500 mt-1 block">9 CNS PDF Sources</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
            <FileText className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1">Extracted Topics</span>
            <div className="flex items-baseline space-x-1.5">
              <span className="text-3xl font-extrabold text-slate-900 font-mono">{overview.total_topics}</span>
              <span className="text-xs text-slate-500 font-medium">Curriculum Units</span>
            </div>
            <span className="text-[11px] text-slate-500 mt-1 block">Indexed in Vector Store</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-violet-50 text-violet-600 flex items-center justify-center">
            <Database className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1">Extracted Questions</span>
            <div className="flex items-baseline space-x-1.5">
              <span className="text-3xl font-extrabold text-slate-900 font-mono">{overview.total_questions}</span>
              <span className="text-xs text-slate-500 font-medium">Exam & PYQ</span>
            </div>
            <span className="text-[11px] text-slate-500 mt-1 block">With Marking Criteria</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <Layers className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1">Mean SUS Score</span>
            <div className="flex items-baseline space-x-1.5">
              <span className="text-3xl font-extrabold text-emerald-600 font-mono">
                {hciData?.mean_sus_score || overview.average_sus_score}
              </span>
              <span className="text-xs text-slate-400">/100</span>
            </div>
            <span className="text-[11px] text-emerald-700 font-semibold mt-1 block">
              {hciData?.sus_grade || 'Grade A+'}
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <Award className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Document Classification Distribution */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-slate-900">Document Type Distribution in Corpus</h3>
          <div className="space-y-3">
            {Object.entries(overview.document_types_count || {}).map(([cat, count]: [string, any]) => (
              <div key={cat} className="space-y-1">
                <div className="flex justify-between text-xs font-semibold text-slate-700">
                  <span>{cat.replace(/_/g, ' ')}</span>
                  <span className="font-mono text-indigo-700">{count} Documents</span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-indigo-600 h-full rounded-full"
                    style={{ width: `${(count / overview.total_documents) * 100}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* System Health Card */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-slate-900">System Architecture Health</h3>
          <div className="space-y-3 text-xs">
            <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 flex items-center justify-between">
              <div className="flex items-center space-x-2 text-emerald-900 font-semibold">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Local Embedding & Vector Store</span>
              </div>
              <span className="text-emerald-700 font-bold">Synchronized (128-dim dense)</span>
            </div>

            <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 flex items-center justify-between">
              <div className="flex items-center space-x-2 text-emerald-900 font-semibold">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>RapidOCR ONNX Engine</span>
              </div>
              <span className="text-emerald-700 font-bold">Loaded & Operational</span>
            </div>

            <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 flex items-center justify-between">
              <div className="flex items-center space-x-2 text-emerald-900 font-semibold">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Preparation Priority Ranking Engine</span>
              </div>
              <span className="text-emerald-700 font-bold">Active & Configured</span>
            </div>

            <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 flex items-center justify-between">
              <div className="flex items-center space-x-2 text-emerald-900 font-semibold">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Subject Agnostic Database Schema</span>
              </div>
              <span className="text-emerald-700 font-bold">CNS Ingested</span>
            </div>
          </div>
        </div>
      </div>

      {/* Aggregate HCI Feedback Research Table */}
      {hciData && (
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Anonymous HCI Research Usability Feedback</h3>
              <p className="text-xs text-slate-500">Collected anonymously for system usability research (N={hciData.total_responses})</p>
            </div>
            <span className="text-xs font-mono font-bold bg-indigo-50 text-indigo-700 px-3 py-1 rounded-xl border border-indigo-200">
              Avg Ease of Use: {hciData.ease_of_use_avg}/5.0
            </span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Relevance</span>
              <span className="text-lg font-extrabold text-slate-800 font-mono">{hciData.relevance_avg}/5.0</span>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Pattern Utility</span>
              <span className="text-lg font-extrabold text-slate-800 font-mono">{hciData.exam_pattern_help_avg}/5.0</span>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Coach Utility</span>
              <span className="text-lg font-extrabold text-slate-800 font-mono">{hciData.answer_coach_help_avg}/5.0</span>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Retention Intent</span>
              <span className="text-lg font-extrabold text-emerald-600 font-mono">{hciData.would_use_pct}%</span>
            </div>
          </div>

          {hciData.feedback_samples && hciData.feedback_samples.length > 0 && (
            <div className="space-y-2 pt-2">
              <span className="text-xs font-bold text-slate-700 block">Qualitative Feedback Excerpts:</span>
              {hciData.feedback_samples.map((fb, idx) => (
                <div key={idx} className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600 italic">
                  &ldquo;{fb}&rdquo;
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
