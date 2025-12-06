import React, { useState } from 'react';
import { Hint } from '../types';
import { ChevronUp, ChevronDown, Lightbulb, Loader2 } from 'lucide-react';

interface HintBarProps {
  hints: Hint[];
  isLoadingHint: boolean;
  canRequestHint: boolean;
  onRequestHint: () => void;
}

interface HintItemProps {
  hint: Hint;
  index: number;
  totalHints: number;
}

const HintItem: React.FC<HintItemProps> = ({ hint, index, totalHints }) => {
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <div className="bg-gray-100 dark:bg-slate-800/50 rounded-lg border border-gray-200 dark:border-slate-700 overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-3 py-2 flex items-center justify-between hover:bg-gray-200 dark:hover:bg-slate-800/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <div className="flex-shrink-0 w-6 h-6 rounded-full bg-amber-500/20 dark:bg-amber-500/20 flex items-center justify-center">
            <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">
              {totalHints - index}
            </span>
          </div>
          <span className="text-xs text-gray-600 dark:text-slate-400">
            Hint {totalHints - index}
          </span>
        </div>
        {isExpanded ? (
          <ChevronDown size={14} className="text-gray-500 dark:text-slate-400" />
        ) : (
          <ChevronUp size={14} className="text-gray-500 dark:text-slate-400" />
        )}
      </button>
      {isExpanded && (
        <div className="px-3 pb-3">
          <p className="text-sm text-gray-900 dark:text-slate-200 leading-relaxed whitespace-pre-wrap">
            {hint.text}
          </p>
        </div>
      )}
    </div>
  );
};

const HintBar: React.FC<HintBarProps> = ({ hints, isLoadingHint, canRequestHint, onRequestHint }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  if (hints.length === 0 && !isLoadingHint && !canRequestHint) {
    return null;
  }

  // Reverse hints to show newest first
  const reversedHints = [...hints].reverse();

  return (
    <div className="border-t border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 flex-shrink-0">
      {/* Header - Always visible */}
      <div className="w-full px-4 py-3 flex items-center justify-between">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex-1 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors -ml-4 -mr-4 px-4 py-1 rounded"
        >
          <div className="flex items-center gap-2">
            <Lightbulb size={18} className="text-amber-500 dark:text-amber-500" />
            <span className="text-sm font-semibold text-gray-900 dark:text-slate-200">
              Hints {hints.length > 0 && `(${hints.length})`}
            </span>
            {isLoadingHint && (
              <Loader2 size={14} className="text-gray-500 dark:text-slate-400 animate-spin" />
            )}
          </div>
          {isExpanded ? (
            <ChevronDown size={18} className="text-gray-500 dark:text-slate-400" />
          ) : (
            <ChevronUp size={18} className="text-gray-500 dark:text-slate-400" />
          )}
        </button>
        {canRequestHint && !isLoadingHint && (
          <button
            onClick={onRequestHint}
            className="ml-2 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-medium rounded transition-colors"
          >
            Get Hint
          </button>
        )}
      </div>

      {/* Content - Expandable */}
      {isExpanded && (
        <div className="px-4 pb-4 max-h-64 overflow-y-auto custom-scrollbar">
          <div className="space-y-2">
            {isLoadingHint && (
              <div className="bg-gray-100 dark:bg-slate-800/50 rounded-lg p-3 border border-gray-200 dark:border-slate-700">
                <div className="flex items-center gap-2">
                  <Loader2 size={16} className="text-amber-500 dark:text-amber-500 animate-spin" />
                  <span className="text-sm text-gray-600 dark:text-slate-400">Generating hint...</span>
                </div>
              </div>
            )}
            {reversedHints.map((hint, index) => (
              <HintItem
                key={hint.timestamp}
                hint={hint}
                index={index}
                totalHints={hints.length}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default HintBar;

