import React, { useState, useEffect } from 'react';
import {
  Target, ChevronDown, ChevronUp, Clock, BookOpen, Sparkles, Filter,
  Plus, Star, Edit3, Trash2, FileText, CheckCircle2, AlertCircle,
  RefreshCw, Layers, X, Save
} from 'lucide-react';
import { api } from '../services/api';
import { TopicItem, Subject } from '../types';
import { PriorityBadge } from '../components/PriorityBadge';

interface Props {
  onNavigate: (tab: string) => void;
  activeSubject?: Subject | null;
  onSubjectChange?: (subjectId: number) => void;
}

export const TopicsPage: React.FC<Props> = ({
  onNavigate,
  activeSubject,
  onSubjectChange,
}) => {
  const [topics, setTopics] = useState<TopicItem[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState<number | null>(activeSubject?.id || null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  // Filters
  const [filterMode, setFilterMode] = useState<'ALL' | 'HIGH_PRIORITY' | 'MARKED_IMPORTANT' | 'HAS_PYQ'>('ALL');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [expandedId, setExpandedId] = useState<number | null>(null);

  // Add / Edit Modal state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingTopic, setEditingTopic] = useState<TopicItem | null>(null);
  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState('Core Concept');
  const [formDescription, setFormDescription] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [formMarkImportant, setFormMarkImportant] = useState(true);
  const [formSyllabusWeight, setFormSyllabusWeight] = useState(0.8);
  const [savingTopic, setSavingTopic] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Inline Note Editor state
  const [editingNotesId, setEditingNotesId] = useState<number | null>(null);
  const [noteDraft, setNoteDraft] = useState('');

  // Sync activeSubject when passed from App
  useEffect(() => {
    if (activeSubject?.id && activeSubject.id !== selectedSubjectId) {
      setSelectedSubjectId(activeSubject.id);
    }
  }, [activeSubject]);

  useEffect(() => {
    loadSubjectsAndTopics();
  }, [selectedSubjectId]);

  const loadSubjectsAndTopics = async () => {
    setLoading(true);
    try {
      const userSubs = await api.getSubjects().catch(() => []);
      setSubjects(userSubs);

      let targetId = selectedSubjectId;
      if (!targetId && userSubs.length > 0) {
        targetId = userSubs[0].id;
        setSelectedSubjectId(targetId);
      }

      if (targetId) {
        const data = await api.getTopics(targetId);
        setTopics(data);
      } else {
        setTopics([]);
      }
    } catch (err) {
      console.error('Failed to load topics:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubjectSelect = (subId: number) => {
    setSelectedSubjectId(subId);
    if (onSubjectChange) onSubjectChange(subId);
  };

  const handleSyncEvidence = async () => {
    if (!selectedSubjectId) return;
    setSyncing(true);
    try {
      const updated = await api.syncTopics(selectedSubjectId);
      setTopics(updated);
    } catch (err: any) {
      alert(`Sync failed: ${err.message}`);
    } finally {
      setSyncing(false);
    }
  };

  const handleToggleImportant = async (t: TopicItem) => {
    const newStatus = !t.is_manually_marked;
    try {
      const updated = await api.markTopicImportant(t.id, newStatus, t.personal_notes);
      setTopics((prev) => prev.map((item) => (item.id === t.id ? updated : item)));
    } catch (err: any) {
      alert(`Failed to update importance: ${err.message}`);
    }
  };

  const handleSaveNotes = async (topicId: number) => {
    const t = topics.find((item) => item.id === topicId);
    if (!t) return;
    try {
      const updated = await api.markTopicImportant(topicId, Boolean(t.is_manually_marked), noteDraft);
      setTopics((prev) => prev.map((item) => (item.id === topicId ? updated : item)));
      setEditingNotesId(null);
    } catch (err: any) {
      alert(`Failed to save notes: ${err.message}`);
    }
  };

  const handleDeleteTopic = async (topicId: number, topicName: string) => {
    if (!window.confirm(`Are you sure you want to delete the topic "${topicName}"?`)) {
      return;
    }
    try {
      await api.deleteTopic(topicId);
      setTopics((prev) => prev.filter((item) => item.id !== topicId));
    } catch (err: any) {
      alert(`Delete failed: ${err.message}`);
    }
  };

  const openAddModal = () => {
    setEditingTopic(null);
    setFormName('');
    setFormCategory('Core Concept');
    setFormDescription('');
    setFormNotes('');
    setFormMarkImportant(true);
    setFormSyllabusWeight(0.85);
    setFormError(null);
    setIsAddModalOpen(true);
  };

  const openEditModal = (t: TopicItem) => {
    setEditingTopic(t);
    setFormName(t.name);
    setFormCategory(t.category);
    setFormDescription(t.description || '');
    setFormNotes(t.personal_notes || '');
    setFormMarkImportant(Boolean(t.is_manually_marked));
    setFormSyllabusWeight(t.syllabus_weight || 0.8);
    setFormError(null);
    setIsAddModalOpen(true);
  };

  const handleSaveTopicSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      setFormError('Please enter a topic name.');
      return;
    }
    if (!selectedSubjectId) {
      setFormError('Please select a target subject.');
      return;
    }

    setSavingTopic(true);
    setFormError(null);
    try {
      if (editingTopic) {
        const updated = await api.updateTopic(editingTopic.id, {
          name: formName.trim(),
          category: formCategory.trim(),
          description: formDescription.trim(),
          is_manually_marked: formMarkImportant,
          personal_notes: formNotes.trim() || undefined,
        });
        setTopics((prev) => prev.map((t) => (t.id === editingTopic.id ? updated : t)));
      } else {
        const created = await api.createTopic({
          subject_id: selectedSubjectId,
          name: formName.trim(),
          category: formCategory.trim(),
          description: formDescription.trim(),
          is_manually_marked: formMarkImportant,
          personal_notes: formNotes.trim() || undefined,
          syllabus_weight: formSyllabusWeight,
        });
        setTopics((prev) => [created, ...prev]);
      }
      setIsAddModalOpen(false);
    } catch (err: any) {
      setFormError(err.message || 'Failed to save topic.');
    } finally {
      setSavingTopic(false);
    }
  };

  // Filter Categories
  const categories = ['ALL', ...Array.from(new Set(topics.map((t) => t.category)))];

  // Apply Filters
  const filtered = topics.filter((t) => {
    if (selectedCategory !== 'ALL' && t.category !== selectedCategory) return false;
    if (filterMode === 'HIGH_PRIORITY') return t.preparation_priority === 'HIGH';
    if (filterMode === 'MARKED_IMPORTANT') return Boolean(t.is_manually_marked);
    if (filterMode === 'HAS_PYQ') return (t.pyq_appearances || 0) > 0 || t.historical_frequency > 0;
    return true;
  });

  const highPriority = filtered.filter((t) => t.preparation_priority === 'HIGH');
  const mediumPriority = filtered.filter((t) => t.preparation_priority === 'MEDIUM');
  const lowPriority = filtered.filter((t) => t.preparation_priority === 'LOW');

  const currentSubject = subjects.find((s) => s.id === selectedSubjectId);

  const renderTopicCard = (t: TopicItem) => {
    const isExpanded = expandedId === t.id;
    const isMarked = Boolean(t.is_manually_marked);
    const hasSourceDoc = Boolean(t.source_document_name);
    const hasPyq = (t.pyq_appearances || 0) > 0 || (t.pyq_sources && t.pyq_sources.length > 0);

    return (
      <div
        key={t.id}
        className={`bg-white rounded-3xl border transition-all overflow-hidden flex flex-col justify-between shadow-xs hover:shadow-md ${
          isMarked
            ? 'border-amber-300 ring-1 ring-amber-200/60'
            : 'border-slate-200/90 hover:border-indigo-300'
        }`}
      >
        <div className="p-6 space-y-4 flex-1">
          {/* Header Row: Category, AI Priority, Manual Star, Action Buttons */}
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">
                  {t.category}
                </span>

                {/* AI-Generated Priority Badge */}
                <PriorityBadge priority={t.preparation_priority} />

                {/* AI Score */}
                <span className="text-[11px] font-mono font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-200">
                  AI Score: {(t.priority_score * 100).toFixed(0)}%
                </span>

                {/* Separate Student Manual Importance Badge */}
                {isMarked && (
                  <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 border border-amber-300 flex items-center space-x-1">
                    <Star className="w-3 h-3 fill-amber-500 text-amber-600" />
                    <span>Student Marked</span>
                  </span>
                )}
              </div>

              <h3 className="text-base font-bold text-slate-900 line-clamp-2 pt-0.5">
                {t.name}
              </h3>
            </div>

            {/* Quick Actions: Star, Edit, Delete */}
            <div className="flex items-center space-x-1 shrink-0">
              <button
                onClick={() => handleToggleImportant(t)}
                title={isMarked ? 'Remove Important Mark' : 'Mark as Important'}
                className={`p-2 rounded-xl transition cursor-pointer ${
                  isMarked
                    ? 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                    : 'bg-slate-100 text-slate-400 hover:text-amber-600 hover:bg-amber-50'
                }`}
              >
                <Star className={`w-4 h-4 ${isMarked ? 'fill-amber-500 text-amber-600' : ''}`} />
              </button>

              <button
                onClick={() => openEditModal(t)}
                title="Edit Topic"
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
              >
                <Edit3 className="w-4 h-4" />
              </button>

              <button
                onClick={() => handleDeleteTopic(t.id, t.name)}
                title="Delete Topic"
                className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          <p className="text-xs text-slate-600 leading-relaxed">
            {t.description || 'No description provided.'}
          </p>

          {/* Evidence Attribution: Source Document & Page Reference */}
          {hasSourceDoc && (
            <div className="p-2.5 bg-slate-50 border border-slate-200/70 rounded-xl flex items-center justify-between text-xs">
              <div className="flex items-center space-x-2 text-slate-700 font-medium truncate">
                <FileText className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                <span className="truncate">Source: <strong className="text-slate-900">{t.source_document_name}</strong></span>
              </div>
              {t.source_page_number && (
                <span className="text-[11px] font-bold px-2 py-0.5 bg-white border border-slate-200 rounded-md text-slate-600 shrink-0">
                  Page {t.source_page_number}
                </span>
              )}
            </div>
          )}

          {/* Actual Evidence Metrics (Zero Fabrication) */}
          <div className="grid grid-cols-3 gap-2 p-3 bg-slate-50 rounded-2xl border border-slate-200/80 text-center">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Exam Frequency</span>
              <span className="text-sm font-extrabold text-slate-800">
                {t.historical_frequency > 0 ? `${t.historical_frequency} Question${t.historical_frequency > 1 ? 's' : ''}` : '0 Papers'}
              </span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Average Marks</span>
              <span className="text-sm font-extrabold text-slate-800">
                {t.avg_marks > 0 ? `${t.avg_marks.toFixed(1)} M` : '—'}
              </span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Syllabus Weight</span>
              <span className="text-sm font-extrabold text-indigo-600 font-mono">
                {Math.round((t.syllabus_weight || 0.8) * 100)}%
              </span>
            </div>
          </div>

          {/* Verified PYQ Sources List */}
          {hasPyq && t.pyq_sources && t.pyq_sources.length > 0 && (
            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Identified in Past Exam Papers:
              </span>
              <div className="flex flex-wrap gap-1">
                {t.pyq_sources.map((src, sIdx) => (
                  <span
                    key={sIdx}
                    className="text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-md"
                  >
                    {src}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Personal Student Notes Section */}
          <div className="pt-2 border-t border-slate-100">
            {editingNotesId === t.id ? (
              <div className="space-y-2">
                <textarea
                  value={noteDraft}
                  onChange={(e) => setNoteDraft(e.target.value)}
                  placeholder="Add your personal notes or exam reminders for this topic..."
                  className="w-full text-xs p-2.5 rounded-xl border border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                  rows={2}
                />
                <div className="flex items-center justify-end space-x-2">
                  <button
                    onClick={() => setEditingNotesId(null)}
                    className="px-2.5 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleSaveNotes(t.id)}
                    className="px-3 py-1 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs cursor-pointer flex items-center space-x-1"
                  >
                    <Save className="w-3 h-3" />
                    <span>Save Note</span>
                  </button>
                </div>
              </div>
            ) : t.personal_notes ? (
              <div className="p-2.5 bg-amber-50/60 border border-amber-200/80 rounded-xl space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800">
                    My Study Note:
                  </span>
                  <button
                    onClick={() => {
                      setEditingNotesId(t.id);
                      setNoteDraft(t.personal_notes || '');
                    }}
                    className="text-[10px] font-semibold text-indigo-600 hover:underline cursor-pointer"
                  >
                    Edit
                  </button>
                </div>
                <p className="text-xs text-amber-950 font-medium leading-relaxed">
                  {t.personal_notes}
                </p>
              </div>
            ) : (
              <button
                onClick={() => {
                  setEditingNotesId(t.id);
                  setNoteDraft('');
                }}
                className="text-xs text-slate-400 hover:text-indigo-600 font-medium inline-flex items-center space-x-1 cursor-pointer"
              >
                <span>+ Add personal note / exam focus</span>
              </button>
            )}
          </div>

          {/* Keywords & Algorithms */}
          <div className="flex flex-wrap gap-1.5 pt-1">
            {t.keywords?.slice(0, 4).map((kw, idx) => (
              <span key={idx} className="text-[10px] font-medium bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md">
                {kw}
              </span>
            ))}
            {t.algorithms?.slice(0, 2).map((algo, idx) => (
              <span key={idx} className="text-[10px] font-semibold bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-md border border-indigo-100">
                Algo: {algo}
              </span>
            ))}
          </div>

          {/* Expandable Explainable Rationale */}
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
            <button
              onClick={() => setExpandedId(isExpanded ? null : t.id)}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center space-x-1 cursor-pointer"
            >
              <span>{isExpanded ? 'Hide AI Evidence Rationale' : 'Why is this Prioritized?'}</span>
              {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>

            <span className="text-xs text-slate-400 flex items-center">
              <Clock className="w-3.5 h-3.5 mr-1" />
              {t.recommended_study_minutes || 45} min
            </span>
          </div>

          {isExpanded && (
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3 animate-fade-in text-xs">
              <span className="font-bold text-slate-800 block">Evidence Breakdown:</span>
              <p className="text-xs text-slate-600 leading-relaxed italic">
                "{t.importance_reason || 'Derived from syllabus coverage and examination appearance patterns.'}"
              </p>

              <div className="space-y-2 pt-1">
                {Object.entries(t.priority_breakdown || {}).map(([factor, score]: [string, any]) => (
                  <div key={factor} className="space-y-1">
                    <div className="flex justify-between text-[11px] font-medium text-slate-600 capitalize">
                      <span>{factor.replace(/_/g, ' ')}</span>
                      <span className="font-mono font-bold text-indigo-700">{Math.round(score * 100)}%</span>
                    </div>
                    <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                      <div
                        className="bg-indigo-600 h-full rounded-full"
                        style={{ width: `${Math.round(score * 100)}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>

              {t.formulas && t.formulas.length > 0 && (
                <div className="pt-2 border-t border-slate-200/60">
                  <span className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Key Formula:</span>
                  <code className="text-xs font-mono font-semibold text-indigo-900 bg-white p-2 rounded-lg block border border-slate-200">
                    {t.formulas[0]}
                  </code>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      {/* Top Header & Subject Context */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Important Topics & Priority</h1>
            {currentSubject && (
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                {currentSubject.code || currentSubject.name}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 max-w-2xl leading-relaxed mt-1">
            Data-driven topic rankings calculated strictly from uploaded course materials and previous-year exam papers.
            Manual student importance selections are preserved separately.
          </p>
        </div>

        {/* Header Actions: Subject Switcher, Add Topic, Sync Evidence */}
        <div className="flex items-center flex-wrap gap-2.5">
          {subjects.length > 1 && (
            <div className="flex items-center space-x-1.5 bg-white border border-slate-200 rounded-xl px-3 py-1.5 shadow-xs">
              <span className="text-xs text-slate-500 font-semibold">Subject:</span>
              <select
                value={selectedSubjectId || ''}
                onChange={(e) => handleSubjectSelect(Number(e.target.value))}
                className="text-xs font-bold text-slate-800 bg-transparent focus:outline-none cursor-pointer"
              >
                {subjects.map((sub) => (
                  <option key={sub.id} value={sub.id}>
                    {sub.name} {sub.code ? `(${sub.code})` : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          <button
            onClick={handleSyncEvidence}
            disabled={syncing || !selectedSubjectId}
            title="Recalculate frequencies and evidence from uploaded papers"
            className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 shadow-xs transition flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-indigo-600 ${syncing ? 'animate-spin' : ''}`} />
            <span>{syncing ? 'Syncing...' : 'Sync Evidence'}</span>
          </button>

          <button
            onClick={openAddModal}
            disabled={!selectedSubjectId}
            className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm transition flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
          >
            <Plus className="w-4 h-4" />
            <span>Add Topic</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs: Priority Mode & Category */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-b border-slate-200 pb-4">
        {/* Priority Filter Pills */}
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => setFilterMode('ALL')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              filterMode === 'ALL'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            All Topics ({topics.length})
          </button>

          <button
            onClick={() => setFilterMode('HIGH_PRIORITY')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              filterMode === 'HIGH_PRIORITY'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            AI High Priority ({topics.filter((t) => t.preparation_priority === 'HIGH').length})
          </button>

          <button
            onClick={() => setFilterMode('MARKED_IMPORTANT')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center space-x-1 ${
              filterMode === 'MARKED_IMPORTANT'
                ? 'bg-amber-500 text-white shadow-xs'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <Star className="w-3.5 h-3.5 fill-current" />
            <span>Student Marked ({topics.filter((t) => t.is_manually_marked).length})</span>
          </button>

          <button
            onClick={() => setFilterMode('HAS_PYQ')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              filterMode === 'HAS_PYQ'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            Has Exam Evidence ({topics.filter((t) => (t.pyq_appearances || 0) > 0 || t.historical_frequency > 0).length})
          </button>
        </div>

        {/* Category Dropdown */}
        {categories.length > 2 && (
          <div className="flex items-center space-x-2">
            <span className="text-xs text-slate-500 font-medium">Category:</span>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="text-xs font-semibold text-slate-800 bg-white border border-slate-200 rounded-xl px-3 py-1.5 focus:outline-none cursor-pointer"
            >
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Main Topics Content */}
      {loading ? (
        <div className="p-16 text-center space-y-3">
          <RefreshCw className="w-8 h-8 text-indigo-500 animate-spin mx-auto" />
          <p className="text-sm font-semibold text-slate-600">Loading curriculum topics and evidence...</p>
        </div>
      ) : topics.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 border border-slate-200/90 text-center space-y-4 max-w-lg mx-auto shadow-xs">
          <div className="w-14 h-14 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center mx-auto">
            <BookOpen className="w-7 h-7" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-slate-900">No topics found for this subject</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Upload course notes, syllabus, or previous-year exam papers to automatically extract topics, or add topics manually below.
            </p>
          </div>
          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              onClick={() => onNavigate('documents')}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
            >
              Upload Documents
            </button>
            <button
              onClick={openAddModal}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition cursor-pointer"
            >
              + Add First Topic
            </button>
          </div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl p-8 border border-slate-200 text-center space-y-2">
          <p className="text-sm font-bold text-slate-700">No topics matched the current filter.</p>
          <button
            onClick={() => {
              setFilterMode('ALL');
              setSelectedCategory('ALL');
            }}
            className="text-xs font-semibold text-indigo-600 hover:underline cursor-pointer"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="space-y-8">
          {/* High Priority Group */}
          {highPriority.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <span className="w-3 h-3 rounded-full bg-rose-500"></span>
                <h3 className="text-base font-extrabold text-slate-900 tracking-tight">
                  High Priority Topics ({highPriority.length})
                </h3>
                <span className="text-xs text-slate-400 font-medium">&bull; Highest exam frequency and core syllabus weight</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {highPriority.map(renderTopicCard)}
              </div>
            </div>
          )}

          {/* Medium Priority Group */}
          {mediumPriority.length > 0 && (
            <div className="space-y-4 pt-2">
              <div className="flex items-center space-x-2">
                <span className="w-3 h-3 rounded-full bg-amber-500"></span>
                <h3 className="text-base font-extrabold text-slate-900 tracking-tight">
                  Medium Priority Topics ({mediumPriority.length})
                </h3>
                <span className="text-xs text-slate-400 font-medium">&bull; Regular practice & concept consolidation</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {mediumPriority.map(renderTopicCard)}
              </div>
            </div>
          )}

          {/* Low Priority Group */}
          {lowPriority.length > 0 && (
            <div className="space-y-4 pt-2">
              <div className="flex items-center space-x-2">
                <span className="w-3 h-3 rounded-full bg-emerald-500"></span>
                <h3 className="text-base font-extrabold text-slate-900 tracking-tight">
                  Lower Priority Topics ({lowPriority.length})
                </h3>
                <span className="text-xs text-slate-400 font-medium">&bull; Standard curriculum coverage and quick review</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {lowPriority.map(renderTopicCard)}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Add / Edit Topic Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 text-white relative shrink-0">
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="absolute top-5 right-5 p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
              <h2 className="text-xl font-bold tracking-tight">
                {editingTopic ? 'Edit Topic' : 'Add Curriculum Topic'}
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Target Subject: <span className="text-indigo-300 font-bold">{currentSubject?.name}</span>
              </p>
            </div>

            <form onSubmit={handleSaveTopicSubmit} className="p-6 space-y-4 overflow-y-auto">
              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start space-x-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <p className="text-xs font-semibold text-rose-800">{formError}</p>
                </div>
              )}

              {/* Topic Name */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 block">
                  Topic Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. Asymmetric Key Encryption & RSA"
                  className="w-full text-xs p-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 font-medium"
                  required
                />
              </div>

              {/* Category */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 block">
                  Category
                </label>
                <input
                  type="text"
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value)}
                  placeholder="e.g. Core Concept, Ciphers, Algorithms"
                  className="w-full text-xs p-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                />
              </div>

              {/* Description */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 block">
                  Description / Syllabus Objective
                </label>
                <textarea
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Summary of concepts covered in this topic..."
                  className="w-full text-xs p-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                  rows={2}
                />
              </div>

              {/* Manual Importance Toggle */}
              <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-2xl flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-amber-950 block">Mark as Student Important</span>
                  <span className="text-[11px] text-amber-800">
                    Flag this topic as high focus for your upcoming exam preparation
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={formMarkImportant}
                  onChange={(e) => setFormMarkImportant(e.target.checked)}
                  className="w-4 h-4 text-amber-600 rounded focus:ring-amber-500 cursor-pointer"
                />
              </div>

              {/* Personal Notes */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 block">
                  Personal Study Notes / Professor's Hints (Optional)
                </label>
                <textarea
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="e.g. Professor hinted at 10-mark question on this in class..."
                  className="w-full text-xs p-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                  rows={2}
                />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingTopic}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-600/20 transition cursor-pointer disabled:opacity-50"
                >
                  {savingTopic ? 'Saving...' : editingTopic ? 'Update Topic' : 'Add Topic'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
