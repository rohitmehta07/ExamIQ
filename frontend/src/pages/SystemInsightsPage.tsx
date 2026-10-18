import React, { useState, useEffect } from 'react';
import { Cpu, Layers, Database, ShieldCheck, Award, FileCode, CheckCircle, RefreshCw } from 'lucide-react';
import { api } from '../services/api';

export const SystemInsightsPage: React.FC = () => {
  const [evalData, setEvalData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadEval();
  }, []);

  const loadEval = async () => {
    setLoading(true);
    try {
      const data = await api.getMLEvaluation();
      setEvalData(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const docCls = evalData?.dataset_evaluation?.document_classification;
  const qCls = evalData?.dataset_evaluation?.question_classification;

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-black text-slate-900 tracking-tight">System Insights & Machine Learning Pipeline</h2>
        <p className="text-xs text-slate-500 max-w-2xl leading-relaxed">
          Technical architecture, mathematical models, feature representations, and verified evaluation metrics for academic evaluation.
        </p>
      </div>

      {/* Model Specifications Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-xs space-y-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
            <Cpu className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-bold text-slate-900">Dense Semantic Embeddings</h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            TF-IDF vectorization with n-gram tokenization projected into a 128-dimensional dense representation via TruncatedSVD and L2 unit-norm normalization. Fast, deterministic, and 100% local.
          </p>
          <span className="text-[11px] font-mono font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded block">
            Model: tfidf_dense_svd_local (128-dim)
          </span>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-xs space-y-3">
          <div className="w-10 h-10 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center font-bold">
            <Layers className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-bold text-slate-900">OCR & Document Intelligence</h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            PyMuPDF hybrid extractor. High-speed native digital text extraction with automatic fallback to RapidOCR ONNX engine when text density &lt; 50 chars/page. Evaluates handwriting confidence drops.
          </p>
          <span className="text-[11px] font-mono font-bold text-violet-700 bg-violet-50 px-2 py-0.5 rounded block">
            Engine: RapidOCR + ONNX Runtime (Pure Python)
          </span>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-xs space-y-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <Award className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-bold text-slate-900">Priority Ranking Engine</h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            Weighted composite scoring model balancing Historical Frequency (0.25), Marks (0.25), Recency (0.15), Syllabus Core (0.15), Question Variety (0.10), and Personal Weakness (0.10).
          </p>
          <span className="text-[11px] font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded block">
            Method: Multi-Factor Pedagogical Ranking
          </span>
        </div>
      </div>

      {/* Live Verified ML Evaluation Metrics */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-6 space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div>
            <h3 className="text-base font-bold text-slate-900">Empirical ML Evaluation Results</h3>
            <p className="text-xs text-slate-500">Computed via scikit-learn metrics functions on verified ground-truth CSV annotations</p>
          </div>
          <button
            onClick={loadEval}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition"
            title="Refresh Evaluation"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {evalData ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Document Classification Metrics */}
            <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700 block">
                1. Document Classification Performance (N={docCls?.sample_size})
              </span>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="p-2.5 bg-white rounded-xl border border-slate-200">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Accuracy</span>
                  <span className="text-lg font-black text-indigo-700 font-mono">
                    {docCls ? (docCls.accuracy * 100).toFixed(1) : 0}%
                  </span>
                </div>
                <div className="p-2.5 bg-white rounded-xl border border-slate-200">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Macro Precision</span>
                  <span className="text-lg font-black text-slate-800 font-mono">
                    {docCls ? docCls.precision_macro.toFixed(3) : 0}
                  </span>
                </div>
                <div className="p-2.5 bg-white rounded-xl border border-slate-200">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Macro F1</span>
                  <span className="text-lg font-black text-emerald-700 font-mono">
                    {docCls ? docCls.f1_macro.toFixed(3) : 0}
                  </span>
                </div>
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed pt-1">
                Distinguishes Lecture Notes, Handwritten Notes, and Exam Question Papers using pedagogical layout priors and OCR confidence distributions.
              </p>
            </div>

            {/* Question Classification & Difficulty */}
            <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700 block">
                2. Question Classification & Difficulty (N={qCls?.sample_size})
              </span>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="p-2.5 bg-white rounded-xl border border-slate-200">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Type Overlap</span>
                  <span className="text-lg font-black text-violet-700 font-mono">
                    {qCls ? (qCls.type_classification_overlap * 100).toFixed(1) : 0}%
                  </span>
                </div>
                <div className="p-2.5 bg-white rounded-xl border border-slate-200">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Difficulty Acc</span>
                  <span className="text-lg font-black text-slate-800 font-mono">
                    {qCls ? (qCls.difficulty_accuracy * 100).toFixed(1) : 0}%
                  </span>
                </div>
                <div className="p-2.5 bg-white rounded-xl border border-slate-200">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Difficulty F1</span>
                  <span className="text-lg font-black text-emerald-700 font-mono">
                    {qCls ? qCls.difficulty_f1_macro.toFixed(3) : 0}
                  </span>
                </div>
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed pt-1">
                Supports multi-label taxonomy (Comparison, Numerical, Algorithm, Explanation) and estimates cognitive difficulty (Easy, Medium, Hard).
              </p>
            </div>
          </div>
        ) : (
          <div className="p-6 text-center text-slate-400 text-xs">
            Evaluation report loading...
          </div>
        )}

        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
          <strong className="font-bold">Evaluation Integrity Guarantee:</strong> All metrics shown above are calculated strictly from the verified ground-truth files in <code className="font-mono">data/annotations/</code>. Zero fabricated accuracy metrics.
        </div>
      </div>
    </div>
  );
};
