import React, { useEffect, useRef } from 'react';
import { Play } from 'lucide-react';

interface MonacoEditorProps {
  code: string;
  onChange: (code: string) => void;
  onRun: () => void;
  isRunning: boolean;
}

declare global {
  interface Window {
    require: any;
    monaco: any;
  }
}

const MonacoEditor: React.FC<MonacoEditorProps> = ({ 
  code, onChange, onRun, isRunning 
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<any>(null);
  const codeRef = useRef<string>(code);

  useEffect(() => {
    codeRef.current = code;
  }, [code]);

  useEffect(() => {
    if (!containerRef.current) return;

    const loadMonaco = () => {
      if (window.require && window.monaco) {
        // Monaco already loaded
        createEditor();
      } else if (window.require) {
        // RequireJS available, load Monaco
        window.require.config({ paths: { vs: 'https://cdn.jsdelivr.net/npm/monaco-editor@latest/min/vs' } });
        window.require(['vs/editor/editor.main'], () => {
          createEditor();
        });
      } else {
        // Wait for loader script
        const checkInterval = setInterval(() => {
          if (window.require) {
            clearInterval(checkInterval);
            window.require.config({ paths: { vs: 'https://cdn.jsdelivr.net/npm/monaco-editor@latest/min/vs' } });
            window.require(['vs/editor/editor.main'], () => {
              createEditor();
            });
          }
        }, 100);

        return () => clearInterval(checkInterval);
      }
    };

    const createEditor = () => {
      if (containerRef.current && !editorRef.current && window.monaco) {
        const currentCode = codeRef.current;
        console.log('[MonacoEditor] Creating Monaco editor instance, code length:', currentCode.length);
        editorRef.current = window.monaco.editor.create(containerRef.current, {
          value: currentCode,
          language: 'python',
          theme: 'vs-dark',
          automaticLayout: true,
          minimap: { enabled: false },
          fontSize: 14,
          lineNumbers: 'on',
          scrollBeyondLastLine: false,
          wordWrap: 'on',
        });

        console.log('[MonacoEditor] Monaco editor created successfully');
        
        editorRef.current.onDidChangeModelContent(() => {
          const value = editorRef.current.getValue();
          console.log('[MonacoEditor] Code changed, length:', value.length);
          onChange(value);
        });
      }
    };

    const cleanup = loadMonaco();

    return () => {
      if (cleanup) cleanup();
      if (editorRef.current) {
        editorRef.current.dispose();
        editorRef.current = null;
      }
    };
  }, [onChange]);

  useEffect(() => {
    if (editorRef.current) {
      const currentValue = editorRef.current.getValue();
      if (currentValue !== code) {
        console.log('[MonacoEditor] Updating code value, new length:', code.length, 'old length:', currentValue.length);
        editorRef.current.setValue(code);
      }
    } else if (code && window.monaco) {
      console.log('[MonacoEditor] Editor not yet created but code is available, will be set on creation');
    }
  }, [code]);

  return (
    <div className="h-full flex flex-col bg-[#1e1e1e] border-r border-slate-800">
      {/* Toolbar */}
      <div className="h-12 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-4 flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="text-xs font-mono text-slate-400 bg-slate-800 px-2 py-1 rounded">Python 3.11</div>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={onRun}
            disabled={isRunning}
            className="flex items-center gap-1.5 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-slate-200 text-sm font-medium px-3 py-1.5 rounded transition-all"
          >
            <Play size={14} fill="currentColor" />
            {isRunning ? 'Running...' : 'Run Code'}
          </button>
        </div>
      </div>

      {/* Editor Area */}
      <div className="flex-1 relative overflow-hidden" ref={containerRef} />
    </div>
  );
};

export default MonacoEditor;

