import React from 'react';
import {
  GraduationCap,
  Target,
  BookOpen,
  CalendarDays,
  FileQuestion,
  PenTool,
  Search,
  FileText,
  LineChart,
  Sparkles,
  CheckCircle2,
  Clock,
  Layers,
  Cpu,
  ArrowRight,
  ShieldAlert,
  ClipboardCheck,
  AlertCircle
} from 'lucide-react';

interface Props {
  onNavigate: (tab: string) => void;
  onOpenSurvey: () => void;
}

export const AboutPage: React.FC<Props> = ({ onNavigate, onOpenSurvey }) => {
  return (
    <div className="p-8 space-y-10 max-w-6xl mx-auto">
      {/* Hero Header */}
      <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-8 md:p-10 text-white shadow-xl border border-slate-800 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="relative z-10 space-y-4">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-xs font-semibold">
            <GraduationCap className="w-4 h-4 text-indigo-300" />
            <span>Student Exam Preparation Platform • v1.0</span>
          </div>

          <h1 className="text-3xl md:text-4xl font-black tracking-tight text-white">
            About <span className="bg-gradient-to-r from-indigo-300 via-purple-300 to-pink-300 bg-clip-text text-transparent">ExamIQ</span>
          </h1>

          <p className="text-sm md:text-base text-slate-300 max-w-3xl leading-relaxed">
            ExamIQ is an evidence-backed study companion engineered exclusively for university students.
            It transforms fragmented course materials, lecture slides, syllabus outlines, and past exam papers
            into a focused, subject-specific revision strategy.
          </p>

          <div className="pt-2 flex flex-wrap gap-3">
            <button
              onClick={() => onNavigate('dashboard')}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition shadow-md shadow-indigo-600/30 cursor-pointer"
            >
              Go to Dashboard
            </button>
            <button
              onClick={onOpenSurvey}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold rounded-xl transition cursor-pointer flex items-center space-x-1.5"
            >
              <ClipboardCheck className="w-3.5 h-3.5 text-amber-400" />
              <span>Take Usability Survey</span>
            </button>
          </div>
        </div>
      </div>

      {/* The Problem & The Solution */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-7 rounded-2xl border border-slate-200 shadow-xs space-y-3">
          <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <h2 className="text-base font-bold text-slate-900">The Problem: Revision Overload & Uncertainty</h2>
          <p className="text-xs text-slate-600 leading-relaxed">
            During exam preparation, university students often face hundreds of pages of unorganized slides, dense textbooks,
            and scattered past question papers. Without structured guidance, students struggle to identify which topics carry
            historical exam weight, waste time on low-yield material, and lack mark-oriented answer structures.
          </p>
        </div>

        <div className="bg-white p-7 rounded-2xl border border-slate-200 shadow-xs space-y-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
            <Sparkles className="w-5 h-5" />
          </div>
          <h2 className="text-base font-bold text-slate-900">The Solution: Subject-Grounded Exam Strategy</h2>
          <p className="text-xs text-slate-600 leading-relaxed">
            ExamIQ provides a personalized, subject-isolated revision pipeline. It extracts key concepts from uploaded notes,
            maps historical previous-year questions to topics, balances pedagogical priorities, suggests structured answer outlines
            with source references, and tracks genuine study completion without guesswork.
          </p>
        </div>
      </div>

      {/* How ExamIQ Works: Core Architecture */}
      <div className="space-y-4">
        <div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight">How ExamIQ Works</h2>
          <p className="text-xs text-slate-500">Every feature is built around the student's authenticated account and selected subject.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {/* Module 1 */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
            <div className="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <BookOpen className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">1. Subject & Document Ingestion</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Organize study materials under distinct subjects. ExamIQ parses digital PDFs via PyMuPDF and utilizes an OCR fallback
              for scanned handouts. All documents and embeddings are strictly isolated per subject and student.
            </p>
          </div>

          {/* Module 2 */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
            <div className="w-9 h-9 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
              <Target className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">2. Explainable Topic Priority</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Topics are ranked using an explainable formula: Historical Frequency (25%), Marks Weight (25%), Recency (15%),
              Syllabus Core (15%), Question Variety (10%), and Student Weakness (10%). Students can also manually flag topics as important.
            </p>
          </div>

          {/* Module 3 */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CalendarDays className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">3. Study Schedule & Progress</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Generates a four-phase study plan (Learn, Practice, Revise, Mock Test) tailored to remaining days before the exam.
              Task completion is independently tracked per subject, ensuring completed tasks reflect genuine revision effort.
            </p>
          </div>

          {/* Module 4 */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
            <div className="w-9 h-9 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <FileQuestion className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">4. Question Bank & Generation</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Consolidates previous-year exam questions (PYQs) and generates targeted practice questions from ordinary study notes.
              Every question clearly shows its origin badge (<code className="text-[11px] bg-slate-100 px-1 py-0.5 rounded">PYQ</code> or <code className="text-[11px] bg-slate-100 px-1 py-0.5 rounded">AI_GENERATED</code>) so students know what has actually appeared on past exams.
            </p>
          </div>

          {/* Module 5 */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
            <div className="w-9 h-9 rounded-lg bg-pink-50 text-pink-600 flex items-center justify-center">
              <PenTool className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">5. Answer Strategy Coach</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Provides step-by-step answering strategies based on mark allocations (2-mark definitions, 5-mark explanations, 10-mark architectures).
              Suggestions include essential keywords, recommended diagrams, and source citations from your uploaded materials.
            </p>
          </div>

          {/* Module 6 */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
            <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Search className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">6. Semantic Academic Search</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Combines keyword matching and 128-dimensional dense vector embeddings to search across slides, notes, and question papers.
              Retrieval is strictly constrained to the authenticated user and selected subject, preventing cross-subject contamination.
            </p>
          </div>
        </div>
      </div>

      {/* Feature Reality & Transparency */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-6">
        <div>
          <h2 className="text-base font-bold text-slate-900">Capabilities & Transparency</h2>
          <p className="text-xs text-slate-500">ExamIQ is honest about what is currently working versus future research goals.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <div className="flex items-center space-x-2 text-emerald-700 font-bold text-xs uppercase tracking-wider">
              <CheckCircle2 className="w-4 h-4" />
              <span>Available & Verified Features (v1.0)</span>
            </div>
            <ul className="space-y-2 text-xs text-slate-600">
              <li className="flex items-start space-x-2">
                <span className="text-emerald-500 font-bold">✓</span>
                <span>Subject-wise isolation across documents, topics, questions, and progress.</span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="text-emerald-500 font-bold">✓</span>
                <span>Hybrid PyMuPDF digital text extraction and local OCR fallback.</span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="text-emerald-500 font-bold">✓</span>
                <span>Pedagogical topic priority scoring with manual importance override.</span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="text-emerald-500 font-bold">✓</span>
                <span>Previous-year question extraction and syllabus-topic mapping.</span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="text-emerald-500 font-bold">✓</span>
                <span>Answer Coach guidance with mark-tier structuring and source citations.</span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="text-emerald-500 font-bold">✓</span>
                <span>Strictly isolated hybrid and semantic academic search.</span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="text-emerald-500 font-bold">✓</span>
                <span>Standardized 10-item System Usability Scale (SUS) research feedback survey.</span>
              </li>
            </ul>
          </div>

          <div className="space-y-3">
            <div className="flex items-center space-x-2 text-indigo-700 font-bold text-xs uppercase tracking-wider">
              <Clock className="w-4 h-4" />
              <span>Planned Enhancements & Future Scope</span>
            </div>
            <ul className="space-y-2 text-xs text-slate-600">
              <li className="flex items-start space-x-2">
                <span className="text-indigo-400 font-bold">→</span>
                <span>Automated student diagram sketch grading and handwriting evaluation.</span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="text-indigo-400 font-bold">→</span>
                <span>Cross-institutional syllabus benchmarks and shared course templates.</span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="text-indigo-400 font-bold">→</span>
                <span>Interactive voice-guided flashcard revision mode for mobile browsers.</span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="text-indigo-400 font-bold">→</span>
                <span>Multi-modal equation parsing for advanced mathematical subjects.</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Academic Guidance Notice */}
      <div className="p-5 rounded-2xl bg-amber-50 border border-amber-200/90 text-amber-900 space-y-2">
        <div className="flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-amber-800">Academic Guidance & Accuracy Notice</h3>
        </div>
        <p className="text-xs leading-relaxed text-amber-800">
          ExamIQ is an educational preparation assistant designed to guide study planning and revision.
          It does not guarantee specific exam questions, predict confidential examination leaks, or substitute comprehensive reading of prescribed university textbooks.
          Answer guidance and topic priority recommendations are heuristic and grounded in your provided documents. Always cross-verify critical definitions with your course instructors.
        </p>
      </div>
    </div>
  );
};
