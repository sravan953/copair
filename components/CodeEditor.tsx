import React, { useState, useEffect, useRef } from 'react';
import { Play, Send } from 'lucide-react';

interface CodeEditorProps {
  code: string;
  onChange: (code: string) => void;
  onRun: () => void;
  onSubmit: () => void;
  isRunning: boolean;
  isSubmitting: boolean;
}

const CodeEditor: React.FC<CodeEditorProps> = ({ 
  code, onChange, onRun, onSubmit, isRunning, isSubmitting 
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [lineCount, setLineCount] = useState(1);

  useEffect(() => {
    const lines = code.split('\n').length;
    setLineCount(Math.max(lines, 1));
  }, [code]);

  // Synchronize scroll between line numbers and textarea
  const handleScroll = () => {
    const lineNum = document.getElementById('line-numbers');
    if (lineNum && textareaRef.current) {
      lineNum.scrollTop = textareaRef.current.scrollTop;
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const start = e.currentTarget.selectionStart;
      const end = e.currentTarget.selectionEnd;
      
      const newValue = code.substring(0, start) + "    " + code.substring(end);
      onChange(newValue);
      
      // Need to defer setting selection range to after render
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.selectionStart = textareaRef.current.selectionEnd = start + 4;
        }
      }, 0);
    }
  };

  return (
    <div className="h-full flex flex-col bg-[#1e1e1e] border-r border-slate-800">
      {/* Toolbar */}
      <div className="h-12 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
            <div className="text-xs font-mono text-slate-400 bg-slate-800 px-2 py-1 rounded">Python 3.11</div>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={onRun}
            disabled={isRunning || isSubmitting}
            className="flex items-center gap-1.5 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-slate-200 text-sm font-medium px-3 py-1.5 rounded transition-all"
          >
            <Play size={14} fill="currentColor" />
            {isRunning ? 'Running...' : 'Run Code'}
          </button>
          <button 
            onClick={onSubmit}
            disabled={isRunning || isSubmitting}
            className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm font-medium px-3 py-1.5 rounded transition-all"
          >
            <Send size={14} />
            {isSubmitting ? 'Judging...' : 'Submit'}
          </button>
        </div>
      </div>

      {/* Editor Area */}
      <div className="flex-1 relative flex overflow-hidden">
        {/* Line Numbers */}
        <div 
          id="line-numbers"
          className="w-12 bg-[#1e1e1e] text-slate-600 text-right pr-3 pt-4 font-mono text-sm leading-6 select-none border-r border-slate-800 overflow-hidden"
          style={{ minWidth: '3rem' }}
        >
          {Array.from({ length: lineCount }).map((_, i) => (
            <div key={i}>{i + 1}</div>
          ))}
        </div>

        {/* Text Area */}
        <textarea
          ref={textareaRef}
          value={code}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onScroll={handleScroll}
          spellCheck={false}
          className="flex-1 bg-[#1e1e1e] text-slate-200 p-4 pt-4 font-mono text-sm leading-6 resize-none outline-none border-none custom-scrollbar whitespace-pre"
          style={{ tabSize: 4 }}
        />
      </div>
    </div>
  );
};

export default CodeEditor;