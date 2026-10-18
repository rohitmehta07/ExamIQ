import React from 'react';

interface Props {
  priority: 'HIGH' | 'MEDIUM' | 'LOW' | string;
  className?: string;
}

export const PriorityBadge: React.FC<Props> = ({ priority, className = '' }) => {
  const p = priority.toUpperCase();
  if (p === 'HIGH') {
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200 ${className}`}>
        <span className="w-1.5 h-1.5 rounded-full bg-rose-500 mr-1.5 animate-pulse"></span>
        High Priority
      </span>
    );
  } else if (p === 'MEDIUM') {
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 ${className}`}>
        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mr-1.5"></span>
        Medium Priority
      </span>
    );
  }
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 ${className}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5"></span>
      Low Priority
    </span>
  );
};
