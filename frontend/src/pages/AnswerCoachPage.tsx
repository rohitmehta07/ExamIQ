import React, { useState, useEffect } from 'react';
import {
  PenTool, Award, CheckCircle, AlertTriangle, BookOpen, Layers,
  Sparkles, RefreshCw, FileText, Bookmark, Send, Info, ShieldAlert,
  ArrowRight, BookMarked, Quote, HelpCircle, Check, AlertCircle
} from 'lucide-react';
import { api } from '../services/api';
import {
  QuestionItem, AnswerStrategy, AnswerEvaluation, Subject,
  SourceCitation, PYQReference, MarkingCriteriaItem
} from '../types';

interface Props {
  initialQuestion?: QuestionItem | null;
  activeSubject?: Subject | null;
  onSubjectChange?: () => void;
  onNavigate?: (tab: string) => void;
}

export const AnswerCoachPage: React.FC<Props> = ({
  initialQuestion,
  activeSubject,
  onSubjectChange,
  onNavigate
}) => {
  const [questions, setQuestions] = useState<QuestionItem[]>([]);
  const [selectedQuestionId, setSelectedQuestionId] = useState<number | 'CUSTOM'>(
    initialQuestion?.id || 'CUSTOM'
  );
  const [customQuestionText, setCustomQuestionText] = useState(
    initialQuestion?.text || ''
  );
  const [marks, setMarks] = useState<number>(initialQuestion?.marks || 5.0);
  const [questionType, setQuestionType] = useState<string>('Explanation');

  // Strategy & Evaluation State
  const [activeSubTab, setActiveSubTab] = useState<'STRATEGY' | 'EVALUATION'>('STRATEGY');
  const [strategy, setStrategy] = useState<AnswerStrategy | null>(null);
  const [studentAnswer, setStudentAnswer] = useState<string>('');
  const [evaluation, setEvaluation] = useState<AnswerEvaluation | null>(null);
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [loadingStrategy, setLoadingStrategy] = useState(false);
  const [evaluating, setEvaluating] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

  // Load questions whenever activeSubject changes
  useEffect(() => {
    loadQuestions();
  }, [activeSubject?.id]);

  // Fetch strategy when selected question changes or subject changes
  useEffect(() => {
    if (selectedQuestionId !== 'CUSTOM' || customQuestionText.trim()) {
      fetchStrategy();
    }
  }, [selectedQuestionId, activeSubject?.id]);

  const loadQuestions = async () => {
    setLoadingQuestions(true);
    try {
      const data = await api.getQuestions({ subjectId: activeSubject?.id });
      setQuestions(data);
      if (initialQuestion && (!activeSubject || initialQuestion.subject_id === activeSubject.id)) {
        setSelectedQuestionId(initialQuestion.id);
        setCustomQuestionText(initialQuestion.text);
        setMarks(initialQuestion.marks);
        if (initialQuestion.question_types && initialQuestion.question_types.length > 0) {
          setQuestionType(initialQuestion.question_types[0]);
        }
      } else if (data.length > 0) {
        setSelectedQuestionId(data[0].id);
        setCustomQuestionText(data[0].text);
        setMarks(data[0].marks);
        if (data[0].question_types && data[0].question_types.length > 0) {
          setQuestionType(data[0].question_types[0]);
        }
      } else {
        setSelectedQuestionId('CUSTOM');
        if (!initialQuestion) {
          setCustomQuestionText(
            activeSubject?.name
              ? `Explain the core architectural principles and key algorithmic steps in ${activeSubject.name}.`
              : 'Differentiate between active and passive attacks with suitable examples.'
          );
        }
      }
    } catch (err) {
      console.error('Error loading subject questions for Answer Coach:', err);
    } finally {
      setLoadingQuestions(false);
    }
  };

  const fetchStrategy = async () => {
    setLoadingStrategy(true);
    try {
      if (selectedQuestionId === 'CUSTOM') {
        if (!customQuestionText.trim()) return;
        const strat = await api.getAnswerStrategy({
          subject_id: activeSubject?.id,
          question_text: customQuestionText,
          marks: marks,
          question_type: questionType
        });
        setStrategy(strat);
      } else {
        const strat = await api.getAnswerStrategy({
          subject_id: activeSubject?.id,
          question_id: selectedQuestionId as number,
        });
        setStrategy(strat);
      }
    } catch (err) {
      console.error('Error retrieving answer strategy:', err);
    } finally {
      setLoadingStrategy(false);
    }
  };

  const handleSelectChange = (val: string) => {
    if (val === 'CUSTOM') {
      setSelectedQuestionId('CUSTOM');
    } else {
      const qId = parseInt(val, 10);
      setSelectedQuestionId(qId);
      const found = questions.find((q) => q.id === qId);
      if (found) {
        setCustomQuestionText(found.text);
        setMarks(found.marks);
        if (found.question_types && found.question_types.length > 0) {
          setQuestionType(found.question_types[0]);
        }
      }
    }
  };

  const handleEvaluateAnswer = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!studentAnswer.trim()) {
      alert('Please enter your written answer to evaluate.');
      return;
    }

    setEvaluating(true);
    try {
      const result = await api.evaluateAnswer({
        subject_id: activeSubject?.id,
        question_id: selectedQuestionId === 'CUSTOM' ? undefined : (selectedQuestionId as number),
        question_text: customQuestionText,
        marks: marks,
        student_answer: studentAnswer,
      });
      setEvaluation(result);
      setActiveSubTab('EVALUATION');
    } catch (err: any) {
      alert(`Error evaluating answer: ${err.message || err}`);
    } finally {
      setEvaluating(false);
    }
  };

  const loadSampleAnswer = () => {
    if (strategy?.model_answer_outline) {
      setStudentAnswer(strategy.model_answer_outline);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } else if (customQuestionText.toLowerCase().includes('active and passive')) {
      setStudentAnswer(
        "1. Active vs Passive Attacks Matrix:\n- Passive attacks involve eavesdropping and monitoring of transmissions (e.g. packet sniffing, traffic analysis). The goal is to obtain confidentiality information without altering data.\n- Active attacks involve modification of data streams or creation of false streams (e.g. masquerade, replay, DoS). They directly threaten integrity and availability.\n\n2. Attack Hardest to Detect:\nPassive attacks are virtually impossible to detect because they do not involve any alteration of data or network states.\n\n3. Justification & Defense:\nBecause detection is infeasible, the only viable defense against passive attacks is prevention through strong cryptographic mechanisms (AES-256 with robust key exchange) to render intercepted data unreadable."
      );
    } else {
      setStudentAnswer(
        `1. Theoretical Foundation:\nComprehensive definition and core motivation regarding ${strategy?.topic || activeSubject?.name || 'this topic'}.\n\n2. Core Architectural Mechanism:\nStep-by-step procedure, component interactions, and state transitions.\n\n3. Mathematical / Algorithmic Trade-offs:\nTime/space complexity analysis and boundary conditions.\n\n4. Real-world Exemplification:\nConcrete implementation context and practical advantages.`
      );
    }
  };

  const getEvidenceBadge = (basis: string) => {
    if (basis === 'EVIDENCE_BACKED') {
      return (
        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
          <Bookmark className="w-3.5 h-3.5 mr-1.5 text-emerald-600" />
          Evidence-Backed (Verified Marking Scheme & Chunks)
        </span>
      );
    } else if (basis === 'PATTERN_BASED') {
      return (
        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-300">
          <Layers className="w-3.5 h-3.5 mr-1.5 text-blue-600" />
          Pattern-Based (Subject Notes & Past Papers)
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
        <Sparkles className="w-3.5 h-3.5 mr-1.5 text-amber-600" />
        General Academic Conventions (Partial Subject Notes)
      </span>
    );
  };

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Subject Context Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 text-white shadow-xl border border-indigo-900/40 relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center space-x-2">
              <span className="px-3 py-0.5 rounded-full text-[11px] font-bold tracking-wider uppercase bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                Subject Scope Active
              </span>
              {activeSubject?.code && (
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-white/10 text-slate-200">
                  {activeSubject.code}
                </span>
              )}
            </div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white">
              Answer Coach: {activeSubject ? activeSubject.name : 'All Subjects'}
            </h1>
            <p className="text-xs md:text-sm text-slate-300 max-w-2xl leading-relaxed">
              Answer guidance grounded strictly in {activeSubject?.name || 'this subject'}&apos;s uploaded lecture notes, syllabus, Question Bank PYQs, and verified university marking schemes.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {onNavigate && (
              <>
                <button
                  onClick={() => onNavigate('questions')}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/20 text-white transition border border-white/10 flex items-center space-x-1.5"
                >
                  <BookMarked className="w-3.5 h-3.5 text-indigo-300" />
                  <span>Question Bank</span>
                </button>
                <button
                  onClick={() => onNavigate('documents')}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/20 text-white transition border border-white/10 flex items-center space-x-1.5"
                >
                  <FileText className="w-3.5 h-3.5 text-indigo-300" />
                  <span>Subject Docs</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Mandatory Non-Guarantee Academic Disclaimer Banner */}
      <div className="bg-amber-50/90 border border-amber-200 rounded-2xl p-4 flex items-start space-x-3 text-xs text-amber-900 shadow-xs">
        <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
        <div className="space-y-0.5">
          <p className="font-bold tracking-tight">Academic Integrity & Non-Prescriptive Policy:</p>
          <p className="text-amber-800 leading-relaxed text-[11px]">
            ExamIQ does not guarantee specific marks or examination outcomes. Answer strategies, step marks, and rubric evaluations provide structured revision guidance grounded in uploaded university documents. Marking schemes reflect university guidelines when available.
          </p>
        </div>
      </div>

      {/* Question Selector & Configuration Card */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex-1">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-1.5">
              Select Question from {activeSubject?.name || 'Subject'} Question Bank:
            </label>
            <select
              value={selectedQuestionId}
              onChange={(e) => handleSelectChange(e.target.value)}
              disabled={loadingQuestions}
              className="w-full p-3 bg-slate-50 border border-slate-300 rounded-2xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {questions.map((q) => (
                <option key={q.id} value={q.id}>
                  Q{q.question_number || '?'} [{q.marks}M] {q.academic_year ? `(${q.academic_year})` : ''}: {q.text.slice(0, 95)}...
                </option>
              ))}
              <option value="CUSTOM">+ Enter Custom / Syllabus Question</option>
            </select>
            {questions.length === 0 && !loadingQuestions && (
              <p className="text-[11px] text-slate-400 mt-1.5">
                No saved questions in this subject yet. You can type any exam question below or generate questions in Question Bank.
              </p>
            )}
          </div>

          <div className="flex items-center space-x-3 shrink-0">
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-1.5">Target Marks</label>
              <input
                type="number"
                step="0.5"
                min="1"
                max="25"
                value={marks}
                onChange={(e) => setMarks(parseFloat(e.target.value) || 5.0)}
                className="w-24 p-2.5 border border-slate-300 rounded-2xl text-xs font-bold text-center text-slate-800 bg-slate-50 focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-1.5">Type</label>
              <select
                value={questionType}
                onChange={(e) => setQuestionType(e.target.value)}
                className="p-2.5 border border-slate-300 rounded-2xl text-xs font-bold text-slate-800 bg-slate-50 focus:ring-2 focus:ring-indigo-500"
              >
                <option value="Explanation">Explanation</option>
                <option value="Comparison">Comparison</option>
                <option value="Derivation">Derivation</option>
                <option value="Numerical">Numerical</option>
                <option value="Short Answer">Short Answer</option>
              </select>
            </div>

            <button
              onClick={fetchStrategy}
              disabled={loadingStrategy}
              className="mt-5 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-bold shadow-md shadow-indigo-600/20 transition flex items-center space-x-2 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingStrategy ? 'animate-spin' : ''}`} />
              <span>{loadingStrategy ? 'Grounding...' : 'Generate Guidance'}</span>
            </button>
          </div>
        </div>

        {selectedQuestionId === 'CUSTOM' && (
          <div className="space-y-1.5 pt-2 border-t border-slate-100">
            <label className="text-xs font-semibold text-slate-700 block">Question Text</label>
            <textarea
              value={customQuestionText}
              onChange={(e) => setCustomQuestionText(e.target.value)}
              placeholder="Paste or type an exam question belonging to this subject..."
              rows={2}
              className="w-full p-3.5 border border-slate-300 rounded-2xl text-xs text-slate-800 focus:ring-2 focus:ring-indigo-500 leading-relaxed"
            />
          </div>
        )}
      </div>

      {/* Missing Evidence Warning Banner (Transparent Indication) */}
      {strategy?.missing_evidence && (
        <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-2xl flex items-start space-x-3 text-amber-900 shadow-xs">
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="text-xs font-bold tracking-tight">Evidence Transparency Notice:</h4>
            <p className="text-xs text-amber-800 leading-relaxed">{strategy.missing_evidence}</p>
          </div>
        </div>
      )}

      {/* Navigation Sub-Tabs */}
      <div className="flex space-x-3 border-b border-slate-200 pb-1">
        <button
          onClick={() => setActiveSubTab('STRATEGY')}
          className={`pb-3 px-4 text-xs font-bold transition-all border-b-2 flex items-center space-x-2 ${
            activeSubTab === 'STRATEGY'
              ? 'border-indigo-600 text-indigo-700'
              : 'border-transparent text-slate-400 hover:text-slate-700'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>Mark-Oriented Answer Strategy</span>
        </button>

        <button
          onClick={() => setActiveSubTab('EVALUATION')}
          className={`pb-3 px-4 text-xs font-bold transition-all border-b-2 flex items-center space-x-2 ${
            activeSubTab === 'EVALUATION'
              ? 'border-indigo-600 text-indigo-700'
              : 'border-transparent text-slate-400 hover:text-slate-700'
          }`}
        >
          <PenTool className="w-4 h-4" />
          <span>Interactive Student Writing Coach</span>
          {evaluation && (
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          )}
        </button>
      </div>

      {/* Tab 1: Answer Strategy */}
      {activeSubTab === 'STRATEGY' && strategy && (
        <div className="space-y-6 animate-fade-in">
          {/* Evidence Basis Summary Banner */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-5 bg-white rounded-3xl border border-slate-200 shadow-xs">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold text-slate-700">Evidence Basis:</span>
                {getEvidenceBadge(strategy.evidence_basis)}
                {strategy.subject_name && (
                  <span className="text-xs font-bold bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded-full border border-slate-200">
                    Subject: {strategy.subject_name}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">{strategy.evidence_explanation}</p>
            </div>

            <div className="text-left md:text-right shrink-0">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">Recommended Length</span>
              <span className="text-xs font-bold text-slate-800">{strategy.expected_depth}</span>
            </div>
          </div>

          {/* Retrieved Source Citations Section */}
          {strategy.citations && strategy.citations.length > 0 && (
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Quote className="w-4 h-4 text-indigo-600" />
                  <h3 className="text-sm font-bold text-slate-900">
                    Retrieved Source Citations ({strategy.citations.length} Verified Evidence Chunks)
                  </h3>
                </div>
                <span className="text-[11px] text-slate-400 font-medium">Grounded in {activeSubject?.name || 'this subject'}</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {strategy.citations.map((c, idx) => (
                  <div
                    key={idx}
                    className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2 hover:border-indigo-300 transition"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-indigo-900 flex items-center space-x-1">
                        <FileText className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                        <span className="truncate max-w-[200px]">{c.document_name}</span>
                      </span>
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-white text-slate-600 border border-slate-200">
                        Page {c.page_number}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 italic bg-white p-2.5 rounded-xl border border-slate-100 leading-relaxed">
                      &ldquo;{c.snippet}&rdquo;
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Verified University Marking Scheme (If Available) */}
          {strategy.marking_scheme_criteria && strategy.marking_scheme_criteria.length > 0 && (
            <div className="bg-emerald-50/70 p-6 rounded-3xl border border-emerald-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-emerald-950 flex items-center">
                  <Award className="w-4 h-4 mr-1.5 text-emerald-600" />
                  Official Marking Scheme Criteria & Allocation
                </h3>
                <span className="text-xs font-bold text-emerald-700 bg-white px-2.5 py-1 rounded-full border border-emerald-300">
                  {strategy.marks} Marks Total
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                {strategy.marking_scheme_criteria.map((item, idx) => (
                  <div key={idx} className="bg-white p-3.5 rounded-2xl border border-emerald-200/80 space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-slate-900">{item.criterion}</span>
                      <span className="text-xs font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        {item.marks}M
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-relaxed">{item.description}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Main 2-Col Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left 2 Cols: Step-by-Step Answer Structure */}
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
                <h3 className="text-sm font-bold text-slate-900 flex items-center">
                  <Award className="w-4 h-4 mr-1.5 text-indigo-600" />
                  Mark-Oriented Step-by-Step Answer Structure
                </h3>

                <div className="space-y-3">
                  {strategy.answer_structure.map((step, idx) => (
                    <div key={idx} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-1.5">
                      <div className="flex justify-between items-center">
                        <h4 className="text-xs font-bold text-slate-900">{step.step}</h4>
                        <span className="text-xs font-mono font-bold bg-indigo-50 text-indigo-700 px-2.5 py-0.5 rounded-lg border border-indigo-200">
                          {step.allocated_marks} Marks
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 leading-relaxed">{step.description}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Model Answer Outline */}
              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-900 flex items-center">
                    <FileText className="w-4 h-4 mr-1.5 text-indigo-600" />
                    Synthesis Model Answer Outline
                  </h3>
                  <button
                    onClick={loadSampleAnswer}
                    className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center space-x-1"
                  >
                    {copySuccess ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <PenTool className="w-3.5 h-3.5" />}
                    <span>{copySuccess ? 'Copied to Practice Coach!' : 'Send to Practice Coach'}</span>
                  </button>
                </div>
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs text-slate-700 font-sans leading-relaxed whitespace-pre-wrap">
                  {strategy.model_answer_outline}
                </div>
              </div>

              {/* Related Previous-Year Questions in this Subject */}
              {strategy.pyq_references && strategy.pyq_references.length > 0 && (
                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-slate-900 flex items-center">
                      <Bookmark className="w-4 h-4 mr-1.5 text-indigo-600" />
                      Related Previous-Year Exam Questions (PYQs)
                    </h3>
                    <span className="text-xs text-slate-400 font-medium">From {activeSubject?.name || 'this subject'}</span>
                  </div>

                  <div className="space-y-2.5">
                    {strategy.pyq_references.map((pyq, idx) => (
                      <div
                        key={idx}
                        className="p-3.5 bg-slate-50 hover:bg-indigo-50/50 rounded-2xl border border-slate-200 flex items-center justify-between gap-3 transition"
                      >
                        <div className="space-y-0.5">
                          <div className="flex items-center space-x-2 text-[11px]">
                            <span className="font-bold text-indigo-900">
                              {pyq.question_number ? `Q${pyq.question_number}` : 'PYQ'}
                            </span>
                            {pyq.marks && (
                              <span className="px-1.5 py-0.2 rounded bg-indigo-100 text-indigo-700 font-mono text-[10px]">
                                {pyq.marks}M
                              </span>
                            )}
                            {pyq.academic_year && (
                              <span className="text-slate-500 font-medium">({pyq.academic_year})</span>
                            )}
                            <span className="text-slate-400 text-[10px] truncate max-w-[150px]">
                              {pyq.source_name}
                            </span>
                          </div>
                          <p className="text-xs text-slate-700 line-clamp-1">{pyq.text}</p>
                        </div>
                        <button
                          onClick={() => {
                            setSelectedQuestionId(pyq.id);
                            setCustomQuestionText(pyq.text);
                            setMarks(pyq.marks || 5.0);
                          }}
                          className="px-3 py-1.5 rounded-xl text-xs font-bold text-indigo-600 hover:bg-indigo-100 transition shrink-0 flex items-center space-x-1"
                        >
                          <span>Coach This</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Right Col: Keywords, Diagrams, Formulas, Omissions */}
            <div className="space-y-6">
              {/* Keywords Card */}
              <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Essential Terminology to Highlight
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {strategy.key_terms.map((term, idx) => (
                    <span
                      key={idx}
                      className="text-xs font-semibold bg-indigo-50 text-indigo-700 px-3 py-1 rounded-xl border border-indigo-100"
                    >
                      {term}
                    </span>
                  ))}
                </div>
              </div>

              {/* Suggested Diagrams */}
              {strategy.suggested_diagrams && strategy.suggested_diagrams.length > 0 && (
                <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-2.5">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Suggested Diagrams / Schematics
                  </h4>
                  <ul className="space-y-2 text-xs text-slate-700">
                    {strategy.suggested_diagrams.map((diag, idx) => (
                      <li key={idx} className="flex items-start space-x-2 font-medium">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 shrink-0"></span>
                        <span className="leading-snug">{diag}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Suggested Formulas */}
              {strategy.suggested_formulas && strategy.suggested_formulas.length > 0 && (
                <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-2.5">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Relevant Equations & Formulas
                  </h4>
                  <div className="space-y-1.5">
                    {strategy.suggested_formulas.map((form, idx) => (
                      <code
                        key={idx}
                        className="text-[11px] font-mono font-semibold bg-slate-50 p-2.5 rounded-xl block border border-slate-200 text-indigo-900 overflow-x-auto"
                      >
                        {form}
                      </code>
                    ))}
                  </div>
                </div>
              )}

              {/* Common Omissions */}
              <div className="bg-rose-50/80 p-5 rounded-3xl border border-rose-200 space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-rose-800 flex items-center">
                  <AlertTriangle className="w-3.5 h-3.5 mr-1.5 text-rose-600" />
                  Common Exam Omissions
                </h4>
                <ul className="space-y-1.5 text-xs text-rose-700 list-disc list-inside">
                  {strategy.common_omissions.map((om, idx) => (
                    <li key={idx} className="leading-snug">{om}</li>
                  ))}
                </ul>
              </div>

              {/* Presentation Guidance */}
              {strategy.presentation_guidance && strategy.presentation_guidance.length > 0 && (
                <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Presentation Tips
                  </h4>
                  <ul className="space-y-1 text-xs text-slate-600 list-disc list-inside">
                    {strategy.presentation_guidance.map((tip, idx) => (
                      <li key={idx} className="leading-snug">{tip}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Answer Writing Coach (Interactive Practice & Rubric Analysis) */}
      {activeSubTab === 'EVALUATION' && (
        <div className="space-y-6 animate-fade-in">
          {/* Input Form */}
          <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Write or Paste Your Practice Answer</h3>
                <p className="text-xs text-slate-500">
                  Evaluated against {activeSubject?.name || 'subject'} source concepts, required terminology, and standard mark criteria.
                </p>
              </div>
              <button
                type="button"
                onClick={loadSampleAnswer}
                className="text-xs font-bold text-indigo-600 hover:text-indigo-800 transition flex items-center space-x-1"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Load Sample Response</span>
              </button>
            </div>

            <textarea
              value={studentAnswer}
              onChange={(e) => setStudentAnswer(e.target.value)}
              placeholder="Write your structured response here (e.g. 1. Definition, 2. Working Mechanism, 3. Equations, 4. Diagrams/Examples)..."
              rows={9}
              className="w-full p-4 border border-slate-300 rounded-2xl text-xs text-slate-800 focus:ring-2 focus:ring-indigo-500 font-sans leading-relaxed"
            />

            <div className="flex items-center justify-between pt-2">
              <span className="text-xs text-slate-400">
                Word count: {studentAnswer.trim() ? studentAnswer.trim().split(/\s+/).length : 0} words | Marks: {marks}M
              </span>

              <button
                onClick={() => handleEvaluateAnswer()}
                disabled={evaluating || !studentAnswer.trim()}
                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-2xl shadow-md shadow-indigo-600/20 transition flex items-center space-x-2 disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{evaluating ? 'Analyzing Against Subject Materials...' : 'Analyze My Answer'}</span>
              </button>
            </div>
          </div>

          {/* Evaluation Results Card */}
          {evaluation && (
            <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6 animate-fade-in">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-4 gap-4">
                <div className="space-y-0.5">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Evaluated Subject Scope</span>
                  <h3 className="text-base font-extrabold text-slate-900">
                    {evaluation.subject_name || activeSubject?.name || 'Subject'} Answer Assessment
                  </h3>
                </div>

                <div className="flex items-center space-x-4">
                  <div className="text-right">
                    <span className="text-[10px] font-bold uppercase text-slate-400 block">Evaluated Content Score</span>
                    <span className="text-2xl font-black text-indigo-600 font-mono">
                      {evaluation.content_score} / {evaluation.max_score}
                    </span>
                  </div>
                  <span
                    className={`px-3.5 py-1.5 rounded-2xl text-xs font-bold uppercase ${
                      evaluation.structure_rating === 'EXCELLENT'
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                        : evaluation.structure_rating === 'GOOD'
                        ? 'bg-indigo-100 text-indigo-800 border border-indigo-300'
                        : 'bg-amber-100 text-amber-800 border border-amber-300'
                    }`}
                  >
                    Structure: {evaluation.structure_rating}
                  </span>
                </div>
              </div>

              {/* Terminology Recall Chips */}
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-slate-700">Key Terminology Recall ({evaluation.coverage_percentage}% Coverage):</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {evaluation.key_terms_present.map((term, idx) => (
                    <span
                      key={idx}
                      className="px-3 py-1 rounded-xl text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center space-x-1"
                    >
                      <CheckCircle className="w-3 h-3 text-emerald-500" />
                      <span>{term}</span>
                    </span>
                  ))}
                  {evaluation.key_terms_missing.map((term, idx) => (
                    <span
                      key={idx}
                      className="px-3 py-1 rounded-xl text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200 line-through opacity-70"
                    >
                      {term}
                    </span>
                  ))}
                </div>
              </div>

              {/* Evaluation Citations (If Grounded) */}
              {evaluation.citations && evaluation.citations.length > 0 && (
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center">
                    <Quote className="w-3.5 h-3.5 mr-1.5 text-indigo-600" />
                    Reference Material Retrieved During Evaluation:
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {evaluation.citations.map((c, idx) => (
                      <div key={idx} className="p-2.5 bg-white rounded-xl border border-slate-200 text-xs">
                        <span className="font-bold text-indigo-900 block truncate">{c.document_name} (Page {c.page_number})</span>
                        <p className="text-slate-500 line-clamp-2 mt-0.5 italic">&ldquo;{c.snippet}&rdquo;</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Actionable Suggestions */}
              <div className="p-5 bg-indigo-50/60 border border-indigo-100 rounded-2xl space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-900">
                  Targeted Revision Improvements:
                </h4>
                <ul className="space-y-1.5 text-xs text-indigo-950 list-disc list-inside">
                  {evaluation.actionable_improvements.map((imp, idx) => (
                    <li key={idx} className="leading-relaxed">{imp}</li>
                  ))}
                </ul>
              </div>

              {/* Evaluation Disclaimer */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-[11px] text-slate-600 flex items-start space-x-2">
                <Info className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                <p>{evaluation.disclaimer}</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
