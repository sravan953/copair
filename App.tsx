import React, { useState, useEffect } from 'react';
import ProblemPanel from './components/ProblemPanel';
import CodeEditor from './components/CodeEditor';
import JudgePanel from './components/JudgePanel';
import { Problem, ChatMessage, ExecutionResult } from './types';
import { generateProblem, judgeSubmission, chatWithJudge } from './services/geminiService';
import { initPyodide, runPythonCode } from './services/pyodideService';
import { Code2 } from 'lucide-react';

const App: React.FC = () => {
  const [problem, setProblem] = useState<Problem | null>(null);
  const [code, setCode] = useState<string>('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [executionResult, setExecutionResult] = useState<ExecutionResult | null>(null);
  
  const [isProblemLoading, setIsProblemLoading] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isChatLoading, setIsChatLoading] = useState(false);

  // Initialize
  useEffect(() => {
    const init = async () => {
        // Start loading Pyodide in background
        initPyodide(); 
        
        // Load initial problem
        await loadNewProblem();
    };
    init();
  }, []);

  const loadNewProblem = async () => {
    setIsProblemLoading(true);
    setExecutionResult(null);
    setMessages([{
        role: 'model',
        text: 'Welcome! I am the AI Judge. I have generated a problem for you. Read the description on the left, write your solution in the middle, and click "Submit" when you are ready for me to review it.',
        timestamp: Date.now()
    }]);
    
    try {
      const newProblem = await generateProblem();
      setProblem(newProblem);
      setCode(newProblem.starterCode || '');
    } catch (e) {
      console.error(e);
    } finally {
      setIsProblemLoading(false);
    }
  };

  const handleRunCode = async () => {
    setIsRunning(true);
    setExecutionResult(null); // Clear previous
    try {
      const result = await runPythonCode(code);
      setExecutionResult(result);
    } finally {
      setIsRunning(false);
    }
  };

  const handleSubmit = async () => {
    if (!problem) return;
    
    setIsSubmitting(true);
    // 1. Run the code first to get output for the judge
    const result = await runPythonCode(code);
    setExecutionResult(result);

    // 2. Add user "action" to chat log visually (optional, or just show the judge response)
    const userSubmissionMsg: ChatMessage = {
        role: 'user',
        text: "I've submitted my solution. Please review it.",
        timestamp: Date.now()
    };
    setMessages(prev => [...prev, userSubmissionMsg]);
    setIsChatLoading(true);

    // 3. Send to Gemini Judge
    try {
        const judgment = await judgeSubmission(problem, code, result.output, result.error);
        
        const judgeMsg: ChatMessage = {
            role: 'model',
            text: judgment,
            timestamp: Date.now()
        };
        setMessages(prev => [...prev, judgeMsg]);
    } catch (e) {
        console.error(e);
    } finally {
        setIsSubmitting(false);
        setIsChatLoading(false);
    }
  };

  const handleSendMessage = async (text: string) => {
      const newMsg: ChatMessage = { role: 'user', text, timestamp: Date.now() };
      setMessages(prev => [...prev, newMsg]);
      setIsChatLoading(true);

      try {
          // Construct history for Gemini chat
          const history = messages.map(m => ({
              role: m.role,
              parts: [{ text: m.text }]
          }));
          history.push({ role: 'user', parts: [{ text }]});

          // If we have context about the current code, prepend it strictly to the last message context internally or rely on history
          // But `chatWithJudge` service uses `sendMessage`, so we rely on conversation flow.
          // To give context about current code state if the user asks "what's wrong with line 5", 
          // we might ideally send the code as a hidden system context update, but for simplicity here we just chat.
          
          const responseText = await chatWithJudge(messages.map(m => ({ role: m.role, parts: [{ text: m.text }] })), text);
          
          const responseMsg: ChatMessage = {
              role: 'model',
              text: responseText,
              timestamp: Date.now()
          };
          setMessages(prev => [...prev, responseMsg]);
      } finally {
          setIsChatLoading(false);
      }
  };

  return (
    <div className="h-screen w-screen bg-slate-950 flex flex-col overflow-hidden">
      {/* Navbar */}
      <nav className="h-14 bg-slate-900 border-b border-slate-800 flex items-center px-4 justify-between flex-shrink-0">
        <div className="flex items-center gap-2">
            <div className="bg-emerald-600 p-1.5 rounded-lg">
                <Code2 size={20} className="text-white" />
            </div>
            <h1 className="text-lg font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
                CodeJudge AI
            </h1>
        </div>
        <div className="flex items-center gap-4 text-sm text-slate-400">
            <span>Powered by Gemini 2.5 & Pyodide</span>
            <a href="https://github.com" target="_blank" rel="noreferrer" className="hover:text-white transition-colors">GitHub</a>
        </div>
      </nav>

      {/* Main Grid */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
        {/* Left: Problem (3 cols) */}
        <div className="hidden lg:block lg:col-span-3 h-full overflow-hidden">
          <ProblemPanel 
            problem={problem} 
            loading={isProblemLoading} 
            onGenerateNew={loadNewProblem} 
          />
        </div>

        {/* Middle: Code Editor (5 cols) */}
        <div className="col-span-1 lg:col-span-5 h-full overflow-hidden border-r border-slate-800">
           <CodeEditor 
             code={code}
             onChange={setCode}
             onRun={handleRunCode}
             onSubmit={handleSubmit}
             isRunning={isRunning}
             isSubmitting={isSubmitting}
           />
        </div>

        {/* Right: Judge/Chat (4 cols) */}
        <div className="hidden lg:block lg:col-span-4 h-full overflow-hidden bg-slate-900">
           <JudgePanel 
             messages={messages}
             executionResult={executionResult}
             onSendMessage={handleSendMessage}
             isChatLoading={isChatLoading}
           />
        </div>
        
        {/* Mobile View Toggle (Simplified for this demo, keeping it desktop focused mainly but functional) */}
        <div className="lg:hidden col-span-1 h-full bg-slate-900 flex items-center justify-center text-slate-500 p-8 text-center">
            <p>Please use a desktop browser for the best coding experience.</p>
        </div>
      </div>
    </div>
  );
};

export default App;