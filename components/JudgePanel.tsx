import React, { useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { ChatMessage, ExecutionResult } from '../types';
import { Bot, User, Terminal, SendHorizonal } from 'lucide-react';

interface JudgePanelProps {
  messages: ChatMessage[];
  executionResult: ExecutionResult | null;
  onSendMessage: (text: string) => void;
  isChatLoading: boolean;
}

const JudgePanel: React.FC<JudgePanelProps> = ({ 
  messages, executionResult, onSendMessage, isChatLoading 
}) => {
  const [inputValue, setInputValue] = React.useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, executionResult]);

  const handleSend = () => {
    if (!inputValue.trim() || isChatLoading) return;
    onSendMessage(inputValue);
    setInputValue('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="h-full flex flex-col bg-slate-900 overflow-hidden">
      {/* Tab/Header area */}
      <div className="h-12 border-b border-slate-800 flex items-center px-4 bg-slate-900">
        <h3 className="font-semibold text-slate-200 flex items-center gap-2">
          <Bot size={18} className="text-emerald-500" />
          Judge & Console
        </h3>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
        {/* Execution Result Area (Always visible if exists) */}
        {executionResult && (
          <div className="mb-6 rounded-lg overflow-hidden border border-slate-700 bg-slate-950 shadow-lg">
            <div className="bg-slate-800 px-3 py-1.5 flex items-center gap-2 border-b border-slate-700">
              <Terminal size={14} className="text-slate-400" />
              <span className="text-xs font-mono text-slate-300">Terminal Output</span>
            </div>
            <div className="p-3 font-mono text-sm whitespace-pre-wrap">
              {executionResult.error ? (
                 <span className="text-rose-400">{executionResult.error}</span>
              ) : (
                 <span className="text-slate-300">{executionResult.output || <span className="text-slate-600 italic">No output</span>}</span>
              )}
            </div>
          </div>
        )}

        {/* Chat Messages */}
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
              msg.role === 'user' ? 'bg-indigo-600' : 'bg-emerald-600'
            }`}>
              {msg.role === 'user' ? <User size={16} /> : <Bot size={16} />}
            </div>
            <div className={`max-w-[85%] rounded-lg p-3 text-sm leading-relaxed ${
              msg.role === 'user' 
                ? 'bg-indigo-900/40 text-slate-100 border border-indigo-500/30' 
                : 'bg-slate-800 text-slate-200 border border-slate-700'
            }`}>
              {msg.role === 'model' ? (
                <div className="prose prose-invert prose-sm max-w-none">
                  <ReactMarkdown>{msg.text}</ReactMarkdown>
                </div>
              ) : (
                msg.text
              )}
            </div>
          </div>
        ))}
        
        {isChatLoading && (
            <div className="flex gap-3">
                 <div className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center flex-shrink-0">
                    <Bot size={16} />
                 </div>
                 <div className="bg-slate-800 rounded-lg p-3 border border-slate-700">
                    <div className="flex gap-1 h-5 items-center">
                        <div className="w-2 h-2 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '0ms'}}></div>
                        <div className="w-2 h-2 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '150ms'}}></div>
                        <div className="w-2 h-2 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '300ms'}}></div>
                    </div>
                 </div>
            </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 bg-slate-900 border-t border-slate-800">
        <div className="relative">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask the Judge about your code..."
            disabled={isChatLoading}
            className="w-full bg-slate-800 text-slate-200 border border-slate-700 rounded-lg pl-4 pr-12 py-3 text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all disabled:opacity-50"
          />
          <button 
            onClick={handleSend}
            disabled={!inputValue.trim() || isChatLoading}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md disabled:opacity-0 transition-all"
          >
            <SendHorizonal size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default JudgePanel;