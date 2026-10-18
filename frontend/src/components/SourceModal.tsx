import React from 'react';
import { X, FileText, ExternalLink, Bookmark } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  documentName: string;
  pageNumber: number;
  snippet: string;
  similarityScore?: number;
  category?: string;
}

export const SourceModal: React.FC<Props> = ({
  isOpen,
  onClose,
  documentName,
  pageNumber,
  snippet,
  similarityScore,
  category = 'LECTURE_NOTES'
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-50 border-b border-slate-200">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800">{documentName}</h3>
              <p className="text-xs text-slate-500">
                Source Document &bull; Page {pageNumber} &bull; Category: {category}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          {similarityScore !== undefined && (
            <div className="flex items-center justify-between p-3 bg-indigo-50/70 border border-indigo-100 rounded-xl">
              <span className="text-xs font-semibold text-indigo-800 flex items-center">
                <Bookmark className="w-4 h-4 mr-1.5 text-indigo-600" />
                Verified Academic Evidence Match
              </span>
              <span className="text-xs font-mono font-bold bg-white px-2.5 py-1 rounded-md text-indigo-700 shadow-sm border border-indigo-200">
                Similarity: {(similarityScore * 100).toFixed(1)}%
              </span>
            </div>
          )}

          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-1.5">
              Extracted Academic Snippet (Page {pageNumber})
            </label>
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 text-sm leading-relaxed whitespace-pre-wrap font-sans">
              {snippet}
            </div>
          </div>

          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-start space-x-2">
            <span className="font-bold">Provenance Note:</span>
            <span>
              This excerpt is extracted directly from the uploaded university material. Source citations preserve traceability to lecture slides and question papers.
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end px-6 py-3 bg-slate-50 border-t border-slate-200">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-medium rounded-lg transition-colors"
          >
            Close Source Inspector
          </button>
        </div>
      </div>
    </div>
  );
};
