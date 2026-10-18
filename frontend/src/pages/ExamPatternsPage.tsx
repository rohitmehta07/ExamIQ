import React, { useState, useEffect } from 'react';
import { BarChart3, PieChart, Layers, HelpCircle, ShieldCheck, FileText, ArrowRight } from 'lucide-react';
import { api } from '../services/api';
import { ExamPatternData } from '../types';

interface Props {
  onNavigate: (tab: string) => void;
}

export const ExamPatternsPage: React.FC<Props> = ({ onNavigate }) => {
  const [pattern, setPattern] = useState<ExamPatternData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPattern();
  }, []);

  const loadPattern = async () => {
    setLoading(true);
    try {
      const data = await api.getExamPattern();
      setPattern(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !pattern) {
    return (
      <div className="p-8 text-center text-slate-500 text-sm">
        Analyzing historical examination distributions...
      </div>
    );
  }

  // Find max appearances for scaling bar charts
  const maxAppearances = Math.max(...pattern.topic_patterns.map((t) => t.historical_appearances), 1);
  const maxMarksCount = Math.max(...Object.values(pattern.marks_distribution), 1);
  const maxTypeCount = Math.max(...Object.values(pattern.question_type_distribution), 1);

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-black text-slate-900 tracking-tight">Exam Pattern Intelligence</h2>
        <p className="text-xs text-slate-500 max-w-2xl leading-relaxed">
          Empirical pattern analysis derived directly from authenticated university question papers. No synthetic or hallucinated exam questions.
        </p>
      </div>

      {/* Dataset Attribution Alert */}
      <div className="p-4 bg-slate-900 text-white rounded-2xl flex items-start justify-between gap-4 border border-slate-800">
        <div className="flex items-start space-x-3">
          <ShieldCheck className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="text-xs font-bold text-indigo-300 uppercase tracking-wider block">
              Corpus Evidence Basis
            </span>
            <p className="text-xs text-slate-300 leading-relaxed">
              Analyzed {pattern.total_papers_analyzed} primary question paper collections (including IIIT Pune Semester 5 Mid-Term 2025 examination) spanning {pattern.total_questions} verified questions.
            </p>
          </div>
        </div>
        <button
          onClick={() => onNavigate('questions')}
          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 shrink-0 transition"
        >
          View All Questions
        </button>
      </div>

      {/* Grid of 2 Distribution Visualizations */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Marks Distribution */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-xs space-y-4">
          <div className="flex items-center space-x-2">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
              <BarChart3 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Marks Distribution per Question</h3>
              <p className="text-[11px] text-slate-500">Weight of questions in historical papers</p>
            </div>
          </div>

          <div className="space-y-3 pt-2">
            {Object.entries(pattern.marks_distribution).map(([bucket, count]) => {
              const pct = Math.round((count / maxMarksCount) * 100);
              return (
                <div key={bucket} className="space-y-1">
                  <div className="flex justify-between text-xs font-semibold text-slate-700">
                    <span>{bucket}</span>
                    <span className="font-mono text-indigo-700">{count} Questions</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-indigo-600 h-full rounded-full transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Question Type Distribution */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-xs space-y-4">
          <div className="flex items-center space-x-2">
            <div className="p-2 bg-violet-50 text-violet-600 rounded-lg">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Question-Type Variety</h3>
              <p className="text-[11px] text-slate-500">Cognitive taxonomy of exam questions</p>
            </div>
          </div>

          <div className="space-y-3 pt-2">
            {Object.entries(pattern.question_type_distribution).map(([qType, count]) => {
              const pct = Math.round((count / maxTypeCount) * 100);
              return (
                <div key={qType} className="space-y-1">
                  <div className="flex justify-between text-xs font-semibold text-slate-700">
                    <span>{qType}</span>
                    <span className="font-mono text-violet-700">{count} Questions</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-violet-600 h-full rounded-full transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Topic Recurrence Table with Evidence Citations */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900">Historical Topic Recurrence & Evidence</h3>
            <p className="text-xs text-slate-500">Tracked appearances across Semester 5 Mid-Sem papers and authenticated archives</p>
          </div>
          <span className="text-xs font-semibold bg-slate-100 text-slate-600 px-3 py-1 rounded-xl">
            {pattern.topic_patterns.length} Topics Tracked
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 text-slate-400 font-bold uppercase tracking-wider border-b border-slate-200">
                <th className="py-3 px-6">Topic Name</th>
                <th className="py-3 px-4">Historical Appearances</th>
                <th className="py-3 px-4">Average Marks</th>
                <th className="py-3 px-4">Question Types</th>
                <th className="py-3 px-6">Source Evidence</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {pattern.topic_patterns.map((item, idx) => {
                const barWidth = Math.round((item.historical_appearances / maxAppearances) * 100);
                return (
                  <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-4 px-6 font-bold text-slate-900">
                      {item.topic}
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center space-x-2">
                        <span className="font-mono font-bold text-slate-900 w-6">
                          {item.historical_appearances}
                        </span>
                        <div className="w-20 bg-slate-100 h-2 rounded-full overflow-hidden hidden sm:block">
                          <div
                            className="bg-indigo-600 h-full rounded-full"
                            style={{ width: `${barWidth}%` }}
                          ></div>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4 font-mono font-semibold text-slate-800">
                      {item.avg_marks.toFixed(1)} M
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex flex-wrap gap-1">
                        {item.question_types.map((qt, qIdx) => (
                          <span
                            key={qIdx}
                            className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 text-[10px] font-semibold"
                          >
                            {qt}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="py-4 px-6 text-slate-500 text-[11px] font-normal">
                      <span className="inline-flex items-center text-slate-600">
                        <FileText className="w-3.5 h-3.5 mr-1 text-slate-400 shrink-0" />
                        {item.evidence}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
