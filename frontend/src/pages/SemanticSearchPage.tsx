import React, { useState, useEffect } from 'react';
import {
  Search, FileText, Bookmark, ExternalLink, Sparkles, Filter,
  BookOpen, Layers, CheckCircle2, ShieldAlert, BookMarked,
  Hash, ArrowRight, Zap, Cpu, RefreshCw
} from 'lucide-react';
import { api } from '../services/api';
import { SearchResult, SearchResponse, Subject } from '../types';
import { SourceModal } from '../components/SourceModal';

interface Props {
  activeSubject?: Subject | null;
  onSubjectChange?: () => void;
  onNavigate?: (tab: string) => void;
}

export const SemanticSearchPage: React.FC<Props> = ({
  activeSubject,
  onSubjectChange,
  onNavigate
}) => {
  const [query, setQuery] = useState(
    activeSubject?.name
      ? `Explain core concepts and algorithms in ${activeSubject.name}`
      : 'Why is RSA vulnerable to quantum computers?'
  );
  const [searchScope, setSearchScope] = useState<'CURRENT' | 'ALL'>('CURRENT');
  const [searchMode, setSearchMode] = useState<'HYBRID' | 'KEYWORD' | 'SEMANTIC'>('HYBRID');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searchResponse, setSearchResponse] = useState<SearchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [modalData, setModalData] = useState<SearchResult | null>(null);

  // Dynamic sample queries based on active subject or general CS
  const sampleQueries = activeSubject?.name?.toLowerCase().includes('crypto')
    ? [
        'Why is RSA vulnerable to quantum computers?',
        'Explain Module-LWE and ML-KEM post-quantum lattice',
        'How does Feistel cipher work in DES rounds',
        'Differentiate between active and passive attacks',
        'What is an irreducible polynomial in Galois field?'
      ]
    : [
        'Binary search trees vs AVL balance factor rotation',
        'Round robin CPU scheduling and context switch',
        'ACID transactions and serializability isolation',
        'Dijkstra shortest path algorithm priority queue',
        'Lexical analysis tokenization and syntax parsing'
      ];

  // Re-run search if active subject changes while in CURRENT scope
  useEffect(() => {
    if (activeSubject && searchScope === 'CURRENT') {
      handleSearch(undefined, undefined, activeSubject.id);
    }
  }, [activeSubject?.id]);

  const handleSearch = async (
    e?: React.FormEvent,
    customQ?: string,
    overrideSubjectId?: number,
    overrideMode?: 'HYBRID' | 'KEYWORD' | 'SEMANTIC'
  ) => {
    if (e) e.preventDefault();
    const q = (customQ !== undefined ? customQ : query).trim();
    if (!q) return;

    setLoading(true);
    try {
      const targetSubId =
        searchScope === 'CURRENT'
          ? (overrideSubjectId !== undefined ? overrideSubjectId : activeSubject?.id)
          : undefined;

      const targetMode = overrideMode || searchMode;
      const data = await api.search(q, targetSubId, 8, targetMode);
      setResults(data.results);
      setSearchResponse(data);
    } catch (err: any) {
      alert(`Academic Search error: ${err.message || err}`);
    } finally {
      setLoading(false);
    }
  };

  const handleScopeChange = (newScope: 'CURRENT' | 'ALL') => {
    setSearchScope(newScope);
    const targetSubId = newScope === 'CURRENT' ? activeSubject?.id : undefined;
    handleSearch(undefined, undefined, targetSubId);
  };

  const handleModeChange = (newMode: 'HYBRID' | 'KEYWORD' | 'SEMANTIC') => {
    setSearchMode(newMode);
    handleSearch(undefined, undefined, undefined, newMode);
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
                Academic Retrieval Engine
              </span>
              {activeSubject?.code && (
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-white/10 text-slate-200">
                  {activeSubject.code}
                </span>
              )}
            </div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white">
              Academic Search: {searchScope === 'CURRENT' && activeSubject ? activeSubject.name : 'All My Subjects'}
            </h1>
            <p className="text-xs md:text-sm text-slate-300 max-w-2xl leading-relaxed">
              Hybrid dense-vector and keyword retrieval strictly isolated to your authenticated account and chosen subject scope.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {onNavigate && (
              <>
                <button
                  onClick={() => onNavigate('documents')}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/20 text-white transition border border-white/10 flex items-center space-x-1.5"
                >
                  <FileText className="w-3.5 h-3.5 text-indigo-300" />
                  <span>Subject Docs</span>
                </button>
                <button
                  onClick={() => onNavigate('questions')}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/20 text-white transition border border-white/10 flex items-center space-x-1.5"
                >
                  <BookMarked className="w-3.5 h-3.5 text-indigo-300" />
                  <span>Question Bank</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Search Controls Toolbar Card */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-5">
        {/* Scope and Mode Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          {/* Scope Selector */}
          <div className="flex items-center space-x-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 mr-1 flex items-center">
              <Layers className="w-3.5 h-3.5 mr-1 text-slate-500" />
              Scope:
            </span>
            <div className="inline-flex rounded-xl bg-slate-100 p-1 border border-slate-200">
              <button
                type="button"
                onClick={() => handleScopeChange('CURRENT')}
                disabled={!activeSubject}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  searchScope === 'CURRENT'
                    ? 'bg-white text-indigo-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 disabled:opacity-40'
                }`}
              >
                {activeSubject ? activeSubject.name : 'Current Subject'}
              </button>
              <button
                type="button"
                onClick={() => handleScopeChange('ALL')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  searchScope === 'ALL'
                    ? 'bg-white text-indigo-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All My Subjects
              </button>
            </div>
          </div>

          {/* Algorithm Mode Selector */}
          <div className="flex items-center space-x-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 mr-1 flex items-center">
              <Filter className="w-3.5 h-3.5 mr-1 text-slate-500" />
              Mode:
            </span>
            <div className="inline-flex rounded-xl bg-slate-100 p-1 border border-slate-200">
              <button
                type="button"
                onClick={() => handleModeChange('HYBRID')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center space-x-1 ${
                  searchMode === 'HYBRID'
                    ? 'bg-white text-indigo-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Zap className="w-3 h-3 text-amber-500" />
                <span>Hybrid (60% Vector + 40% KW)</span>
              </button>

              <button
                type="button"
                onClick={() => handleModeChange('KEYWORD')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center space-x-1 ${
                  searchMode === 'KEYWORD'
                    ? 'bg-white text-indigo-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Hash className="w-3 h-3 text-indigo-500" />
                <span>Keyword Exact</span>
              </button>

              <button
                type="button"
                onClick={() => handleModeChange('SEMANTIC')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center space-x-1 ${
                  searchMode === 'SEMANTIC'
                    ? 'bg-white text-indigo-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Cpu className="w-3 h-3 text-purple-500" />
                <span>Dense Semantic</span>
              </button>
            </div>
          </div>
        </div>

        {/* Search Input Box */}
        <form onSubmit={(e) => handleSearch(e)} className="space-y-3">
          <div className="relative">
            <Search className="w-5 h-5 text-indigo-600 absolute left-4 top-3.5" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={`Search ${searchScope === 'CURRENT' && activeSubject ? activeSubject.name : 'all your study documents'} (e.g. quantum RSA, scheduling algorithms, ACID transactions)...`}
              className="w-full pl-12 pr-36 py-3.5 bg-slate-50 border border-slate-300 rounded-2xl text-xs md:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-xs"
            />
            <button
              type="submit"
              disabled={loading || !query.trim()}
              className="absolute right-2.5 top-2 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-md shadow-indigo-600/20 transition disabled:opacity-50 flex items-center space-x-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>{loading ? 'Retrieving...' : 'Search'}</span>
            </button>
          </div>

          {/* Suggested Queries */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <span className="text-[11px] font-bold text-slate-400 mr-1 flex items-center">
              <Sparkles className="w-3 h-3 mr-1 text-indigo-500" />
              Suggested queries:
            </span>
            {sampleQueries.map((sq, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  setQuery(sq);
                  handleSearch(undefined, sq);
                }}
                className="text-[11px] font-medium bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-600 px-2.5 py-1 rounded-lg border border-slate-200 transition"
              >
                &ldquo;{sq}&rdquo;
              </button>
            ))}
          </div>
        </form>
      </div>

      {/* Results Header Status */}
      {searchResponse && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs text-slate-600 border-b border-slate-200 pb-3 gap-2">
          <div className="flex items-center space-x-2">
            <span>
              Found <strong>{searchResponse.total_results}</strong> results for &ldquo;{searchResponse.query}&rdquo;
            </span>
            <span className="text-slate-300">&bull;</span>
            <span className="font-semibold text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-200">
              Scope: {searchResponse.subject_name || (searchScope === 'CURRENT' && activeSubject ? activeSubject.name : 'All Subjects')}
            </span>
            <span className="font-semibold text-slate-700 bg-slate-100 px-2.5 py-0.5 rounded-full border border-slate-200">
              Algorithm: {searchResponse.search_mode}
            </span>
          </div>
          <span className="text-[11px] text-slate-400">
            Backend Filtered &bull; Zero Cross-User Leakage Guaranteed
          </span>
        </div>
      )}

      {/* Results List */}
      <div className="space-y-4">
        {results.length > 0 ? (
          results.map((res, idx) => (
            <div
              key={idx}
              className="bg-white rounded-3xl border border-slate-200 p-5 md:p-6 shadow-xs hover:border-indigo-300 transition-all space-y-3.5"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center space-x-3">
                  <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl border border-indigo-100">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">{res.document_name}</h4>
                    <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500 mt-0.5">
                      <span className="font-mono font-bold text-indigo-900 bg-indigo-50/80 px-2 py-0.2 rounded border border-indigo-100">
                        Page {res.page_number}
                      </span>
                      <span>&bull;</span>
                      <span className="font-medium text-slate-600">Category: {res.doc_category}</span>
                      {res.subject_name && (
                        <>
                          <span>&bull;</span>
                          <span className="font-semibold text-slate-700 bg-slate-100 px-2 py-0.2 rounded">
                            {res.subject_name}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2 self-start sm:self-auto">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-bold ${
                      res.relevance_label === 'Highly Relevant'
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-300'
                        : res.relevance_label === 'Relevant'
                        ? 'bg-indigo-50 text-indigo-800 border border-indigo-300'
                        : 'bg-amber-50 text-amber-800 border border-amber-300'
                    }`}
                  >
                    {res.relevance_label}
                  </span>
                  <span className="text-xs font-mono font-bold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-xl border border-indigo-200">
                    {(res.similarity_score * 100).toFixed(0)}% Score
                  </span>
                </div>
              </div>

              {/* Document Snippet */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 text-xs text-slate-700 font-sans leading-relaxed">
                &ldquo;{res.snippet}&rdquo;
              </div>

              {/* Matched Terms & Actions Footer */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1 border-t border-slate-100">
                <div className="flex flex-wrap items-center gap-1.5">
                  {res.matched_terms && res.matched_terms.length > 0 && (
                    <>
                      <span className="text-[11px] font-bold text-slate-400">Matched Tokens:</span>
                      {res.matched_terms.map((term, tIdx) => (
                        <span
                          key={tIdx}
                          className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-indigo-50 text-indigo-700 border border-indigo-100"
                        >
                          {term}
                        </span>
                      ))}
                    </>
                  )}
                  {res.topic && (
                    <span className="text-[11px] text-slate-400 ml-1">
                      Concept: <strong>{res.topic}</strong>
                    </span>
                  )}
                </div>

                <button
                  onClick={() => setModalData(res)}
                  className="text-xs font-bold text-indigo-600 hover:text-indigo-800 transition flex items-center space-x-1 shrink-0"
                >
                  <span>Inspect Source Document</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))
        ) : (
          !loading &&
          searchResponse && (
            <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 text-slate-500 text-xs space-y-2">
              <ShieldAlert className="w-8 h-8 text-amber-500 mx-auto" />
              <h4 className="text-sm font-bold text-slate-800">No Matching Material Found</h4>
              <p className="max-w-md mx-auto text-slate-400">
                No indexed study sections matched &ldquo;{searchResponse.query}&rdquo; in {searchResponse.subject_name}.
                Try switching to <strong>Hybrid Mode</strong>, searching <strong>All My Subjects</strong>, or uploading additional course PDFs.
              </p>
            </div>
          )
        )}
      </div>

      {/* Source Citation Modal */}
      {modalData && (
        <SourceModal
          isOpen={!!modalData}
          onClose={() => setModalData(null)}
          documentName={modalData.document_name}
          pageNumber={modalData.page_number}
          snippet={modalData.snippet}
          similarityScore={modalData.similarity_score}
          category={modalData.doc_category}
        />
      )}
    </div>
  );
};
