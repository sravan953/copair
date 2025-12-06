import React from 'react';
import ReactMarkdown from 'react-markdown';
import { Problem } from '../types';
import { RefreshCw } from 'lucide-react';

interface ProblemPanelProps {
  problem: Problem | null;
  loading: boolean;
  onGenerateNew: () => void;
}

const ProblemPanel: React.FC<ProblemPanelProps> = ({ problem, loading, onGenerateNew }) => {
  if (loading) {
    return (
      <div className="h-full flex items-center justify-center p-6 text-slate-400">
        <div className="flex flex-col items-center gap-2">
          <div className="w-8 h-8 border-4 border-slate-600 border-t-emerald-500 rounded-full animate-spin" />
          <p>Generating Challenge...</p>
        </div>
      </div>
    );
  }

  if (!problem) {
    return (
      <div className="h-full flex items-center justify-center p-6 text-slate-400">
        <button 
          onClick={onGenerateNew}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-md transition-colors"
        >
          <RefreshCw size={18} />
          Load Problem
        </button>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-slate-900 border-r border-slate-800 overflow-hidden">
      <div className="p-4 border-b border-slate-800 flex justify-between items-start">
        <div>
            <h2 className="text-xl font-bold text-slate-100 mb-1">{problem.id}. {problem.title}</h2>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
            problem.difficulty === 'Easy' ? 'bg-emerald-900 text-emerald-300' :
            problem.difficulty === 'Medium' ? 'bg-amber-900 text-amber-300' :
            'bg-rose-900 text-rose-300'
            }`}>
            {problem.difficulty}
            </span>
        </div>
        <button 
          onClick={onGenerateNew}
          className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-full transition-all"
          title="New Problem"
        >
          <RefreshCw size={18} />
        </button>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
        <div className="prose prose-invert prose-sm max-w-none">
          <ReactMarkdown>{problem.description}</ReactMarkdown>
        </div>

        <div className="space-y-4">
          {(problem.examples || []).map((ex, idx) => (
            <div key={idx} className="bg-slate-800/50 rounded-lg p-3 border border-slate-800">
              <p className="text-sm font-semibold text-slate-300 mb-2">Example {idx + 1}:</p>
              <div className="space-y-1 font-mono text-sm">
                <p><span className="text-slate-500">Input:</span> <span className="text-slate-200">{ex.input}</span></p>
                <p><span className="text-slate-500">Output:</span> <span className="text-slate-200">{ex.output}</span></p>
                {ex.explanation && <p className="text-slate-400 text-xs mt-1 italic">// {ex.explanation}</p>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ProblemPanel;