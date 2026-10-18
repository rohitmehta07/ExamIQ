import React, { useState, useEffect } from 'react';
import {
  FileQuestion, Filter, Search, Award, CheckCircle, PenTool,
  ChevronDown, ChevronUp, Layers, HelpCircle, BookOpen, Plus,
  Edit2, Trash2, Calendar, FileText, X, ArrowUpDown, Tag,
  Sparkles, RefreshCw, AlertCircle
} from 'lucide-react';
import { api } from '../services/api';
import { QuestionItem, Subject, TopicItem, QuestionFilterMeta, DocumentItem } from '../types';

interface Props {
  activeSubject?: Subject | null;
  onSubjectChange?: () => void;
  onNavigate?: (tab: string) => void;
  onSelectQuestion: (question: QuestionItem) => void;
}

export const QuestionBankPage: React.FC<Props> = ({
  activeSubject,
  onSubjectChange,
  onNavigate,
  onSelectQuestion,
}) => {
  const [questions, setQuestions] = useState<QuestionItem[]>([]);
  const [allSubjects, setAllSubjects] = useState<Subject[]>([]);
  const [subjectTopics, setSubjectTopics] = useState<TopicItem[]>([]);
  const [subjectDocs, setSubjectDocs] = useState<DocumentItem[]>([]);
  const [filterMeta, setFilterMeta] = useState<QuestionFilterMeta | null>(null);
  const [loading, setLoading] = useState(true);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTopicId, setSelectedTopicId] = useState<string>('ALL');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('ALL');
  const [selectedOrigin, setSelectedOrigin] = useState<string>('ALL'); // ALL, PYQ, AI_GENERATED, MANUAL
  const [selectedYear, setSelectedYear] = useState<string>('ALL');
  const [selectedMarksCat, setSelectedMarksCat] = useState<string>('ALL'); // ALL, SHORT (<=2), MEDIUM (3-5), LONG (>=6)
  const [requiresDiagram, setRequiresDiagram] = useState<boolean>(false);
  const [requiresCalc, setRequiresCalc] = useState<boolean>(false);
  const [requiresAlgo, setRequiresAlgo] = useState<boolean>(false);
  const [sortBy, setSortBy] = useState<string>('question_number');

  // UI Expanders & Modals
  const [expandedRubricId, setExpandedRubricId] = useState<number | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isMapTopicModalOpen, setIsMapTopicModalOpen] = useState(false);
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [generateSuccess, setGenerateSuccess] = useState<string | null>(null);

  // Generation Modal Form State
  const [genSelectedDocIds, setGenSelectedDocIds] = useState<number[]>([]);
  const [genTopicId, setGenTopicId] = useState<string>('ALL');
  const [genCount, setGenCount] = useState<number>(5);
  const [genDifficulty, setGenDifficulty] = useState<'MIXED' | 'EASY' | 'MEDIUM' | 'HARD'>('MIXED');
  const [genQuestionType, setGenQuestionType] = useState<'MIXED' | 'MCQ' | 'SHORT_ANSWER' | 'LONG_ANSWER'>('MIXED');

  const [activeQuestion, setActiveQuestion] = useState<QuestionItem | null>(null);

  // Form State for Add / Edit
  const [formNumber, setFormNumber] = useState('1');
  const [formText, setFormText] = useState('');
  const [formMarks, setFormMarks] = useState<number>(5.0);
  const [formYear, setFormYear] = useState<number>(2025);
  const [formTopicId, setFormTopicId] = useState<string>('');
  const [formDifficulty, setFormDifficulty] = useState<string>('MEDIUM');
  const [formRequiresDiagram, setFormRequiresDiagram] = useState(false);
  const [formRequiresCalc, setFormRequiresCalc] = useState(false);
  const [formRequiresAlgo, setFormRequiresAlgo] = useState(false);
  const [formSourceName, setFormSourceName] = useState('');

  // Initial Load
  useEffect(() => {
    loadSubjects();
  }, []);

  // When active subject changes, reload questions, topics and metadata
  useEffect(() => {
    if (activeSubject) {
      loadSubjectData(activeSubject.id);
    } else {
      loadQuestions();
    }
  }, [activeSubject]);

  const loadSubjects = async () => {
    try {
      const subs = await api.getSubjects();
      setAllSubjects(subs);
    } catch (err) {
      console.error('Failed to load subjects', err);
    }
  };

  const loadSubjectData = async (subId: number) => {
    setLoading(true);
    try {
      const [qs, topics, meta, docs] = await Promise.all([
        api.getQuestions({ subjectId: subId, sortBy }),
        api.getTopics(subId),
        api.getQuestionFilterMeta(subId),
        api.getDocuments(subId)
      ]);
      setQuestions(qs);
      setSubjectTopics(topics);
      setFilterMeta(meta);
      setSubjectDocs(docs);
    } catch (err) {
      console.error('Failed to load subject questions', err);
    } finally {
      setLoading(false);
    }
  };

  const loadQuestions = async () => {
    setLoading(true);
    try {
      const subId = activeSubject?.id;
      const data = await api.getQuestions({ subjectId: subId, sortBy });
      setQuestions(data);
      if (subId) {
        const docs = await api.getDocuments(subId);
        setSubjectDocs(docs);
      }
    } catch (err) {
      console.error('Failed to load questions', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubjectSwitch = async (newSubjectId: number) => {
    try {
      await api.setActiveSubject(newSubjectId);
      if (onSubjectChange) onSubjectChange();
      loadSubjectData(newSubjectId);
    } catch (err) {
      console.error('Failed to switch active subject', err);
    }
  };

  // Client-side filtering
  const filteredQuestions = questions.filter((q) => {
    // Search query match
    if (searchQuery.trim()) {
      const qLower = searchQuery.toLowerCase();
      const inText = q.text.toLowerCase().includes(qLower);
      const inNumber = q.question_number.toLowerCase().includes(qLower);
      const inConcepts = q.key_concepts?.some(c => c.toLowerCase().includes(qLower));
      const inTopic = q.topic_name?.toLowerCase().includes(qLower);
      if (!inText && !inNumber && !inConcepts && !inTopic) return false;
    }

    // Topic Filter
    if (selectedTopicId !== 'ALL') {
      if (selectedTopicId === 'UNMAPPED') {
        if (q.topic_id) return false;
      } else {
        if (q.topic_id !== parseInt(selectedTopicId, 10)) return false;
      }
    }

    // Origin Filter
    if (selectedOrigin !== 'ALL') {
      if (selectedOrigin === 'PYQ' && !(q.origin === 'PYQ' || q.is_pyq)) return false;
      if (selectedOrigin === 'AI_GENERATED' && q.origin !== 'AI_GENERATED') return false;
      if (selectedOrigin === 'MANUAL' && q.origin !== 'MANUAL') return false;
    }

    // Difficulty Filter
    if (selectedDifficulty !== 'ALL' && q.estimated_difficulty !== selectedDifficulty) {
      return false;
    }

    // Year Filter
    if (selectedYear !== 'ALL' && q.academic_year !== parseInt(selectedYear, 10)) {
      return false;
    }

    // Marks Category
    if (selectedMarksCat === 'SHORT' && q.marks > 2.5) return false;
    if (selectedMarksCat === 'MEDIUM' && (q.marks < 3.0 || q.marks > 5.5)) return false;
    if (selectedMarksCat === 'LONG' && q.marks < 6.0) return false;

    // Requirement Checkboxes
    if (requiresDiagram && !q.requires_diagram) return false;
    if (requiresCalc && !q.requires_calculation) return false;
    if (requiresAlgo && !q.requires_algorithm) return false;

    return true;
  });

  // Client-side sorting
  const sortedQuestions = [...filteredQuestions].sort((a, b) => {
    if (sortBy === 'marks_desc') return b.marks - a.marks;
    if (sortBy === 'marks_asc') return a.marks - b.marks;
    if (sortBy === 'year_desc') return b.academic_year - a.academic_year;
    if (sortBy === 'difficulty') {
      const diffOrder: Record<string, number> = { HARD: 3, MEDIUM: 2, EASY: 1 };
      return (diffOrder[b.estimated_difficulty] || 0) - (diffOrder[a.estimated_difficulty] || 0);
    }
    // Default by question_number numeric or lexical
    const numA = parseFloat(a.question_number) || 0;
    const numB = parseFloat(b.question_number) || 0;
    if (numA !== numB) return numA - numB;
    return a.id - b.id;
  });

  const hasActiveFilters = searchQuery !== '' ||
    selectedTopicId !== 'ALL' ||
    selectedDifficulty !== 'ALL' ||
    selectedOrigin !== 'ALL' ||
    selectedYear !== 'ALL' ||
    selectedMarksCat !== 'ALL' ||
    requiresDiagram ||
    requiresCalc ||
    requiresAlgo;

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedTopicId('ALL');
    setSelectedDifficulty('ALL');
    setSelectedOrigin('ALL');
    setSelectedYear('ALL');
    setSelectedMarksCat('ALL');
    setRequiresDiagram(false);
    setRequiresCalc(false);
    setRequiresAlgo(false);
  };

  // Generate Questions Modal Handlers
  const handleOpenGenerateModal = () => {
    setGenerateError(null);
    setGenerateSuccess(null);
    // Select all available documents by default
    setGenSelectedDocIds(subjectDocs.map(d => d.id));
    setGenTopicId('ALL');
    setGenCount(5);
    setGenDifficulty('MIXED');
    setGenQuestionType('MIXED');
    setIsGenerateModalOpen(true);
  };

  const handleToggleDocSelection = (docId: number) => {
    setGenSelectedDocIds(prev =>
      prev.includes(docId) ? prev.filter(id => id !== docId) : [...prev, docId]
    );
  };

  const handleSelectAllDocs = () => {
    setGenSelectedDocIds(subjectDocs.map(d => d.id));
  };

  const handleDeselectAllDocs = () => {
    setGenSelectedDocIds([]);
  };

  const handleExecuteGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSubject) return;
    if (subjectDocs.length > 0 && genSelectedDocIds.length === 0) {
      setGenerateError('Please select at least one document to generate questions from.');
      return;
    }
    setGenerating(true);
    setGenerateError(null);
    setGenerateSuccess(null);
    try {
      const res = await api.generateQuestions({
        subject_id: activeSubject.id,
        document_ids: genSelectedDocIds.length > 0 ? genSelectedDocIds : undefined,
        topic_id: genTopicId !== 'ALL' ? parseInt(genTopicId, 10) : undefined,
        count: genCount,
        difficulty: genDifficulty,
        question_type: genQuestionType
      });
      setGenerateSuccess(`Generated ${res.generated_count} practice question(s) from ${res.source_documents.join(', ') || 'study materials'}!`);
      await loadSubjectData(activeSubject.id);
      setTimeout(() => {
        setIsGenerateModalOpen(false);
        setGenerateSuccess(null);
      }, 1500);
    } catch (err: any) {
      console.error('Failed to generate questions', err);
      setGenerateError(err?.message || 'Question generation failed. Ensure your study documents contain readable text.');
    } finally {
      setGenerating(false);
    }
  };

  // Add Question Modal Handlers
  const handleOpenAddModal = () => {
    setFormNumber(`${questions.length + 1}`);
    setFormText('');
    setFormMarks(5.0);
    setFormYear(2025);
    setFormTopicId(subjectTopics.length > 0 ? `${subjectTopics[0].id}` : '');
    setFormDifficulty('MEDIUM');
    setFormRequiresDiagram(false);
    setFormRequiresCalc(false);
    setFormRequiresAlgo(false);
    setFormSourceName('Manual Question Entry');
    setIsAddModalOpen(true);
  };

  const handleSaveAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formText.trim()) return;
    const subId = activeSubject?.id;
    if (!subId) return;

    try {
      await api.createQuestion({
        subject_id: subId,
        question_number: formNumber.trim() || '1',
        text: formText.trim(),
        marks: formMarks,
        academic_year: formYear,
        topic_id: formTopicId ? parseInt(formTopicId, 10) : undefined,
        estimated_difficulty: formDifficulty,
        requires_diagram: formRequiresDiagram,
        requires_calculation: formRequiresCalc,
        requires_algorithm: formRequiresAlgo,
        source_name: formSourceName.trim() || 'Manual Entry'
      });
      setIsAddModalOpen(false);
      loadSubjectData(subId);
    } catch (err) {
      console.error('Failed to create question', err);
    }
  };

  // Edit Question Handlers
  const handleOpenEditModal = (q: QuestionItem) => {
    setActiveQuestion(q);
    setFormNumber(q.question_number);
    setFormText(q.text);
    setFormMarks(q.marks);
    setFormYear(q.academic_year || 2025);
    setFormTopicId(q.topic_id ? `${q.topic_id}` : '');
    setFormDifficulty(q.estimated_difficulty || 'MEDIUM');
    setFormRequiresDiagram(q.requires_diagram);
    setFormRequiresCalc(q.requires_calculation);
    setFormRequiresAlgo(q.requires_algorithm);
    setFormSourceName(q.source_name || '');
    setIsEditModalOpen(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeQuestion || !formText.trim()) return;

    try {
      await api.updateQuestion(activeQuestion.id, {
        question_number: formNumber.trim(),
        text: formText.trim(),
        marks: formMarks,
        academic_year: formYear,
        topic_id: formTopicId ? parseInt(formTopicId, 10) : null,
        estimated_difficulty: formDifficulty,
        requires_diagram: formRequiresDiagram,
        requires_calculation: formRequiresCalc,
        requires_algorithm: formRequiresAlgo,
        source_name: formSourceName.trim()
      });
      setIsEditModalOpen(false);
      if (activeSubject) loadSubjectData(activeSubject.id);
      else loadQuestions();
    } catch (err) {
      console.error('Failed to update question', err);
    }
  };

  // Quick Map Topic Handlers
  const handleOpenMapTopic = (q: QuestionItem) => {
    setActiveQuestion(q);
    setFormTopicId(q.topic_id ? `${q.topic_id}` : '');
    setIsMapTopicModalOpen(true);
  };

  const handleSaveTopicMapping = async () => {
    if (!activeQuestion) return;
    try {
      const topicId = formTopicId ? parseInt(formTopicId, 10) : null;
      await api.mapQuestionTopic(activeQuestion.id, topicId);
      setIsMapTopicModalOpen(false);
      if (activeSubject) loadSubjectData(activeSubject.id);
      else loadQuestions();
    } catch (err) {
      console.error('Failed to map question topic', err);
    }
  };

  // Delete Question
  const handleDeleteQuestion = async (qId: number) => {
    if (!window.confirm('Are you sure you want to delete this question from your question bank?')) return;
    try {
      await api.deleteQuestion(qId);
      if (activeSubject) loadSubjectData(activeSubject.id);
      else loadQuestions();
    } catch (err) {
      console.error('Failed to delete question', err);
    }
  };

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      {/* Subject Context & Switcher Banner */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-3.5">
          <div className="w-11 h-11 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold shadow-xs shrink-0">
            <FileQuestion className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                {activeSubject?.code || 'Subject'}
              </span>
              <span className="text-xs text-slate-500 font-medium">
                {activeSubject?.semester || 'Semester'}
              </span>
            </div>
            <h2 className="text-xl font-black text-slate-900 tracking-tight mt-0.5">
              {activeSubject?.name || 'Subject Question Bank'}
            </h2>
          </div>
        </div>

        {/* Subject Dropdown Switcher + Actions */}
        <div className="flex flex-wrap items-center gap-2.5">
          {allSubjects.length > 1 && (
            <div className="flex items-center space-x-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-700">
              <BookOpen className="w-3.5 h-3.5 text-slate-400" />
              <span className="font-semibold text-slate-500">Subject:</span>
              <select
                value={activeSubject?.id || ''}
                onChange={(e) => handleSubjectSwitch(parseInt(e.target.value, 10))}
                className="bg-transparent font-bold text-slate-900 outline-none cursor-pointer"
              >
                {allSubjects.map((sub) => (
                  <option key={sub.id} value={sub.id}>
                    {sub.code}: {sub.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <button
            onClick={() => {
              if (activeSubject) loadSubjectData(activeSubject.id);
            }}
            className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded-xl transition"
            title="Refresh Question Bank"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          <button
            onClick={handleOpenGenerateModal}
            className="px-3.5 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-xl text-xs font-bold shadow-xs transition flex items-center space-x-1.5 cursor-pointer"
            title="Generate practice questions from uploaded study materials"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Generate Questions</span>
          </button>

          <button
            onClick={handleOpenAddModal}
            className="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-xl text-xs font-bold shadow-xs transition flex items-center space-x-1.5 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Question</span>
          </button>
        </div>
      </div>

      {/* Overview Statistics Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl p-4 border border-slate-200/80 shadow-xs">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Total Questions</div>
          <div className="text-2xl font-black text-slate-900 mt-1">{questions.length}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            {questions.filter(q => q.origin === 'PYQ' || q.is_pyq).length} PYQs • {questions.filter(q => q.origin === 'AI_GENERATED').length} AI Generated
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-200/80 shadow-xs">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Filtered Matches</div>
          <div className="text-2xl font-black text-indigo-600 mt-1">{sortedQuestions.length}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">Matching active criteria</div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-200/80 shadow-xs">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Mapped Topics</div>
          <div className="text-2xl font-black text-emerald-600 mt-1">
            {filterMeta?.available_topics?.filter(t => t.question_count > 0).length || 0}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">With exam questions</div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-200/80 shadow-xs">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Mark Allocation</div>
          <div className="text-2xl font-black text-purple-600 mt-1">
            {filterMeta?.marks_range?.min ?? 0}M – {filterMeta?.marks_range?.max ?? 0}M
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">Exam paper range</div>
        </div>
      </div>

      {/* Search & Filter Controls Toolbar */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4">
        {/* Search Bar */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-4 top-3.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search questions by text, question number, key concepts, or topic..."
            className="w-full pl-11 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Filter Rows */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Topic Selector */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
              Topic
            </label>
            <select
              value={selectedTopicId}
              onChange={(e) => setSelectedTopicId(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="ALL">All Topics ({questions.length})</option>
              <option value="UNMAPPED">Unmapped Questions</option>
              {subjectTopics.map((top) => {
                const count = questions.filter(q => q.topic_id === top.id).length;
                return (
                  <option key={top.id} value={`${top.id}`}>
                    {top.name} ({count})
                  </option>
                );
              })}
            </select>
          </div>

          {/* Question Origin Selector */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
              Origin / Source
            </label>
            <select
              value={selectedOrigin}
              onChange={(e) => setSelectedOrigin(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="ALL">All Sources ({questions.length})</option>
              <option value="PYQ">🏛️ Exam Papers / PYQs ({questions.filter(q => q.origin === 'PYQ' || q.is_pyq).length})</option>
              <option value="AI_GENERATED">✨ AI Generated Practice ({questions.filter(q => q.origin === 'AI_GENERATED').length})</option>
              <option value="MANUAL">✍️ Manual Entries ({questions.filter(q => q.origin === 'MANUAL').length})</option>
            </select>
          </div>

          {/* Academic Year Filter */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
              Exam Year
            </label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="ALL">All Exam Years</option>
              {filterMeta?.available_years?.map((yr) => (
                <option key={yr} value={`${yr}`}>
                  Year {yr}
                </option>
              ))}
            </select>
          </div>

          {/* Marks Category */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
              Mark Weightage
            </label>
            <select
              value={selectedMarksCat}
              onChange={(e) => setSelectedMarksCat(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="ALL">All Marks</option>
              <option value="SHORT">Short Answer (≤ 2.5 Marks)</option>
              <option value="MEDIUM">Standard Question (3 – 5.5 Marks)</option>
              <option value="LONG">Long Essay / Detailed (≥ 6 Marks)</option>
            </select>
          </div>

          {/* Sort Selector */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
              Sort Questions
            </label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="question_number">Question Number (Ascending)</option>
              <option value="marks_desc">Marks: High to Low</option>
              <option value="marks_asc">Marks: Low to High</option>
              <option value="year_desc">Exam Year: Recent First</option>
              <option value="difficulty">Estimated Difficulty (Hardest First)</option>
            </select>
          </div>
        </div>

        {/* Secondary Filter Row: Difficulty Pills & Requirement Chips */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
          {/* Difficulty Pills */}
          <div className="flex items-center space-x-1.5 bg-slate-100 p-1 rounded-xl">
            {['ALL', 'EASY', 'MEDIUM', 'HARD'].map((diff) => (
              <button
                key={diff}
                onClick={() => setSelectedDifficulty(diff)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  selectedDifficulty === diff
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {diff === 'ALL' ? 'All Difficulties' : diff}
              </button>
            ))}
          </div>

          {/* Requirement Checkbox Chips */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setRequiresDiagram(!requiresDiagram)}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition ${
                requiresDiagram
                  ? 'bg-blue-50 text-blue-700 border-blue-300'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
              }`}
            >
              Requires Diagram
            </button>
            <button
              onClick={() => setRequiresCalc(!requiresCalc)}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition ${
                requiresCalc
                  ? 'bg-purple-50 text-purple-700 border-purple-300'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
              }`}
            >
              Requires Calculation
            </button>
            <button
              onClick={() => setRequiresAlgo(!requiresAlgo)}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition ${
                requiresAlgo
                  ? 'bg-amber-50 text-amber-700 border-amber-300'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
              }`}
            >
              Requires Algorithm
            </button>

            {hasActiveFilters && (
              <button
                onClick={handleResetFilters}
                className="px-2.5 py-1.5 rounded-lg text-xs font-bold text-rose-600 hover:bg-rose-50 border border-rose-200 transition"
              >
                Reset Filters
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Questions List */}
      <div className="space-y-4">
        {loading ? (
          <div className="p-12 text-center bg-white rounded-2xl border border-slate-200">
            <RefreshCw className="w-6 h-6 text-indigo-600 animate-spin mx-auto mb-2" />
            <p className="text-xs font-bold text-slate-700">Loading Question Bank for {activeSubject?.code}...</p>
          </div>
        ) : sortedQuestions.length > 0 ? (
          sortedQuestions.map((q) => {
            const isRubricOpen = expandedRubricId === q.id;
            return (
              <div
                key={q.id}
                className="bg-white rounded-2xl border border-slate-200/90 shadow-xs hover:border-indigo-300 transition-all overflow-hidden"
              >
                <div className="p-6 space-y-4">
                  {/* Top Metadata Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-black bg-slate-900 text-white px-2.5 py-0.5 rounded-lg">
                        Q{q.question_number}
                      </span>
                      <span className="text-xs font-extrabold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-200">
                        {q.marks.toFixed(1)} Marks
                      </span>

                      {/* Origin Badge */}
                      {q.origin === 'AI_GENERATED' ? (
                        <span className="text-[10px] font-black bg-purple-50 text-purple-700 border border-purple-200 px-2 py-0.5 rounded flex items-center space-x-1">
                          <Sparkles className="w-3 h-3 text-purple-600" />
                          <span>AI Practice Question</span>
                        </span>
                      ) : q.origin === 'MANUAL' ? (
                        <span className="text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded flex items-center space-x-1">
                          <PenTool className="w-3 h-3 text-amber-600" />
                          <span>Manual Entry</span>
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded flex items-center space-x-1">
                          <Award className="w-3 h-3 text-blue-600" />
                          <span>PYQ (Past Exam Paper)</span>
                        </span>
                      )}

                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                          q.estimated_difficulty === 'HARD'
                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                            : q.estimated_difficulty === 'MEDIUM'
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        }`}
                      >
                        Estimated: {q.estimated_difficulty} ({(q.difficulty_confidence * 100).toFixed(0)}% conf)
                      </span>

                      {/* Academic Year Badge */}
                      {q.academic_year && (
                        <span className="text-[10px] font-bold text-slate-700 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded flex items-center space-x-1">
                          <Calendar className="w-3 h-3 text-slate-400" />
                          <span>Year {q.academic_year}</span>
                        </span>
                      )}

                      {/* Question Types */}
                      {q.question_types?.map((type, tIdx) => (
                        <span key={tIdx} className="text-[10px] font-semibold bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                          {type}
                        </span>
                      ))}
                    </div>

                    {/* Source Document & Page Reference */}
                    <div className="text-xs text-slate-500 font-medium flex items-center space-x-1">
                      <FileText className="w-3.5 h-3.5 text-slate-400" />
                      <span>
                        Source: {q.source_document_name || q.source_name} (Page {q.page_number})
                      </span>
                    </div>
                  </div>

                  {/* Question Body */}
                  <p className="text-sm font-semibold text-slate-800 leading-relaxed font-sans">
                    {q.text}
                  </p>

                  {/* Topic Tag & Requirement Chips */}
                  <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] text-slate-500 font-medium">
                    {/* Mapped Topic Badge */}
                    <button
                      onClick={() => handleOpenMapTopic(q)}
                      className={`px-2.5 py-0.5 rounded-lg border font-semibold flex items-center space-x-1 transition ${
                        q.topic_name
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                          : 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
                      }`}
                      title="Click to re-assign or map topic"
                    >
                      <Tag className="w-3 h-3" />
                      <span>{q.topic_name ? `Topic: ${q.topic_name}` : 'Topic: Unmapped (Click to assign)'}</span>
                      {q.is_user_corrected && <span className="text-[9px] font-bold text-emerald-600">(Manual)</span>}
                    </button>

                    {q.requires_diagram && (
                      <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                        Requires Diagram
                      </span>
                    )}
                    {q.requires_calculation && (
                      <span className="px-2 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200">
                        Requires Calculation
                      </span>
                    )}
                    {q.requires_algorithm && (
                      <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">
                        Requires Algorithm
                      </span>
                    )}
                    {q.key_concepts && q.key_concepts.length > 0 && (
                      <span className="text-slate-400">
                        Concepts: {q.key_concepts.slice(0, 3).join(', ')}
                      </span>
                    )}
                  </div>

                  {/* Action Bar */}
                  <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
                    {q.marking_rubric ? (
                      <button
                        onClick={() => setExpandedRubricId(isRubricOpen ? null : q.id)}
                        className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center space-x-1"
                      >
                        <span>{isRubricOpen ? 'Hide Marking Rubric' : 'View Verified Marking Rubric'}</span>
                        {isRubricOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </button>
                    ) : (
                      <span className="text-xs text-slate-400 italic">Standard Exam Rubric Applied</span>
                    )}

                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleOpenEditModal(q)}
                        className="px-2.5 py-1.5 text-slate-600 hover:text-indigo-600 hover:bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold transition flex items-center space-x-1"
                        title="Edit question details"
                      >
                        <Edit2 className="w-3 h-3" />
                        <span>Edit</span>
                      </button>

                      <button
                        onClick={() => handleDeleteQuestion(q.id)}
                        className="px-2.5 py-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 rounded-lg text-xs font-semibold transition"
                        title="Delete question"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>

                      <button
                        onClick={() => onSelectQuestion(q)}
                        className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-xs transition flex items-center space-x-1.5"
                      >
                        <PenTool className="w-3.5 h-3.5" />
                        <span>Practice in Answer Coach</span>
                      </button>
                    </div>
                  </div>

                  {/* Expandable Rubric */}
                  {isRubricOpen && q.marking_rubric && (
                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5 animate-fade-in text-xs">
                      <div className="flex items-center space-x-2 text-indigo-900 font-bold">
                        <Award className="w-4 h-4 text-indigo-600" />
                        <span>Examination Marking Criteria (Allocated Marks: {q.marks}M)</span>
                      </div>
                      <div className="space-y-2 pt-1">
                        {q.marking_rubric.criteria?.map((item, cIdx) => (
                          <div key={cIdx} className="p-2.5 bg-white rounded-lg border border-slate-200 flex justify-between items-start gap-4">
                            <div>
                              <strong className="text-slate-800 font-semibold block">{item.criterion}</strong>
                              <p className="text-[11px] text-slate-500 mt-0.5">{item.description}</p>
                            </div>
                            <span className="font-mono font-bold text-indigo-600 shrink-0 bg-indigo-50 px-2 py-0.5 rounded">
                              {item.marks} M
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        ) : questions.length === 0 ? (
          /* Honest Empty State when subject has no questions */
          <div className="p-12 text-center bg-white rounded-2xl border border-dashed border-slate-300 space-y-4">
            <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto">
              <FileQuestion className="w-7 h-7" />
            </div>
            <div className="max-w-md mx-auto space-y-1.5">
              <h3 className="text-base font-bold text-slate-900">
                No Questions in {activeSubject?.name || 'this subject'} yet
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Upload university question papers or lecture notes for this subject in the
                Documents section to automatically index exam questions or synthesize grounded practice questions with marking rubrics.
              </p>
            </div>
            <div className="flex flex-wrap justify-center items-center gap-3 pt-2">
              <button
                onClick={handleOpenGenerateModal}
                className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-xl text-xs font-bold transition shadow-xs flex items-center space-x-1.5 cursor-pointer"
              >
                <Sparkles className="w-4 h-4" />
                <span>Generate Practice Questions</span>
              </button>

              {onNavigate && (
                <button
                  onClick={() => onNavigate('documents')}
                  className="px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 cursor-pointer"
                >
                  <FileText className="w-4 h-4" />
                  <span>Upload Documents</span>
                </button>
              )}

              <button
                onClick={handleOpenAddModal}
                className="px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Add Question Manually</span>
              </button>
            </div>
          </div>
        ) : (
          /* Empty State when filters yield 0 matches */
          <div className="p-10 text-center bg-white rounded-2xl border border-slate-200 space-y-3">
            <AlertCircle className="w-7 h-7 text-amber-500 mx-auto" />
            <h4 className="text-sm font-bold text-slate-800">No questions match your current filters</h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Try adjusting your keyword search, difficulty, marks, or topic filters to see more questions.
            </p>
            <button
              onClick={handleResetFilters}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition shadow-xs"
            >
              Reset All Filters
            </button>
          </div>
        )}
      </div>

      {/* Add Question Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200 animate-scale-up space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <Plus className="w-5 h-5 text-indigo-600" />
                <h3 className="font-bold text-slate-900 text-sm">Add Question to Question Bank</h3>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveAdd} className="space-y-4 text-xs">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Question #</label>
                  <input
                    type="text"
                    value={formNumber}
                    onChange={(e) => setFormNumber(e.target.value)}
                    placeholder="e.g. 1, 2(a)"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Marks</label>
                  <input
                    type="number"
                    step="0.5"
                    min="0.5"
                    max="100"
                    value={formMarks}
                    onChange={(e) => setFormMarks(parseFloat(e.target.value) || 5.0)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Exam Year</label>
                  <input
                    type="number"
                    min="2015"
                    max="2030"
                    value={formYear}
                    onChange={(e) => setFormYear(parseInt(e.target.value, 10) || 2025)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Question Text</label>
                <textarea
                  value={formText}
                  onChange={(e) => setFormText(e.target.value)}
                  placeholder="Enter the full examination question text..."
                  rows={4}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Topic</label>
                  <select
                    value={formTopicId}
                    onChange={(e) => setFormTopicId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold"
                  >
                    <option value="">Unassigned</option>
                    {subjectTopics.map((top) => (
                      <option key={top.id} value={`${top.id}`}>
                        {top.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Difficulty</label>
                  <select
                    value={formDifficulty}
                    onChange={(e) => setFormDifficulty(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold"
                  >
                    <option value="EASY">EASY</option>
                    <option value="MEDIUM">MEDIUM</option>
                    <option value="HARD">HARD</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Source / Exam Paper Title</label>
                <input
                  type="text"
                  value={formSourceName}
                  onChange={(e) => setFormSourceName(e.target.value)}
                  placeholder="e.g. Mid-Sem 2025, University Exam Paper"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold"
                />
              </div>

              {/* Requirements Checkboxes */}
              <div className="space-y-1.5 pt-1">
                <label className="block font-bold text-slate-700 mb-1">Answer Requirements</label>
                <div className="flex flex-wrap items-center gap-4">
                  <label className="flex items-center space-x-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formRequiresDiagram}
                      onChange={(e) => setFormRequiresDiagram(e.target.checked)}
                      className="rounded text-indigo-600"
                    />
                    <span className="text-slate-600 font-semibold">Diagram Required</span>
                  </label>
                  <label className="flex items-center space-x-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formRequiresCalc}
                      onChange={(e) => setFormRequiresCalc(e.target.checked)}
                      className="rounded text-indigo-600"
                    />
                    <span className="text-slate-600 font-semibold">Calculation Steps</span>
                  </label>
                  <label className="flex items-center space-x-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formRequiresAlgo}
                      onChange={(e) => setFormRequiresAlgo(e.target.checked)}
                      className="rounded text-indigo-600"
                    />
                    <span className="text-slate-600 font-semibold">Algorithm Procedure</span>
                  </label>
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-xs"
                >
                  Save Question
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Question Modal */}
      {isEditModalOpen && activeQuestion && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200 animate-scale-up space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <Edit2 className="w-5 h-5 text-indigo-600" />
                <h3 className="font-bold text-slate-900 text-sm">Edit Question</h3>
              </div>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4 text-xs">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Question #</label>
                  <input
                    type="text"
                    value={formNumber}
                    onChange={(e) => setFormNumber(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Marks</label>
                  <input
                    type="number"
                    step="0.5"
                    min="0.5"
                    max="100"
                    value={formMarks}
                    onChange={(e) => setFormMarks(parseFloat(e.target.value) || 5.0)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Exam Year</label>
                  <input
                    type="number"
                    min="2015"
                    max="2030"
                    value={formYear}
                    onChange={(e) => setFormYear(parseInt(e.target.value, 10) || 2025)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Question Text</label>
                <textarea
                  value={formText}
                  onChange={(e) => setFormText(e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Mapped Topic</label>
                  <select
                    value={formTopicId}
                    onChange={(e) => setFormTopicId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold"
                  >
                    <option value="">Unassigned</option>
                    {subjectTopics.map((top) => (
                      <option key={top.id} value={`${top.id}`}>
                        {top.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Difficulty</label>
                  <select
                    value={formDifficulty}
                    onChange={(e) => setFormDifficulty(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold"
                  >
                    <option value="EASY">EASY</option>
                    <option value="MEDIUM">MEDIUM</option>
                    <option value="HARD">HARD</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Source Name</label>
                <input
                  type="text"
                  value={formSourceName}
                  onChange={(e) => setFormSourceName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold"
                />
              </div>

              <div className="space-y-1.5 pt-1">
                <label className="block font-bold text-slate-700 mb-1">Answer Requirements</label>
                <div className="flex flex-wrap items-center gap-4">
                  <label className="flex items-center space-x-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formRequiresDiagram}
                      onChange={(e) => setFormRequiresDiagram(e.target.checked)}
                      className="rounded text-indigo-600"
                    />
                    <span className="text-slate-600 font-semibold">Diagram Required</span>
                  </label>
                  <label className="flex items-center space-x-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formRequiresCalc}
                      onChange={(e) => setFormRequiresCalc(e.target.checked)}
                      className="rounded text-indigo-600"
                    />
                    <span className="text-slate-600 font-semibold">Calculation Steps</span>
                  </label>
                  <label className="flex items-center space-x-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formRequiresAlgo}
                      onChange={(e) => setFormRequiresAlgo(e.target.checked)}
                      className="rounded text-indigo-600"
                    />
                    <span className="text-slate-600 font-semibold">Algorithm Procedure</span>
                  </label>
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-xs"
                >
                  Update Question
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Map / Change Topic Modal */}
      {isMapTopicModalOpen && activeQuestion && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 animate-scale-up space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <Tag className="w-5 h-5 text-indigo-600" />
                <h3 className="font-bold text-slate-900 text-sm">Assign Topic to Question</h3>
              </div>
              <button
                onClick={() => setIsMapTopicModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="text-xs space-y-3">
              <p className="text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-200">
                <strong>Q{activeQuestion.question_number}:</strong> {activeQuestion.text.slice(0, 140)}...
              </p>

              <div>
                <label className="block font-bold text-slate-700 mb-1.5">
                  Select Topic in {activeSubject?.code}:
                </label>
                <select
                  value={formTopicId}
                  onChange={(e) => setFormTopicId(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-xs"
                >
                  <option value="">Unassigned (No Topic)</option>
                  {subjectTopics.map((top) => (
                    <option key={top.id} value={`${top.id}`}>
                      {top.name} ({top.category})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  onClick={() => setIsMapTopicModalOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-bold"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveTopicMapping}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-xs"
                >
                  Save Topic Assignment
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Generate Practice Questions Modal */}
      {isGenerateModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 animate-scale-up space-y-4 max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-600 to-purple-600 text-white flex items-center justify-center shadow-xs">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-sm">Generate Practice Questions</h3>
                  <p className="text-[11px] text-slate-500">
                    Target Subject: <span className="font-semibold text-indigo-600">{activeSubject?.code} - {activeSubject?.name}</span>
                  </p>
                </div>
              </div>
              <button
                onClick={() => !generating && setIsGenerateModalOpen(false)}
                disabled={generating}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Informative Note on Engine */}
            <div className="bg-indigo-50/60 border border-indigo-100 rounded-xl p-3 text-[11px] text-indigo-900 flex items-start space-x-2">
              <Sparkles className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <span className="font-bold">Grounded Academic Synthesis:</span>
                <p className="text-indigo-800/90 leading-relaxed">
                  Questions are generated directly from propositions, definitions, algorithms, and key concepts in your study PDFs with page citations and marking rubrics.
                </p>
              </div>
            </div>

            {/* Error / Success Feedback */}
            {generateError && (
              <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-xs text-rose-700 flex items-start space-x-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="block font-bold">Generation Error</strong>
                  <span>{generateError}</span>
                </div>
              </div>
            )}

            {generateSuccess && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-xs text-emerald-800 flex items-start space-x-2">
                <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="block font-bold">Success</strong>
                  <span>{generateSuccess}</span>
                </div>
              </div>
            )}

            <form onSubmit={handleExecuteGenerate} className="space-y-4 text-xs">
              {/* Document Selection Section */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-800 block">
                    Source Study Documents
                    <span className="text-[11px] font-normal text-slate-500 ml-1.5">
                      ({genSelectedDocIds.length} of {subjectDocs.length} selected)
                    </span>
                  </label>
                  {subjectDocs.length > 0 && (
                    <div className="flex items-center space-x-2 text-[11px]">
                      <button
                        type="button"
                        onClick={handleSelectAllDocs}
                        className="text-indigo-600 hover:text-indigo-800 font-semibold"
                      >
                        Select All
                      </button>
                      <span className="text-slate-300">•</span>
                      <button
                        type="button"
                        onClick={handleDeselectAllDocs}
                        className="text-slate-500 hover:text-slate-700 font-medium"
                      >
                        Clear
                      </button>
                    </div>
                  )}
                </div>

                {subjectDocs.length === 0 ? (
                  <div className="p-4 bg-slate-50 border border-dashed border-slate-300 rounded-xl text-center space-y-2">
                    <p className="text-slate-600 font-medium">No documents uploaded for this subject yet.</p>
                    {onNavigate && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsGenerateModalOpen(false);
                          onNavigate('documents');
                        }}
                        className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-bold"
                      >
                        Upload Study Material First
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1 border border-slate-200 rounded-xl p-2 bg-slate-50/50">
                    {subjectDocs.map((doc) => {
                      const isSelected = genSelectedDocIds.includes(doc.id);
                      return (
                        <div
                          key={doc.id}
                          onClick={() => handleToggleDocSelection(doc.id)}
                          className={`p-2 rounded-lg border text-xs cursor-pointer flex items-center justify-between transition ${
                            isSelected
                              ? 'bg-indigo-50/70 border-indigo-200 text-indigo-950 font-semibold'
                              : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                          }`}
                        >
                          <div className="flex items-center space-x-2.5 truncate mr-2">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => {}} // handled by parent div onClick
                              className="rounded text-indigo-600 shrink-0"
                            />
                            <span className="truncate">{doc.filename}</span>
                          </div>
                          <div className="flex items-center space-x-1.5 shrink-0 text-[10px]">
                            <span className="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-mono">
                              {doc.doc_category || 'STUDY'}
                            </span>
                            <span className="text-slate-400">
                              {doc.page_count} pgs
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Options Grid: Count, Difficulty, Question Type */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Number of Questions */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Question Count</label>
                  <select
                    value={genCount}
                    onChange={(e) => setGenCount(parseInt(e.target.value, 10))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold"
                  >
                    <option value={3}>3 Questions (Quick Practice)</option>
                    <option value={5}>5 Questions (Standard Set)</option>
                    <option value={8}>8 Questions (Extensive)</option>
                    <option value={10}>10 Questions (Complete Test)</option>
                  </select>
                </div>

                {/* Question Type */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Question Format</label>
                  <select
                    value={genQuestionType}
                    onChange={(e) => setGenQuestionType(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold"
                  >
                    <option value="MIXED">Mixed (MCQs, Short & Long)</option>
                    <option value="MCQ">Multiple Choice (MCQ)</option>
                    <option value="SHORT_ANSWER">Short Answer (2–3 Marks)</option>
                    <option value="LONG_ANSWER">Long Essay (5–10 Marks)</option>
                  </select>
                </div>

                {/* Difficulty */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Difficulty Level</label>
                  <select
                    value={genDifficulty}
                    onChange={(e) => setGenDifficulty(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold"
                  >
                    <option value="MIXED">Adaptive / Mixed</option>
                    <option value="EASY">Easy (Definitions & Recall)</option>
                    <option value="MEDIUM">Medium (Standard Exam)</option>
                    <option value="HARD">Hard (Analytical & Deep)</option>
                  </select>
                </div>
              </div>

              {/* Optional Topic Focus */}
              {subjectTopics.length > 0 && (
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Topic Scope <span className="font-normal text-slate-400">(Optional)</span>
                  </label>
                  <select
                    value={genTopicId}
                    onChange={(e) => setGenTopicId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold"
                  >
                    <option value="ALL">All Topics in Selected Documents</option>
                    {subjectTopics.map((top) => (
                      <option key={top.id} value={`${top.id}`}>
                        {top.name} ({top.category})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  disabled={generating}
                  onClick={() => setIsGenerateModalOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={generating || (subjectDocs.length > 0 && genSelectedDocIds.length === 0)}
                  className={`px-5 py-2 rounded-xl font-bold shadow-xs flex items-center space-x-1.5 transition ${
                    generating || (subjectDocs.length > 0 && genSelectedDocIds.length === 0)
                      ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                      : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white cursor-pointer'
                  }`}
                >
                  {generating ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin mr-1" />
                      <span>Synthesizing Questions...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5 mr-1" />
                      <span>Generate {genCount} Practice Questions</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
