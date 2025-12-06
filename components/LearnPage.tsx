import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { LearningQuestion } from '../types';
import MonacoEditor from './MonacoEditor';
import { runPythonCode, initPyodide } from '../services/pyodideService';
import { ExecutionResult } from '../types';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface LearnPageProps {
  questions: LearningQuestion[];
  onBack: () => void;
  isLoading?: boolean;
}

const LOADING_MESSAGES = [
  "Brewing the perfect coding challenge... ☕",
  "Teaching AI to be a better teacher... 🎓",
  "Crafting questions that make you think... 🤔",
  "Summoning Python wisdom from the cloud... ☁️",
  "Preparing your personalized learning path... 🗺️",
  "Generating questions that will make you go 'Aha!'... 💡",
  "Assembling the perfect practice problems... 🧩",
  "Consulting the coding oracle... 🔮",
  "Creating questions tailored just for you... ✂️",
  "Loading up on algorithmic goodness... 🚀"
] as const;

const LearnPage: React.FC<LearnPageProps> = ({ questions, onBack, isLoading = false }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [code, setCode] = useState('');
  const [executionResult, setExecutionResult] = useState<ExecutionResult | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [loadingMessageIndex, setLoadingMessageIndex] = useState(0);

  // Only log when props actually change, not on every render
  useEffect(() => {
    console.log('[LearnPage] Component mounted or props changed');
    console.log('[LearnPage]   isLoading:', isLoading);
    console.log('[LearnPage]   questionsCount:', questions.length);
    if (questions.length > 0) {
      console.log('[LearnPage]   questions topics:', questions.map(q => q.topic).join(', '));
    }
  }, [isLoading, questions.length]);

  useEffect(() => {
    if (isLoading) {
      console.log('[LearnPage] Loading started, setting up message rotation');
      const interval = setInterval(() => {
        setLoadingMessageIndex((prev) => (prev + 1) % LOADING_MESSAGES.length);
      }, 2000);
      return () => {
        console.log('[LearnPage] Cleaning up loading message interval');
        clearInterval(interval);
      };
    } else {
      // Reset message index when loading stops
      setLoadingMessageIndex(0);
    }
  }, [isLoading]);

  const currentQuestion = questions[currentIndex];

  // Removed this useEffect as it was causing excessive logging
  // The main props change logging is handled above

  useEffect(() => {
    if (currentQuestion) {
      console.log('[LearnPage] Current question changed');
      console.log('[LearnPage]   Index:', currentIndex);
      console.log('[LearnPage]   Topic:', currentQuestion.topic);
      console.log('[LearnPage]   Question:', currentQuestion.question);
      console.log('[LearnPage]   Starter code length:', currentQuestion.starterCode.length);
      setCode(currentQuestion.starterCode);
      setExecutionResult(null);
    }
  }, [currentQuestion, currentIndex]);

  useEffect(() => {
    console.log('[LearnPage] Initializing Pyodide');
    initPyodide().then(() => {
      console.log('[LearnPage] Pyodide initialized');
    }).catch((err) => {
      console.error('[LearnPage] Pyodide initialization failed:', err);
    });
  }, []);

  const handleRun = async () => {
    if (!code.trim()) {
      console.warn('[LearnPage] Attempted to run empty code');
      return;
    }
    
    console.log('[LearnPage] Running code, length:', code.length);
    setIsRunning(true);
    setExecutionResult(null);
    
    try {
      const startTime = Date.now();
      const result = await runPythonCode(code);
      const duration = Date.now() - startTime;
      
      console.log('[LearnPage] Code execution completed');
      console.log('[LearnPage]   Duration:', `${duration}ms`);
      console.log('[LearnPage]   Has output:', !!result.output);
      console.log('[LearnPage]   Has error:', !!result.error);
      console.log('[LearnPage]   Output length:', result.output?.length || 0);
      
      setExecutionResult(result);
    } catch (err) {
      console.error('[LearnPage] Code execution error:', err);
      setExecutionResult({
        output: '',
        error: err instanceof Error ? err.message : 'Unknown error occurred'
      });
    } finally {
      setIsRunning(false);
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      const newIndex = currentIndex - 1;
      console.log('[LearnPage] Navigating to previous question:', newIndex);
      setCurrentIndex(newIndex);
    }
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      const newIndex = currentIndex + 1;
      console.log('[LearnPage] Navigating to next question:', newIndex);
      setCurrentIndex(newIndex);
    }
  };

  if (isLoading || questions.length === 0) {
    return (
      <div className="h-full flex flex-col bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between flex-shrink-0">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Practice Mode</h1>
            <p className="text-sm text-gray-600 mt-1">Preparing your learning experience...</p>
          </div>
          <button
            onClick={onBack}
            className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
          >
            Back to Results
          </button>
        </div>

        {/* Loading Banner */}
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center max-w-2xl px-6">
            <div className="mb-8">
              <div className="w-16 h-16 border-4 border-gray-300 border-t-gray-900 rounded-full animate-spin mx-auto mb-6"></div>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                {LOADING_MESSAGES[loadingMessageIndex]}
              </h2>
              <p className="text-gray-600">
                We're generating personalized practice questions based on your weak areas.
                This might take a moment...
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between flex-shrink-0">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Practice: {currentQuestion.topic}</h1>
          <p className="text-sm text-gray-600 mt-1">
            Question {currentIndex + 1} of {questions.length}
          </p>
        </div>
        <button
          onClick={onBack}
          className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
        >
          Back to Results
        </button>
      </div>

      {/* Main Content - 3 Columns */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Column - Question */}
        <div className="w-1/3 flex flex-col bg-slate-900 border-r border-slate-800 overflow-hidden">
          <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-slate-100 mb-2">{currentQuestion.question}</h2>
              <span className="inline-block px-3 py-1 text-xs font-medium text-slate-300 bg-slate-800 rounded-full">
                {currentQuestion.topic}
              </span>
            </div>

            <div className="prose prose-invert prose-sm max-w-none mb-6">
              <ReactMarkdown>{currentQuestion.description}</ReactMarkdown>
            </div>

            {currentQuestion.examples.length > 0 && (
              <div className="space-y-4 mb-6">
                <h3 className="text-lg font-semibold text-slate-200">Examples:</h3>
                {currentQuestion.examples.map((ex, idx) => (
                  <div key={idx} className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
                    <p className="text-sm font-semibold text-slate-300 mb-2">Example {idx + 1}:</p>
                    <div className="space-y-1 font-mono text-sm">
                      <p><span className="text-slate-500">Input:</span> <span className="text-slate-200">{ex.input}</span></p>
                      <p><span className="text-slate-500">Output:</span> <span className="text-slate-200">{ex.output}</span></p>
                      {ex.explanation && (
                        <p className="text-slate-400 text-xs mt-2">{ex.explanation}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {currentQuestion.hints && currentQuestion.hints.length > 0 && (
              <div className="mt-6">
                <h3 className="text-lg font-semibold text-slate-200 mb-3">Hints:</h3>
                <ul className="list-disc list-inside space-y-2 text-sm text-slate-300">
                  {currentQuestion.hints.map((hint, idx) => (
                    <li key={idx}>{hint}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Navigation */}
            <div className="mt-6 flex items-center justify-between pt-6 border-t border-slate-700">
              <button
                onClick={handlePrevious}
                disabled={currentIndex === 0}
                className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed text-slate-200 rounded-lg transition-colors"
              >
                <ChevronLeft size={18} />
                Previous
              </button>
              <button
                onClick={handleNext}
                disabled={currentIndex === questions.length - 1}
                className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed text-slate-200 rounded-lg transition-colors"
              >
                Next
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        </div>

        {/* Middle Column - Code Editor */}
        <div className="w-1/3 flex flex-col">
          <MonacoEditor
            code={code}
            onChange={setCode}
            onRun={handleRun}
            isRunning={isRunning}
          />
        </div>

        {/* Right Column - Output */}
        <div className="w-1/3 flex flex-col bg-slate-900 border-l border-slate-800 overflow-hidden">
          <div className="h-12 bg-slate-800 border-b border-slate-700 flex items-center px-4 flex-shrink-0">
            <h3 className="text-sm font-semibold text-slate-200">Output</h3>
          </div>
          <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
            {executionResult ? (
              <div className="space-y-2">
                {executionResult.output && (
                  <div className="bg-slate-800 rounded-lg p-3">
                    <p className="text-xs text-slate-400 mb-1">Stdout:</p>
                    <pre className="text-sm text-slate-200 font-mono whitespace-pre-wrap">
                      {executionResult.output || '(no output)'}
                    </pre>
                  </div>
                )}
                {executionResult.error && (
                  <div className="bg-red-900/30 border border-red-800 rounded-lg p-3">
                    <p className="text-xs text-red-400 mb-1">Stderr:</p>
                    <pre className="text-sm text-red-300 font-mono whitespace-pre-wrap">
                      {executionResult.error}
                    </pre>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-slate-500">
                <p className="text-sm">Run your code to see output here</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LearnPage;

