import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { LearningQuestion, Hint } from '../types';
import MonacoEditor from './MonacoEditor';
import { runPythonCode, runPythonCodeWithTests, initPyodide } from '../services/pyodideService';
import { ExecutionResult } from '../types';
import { requestHint } from '../services/geminiService';
import { ChevronLeft, ChevronRight, Check, X, ChevronDown, ChevronUp } from 'lucide-react';

interface LearnPageProps {
  questions: (LearningQuestion | undefined)[];
  totalQuestions: number;
  onGenerateQuestion: (index: number) => Promise<void>;
  generatingQuestionIndex: number | null;
  onBack: () => void;
  isLoading?: boolean;
  onQuestionCompleted?: (index: number, topic: string) => void;
  onNavigateToSummary?: () => void;
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

const LearnPage: React.FC<LearnPageProps> = ({
  questions,
  totalQuestions,
  onGenerateQuestion,
  generatingQuestionIndex,
  onBack,
  isLoading = false,
  onQuestionCompleted,
  onNavigateToSummary
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [code, setCode] = useState('');
  const [executionResult, setExecutionResult] = useState<ExecutionResult | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [loadingMessageIndex, setLoadingMessageIndex] = useState(0);
  const [tryCount, setTryCount] = useState(0);
  const [hints, setHints] = useState<Hint[]>([]);
  const [isLoadingHint, setIsLoadingHint] = useState(false);
  const [hintThreshold, setHintThreshold] = useState(1);
  const [isOutputCollapsed, setIsOutputCollapsed] = useState(false);
  const [canRequestHint, setCanRequestHint] = useState(false);
  const [timerStartTime, setTimerStartTime] = useState<number | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [questionStatuses, setQuestionStatuses] = useState<Map<number, boolean>>(new Map());

  const isGeneratingCurrent = generatingQuestionIndex === currentIndex;

  // Only log when props actually change, not on every render
  useEffect(() => {
    console.log('[LearnPage] Component mounted or props changed');
    console.log('[LearnPage]   isLoading:', isLoading);
    console.log('[LearnPage]   totalQuestions:', totalQuestions);
    const definedQuestions = questions.filter(q => q !== undefined);
    console.log('[LearnPage]   definedQuestionsCount:', definedQuestions.length);
    if (definedQuestions.length > 0) {
      console.log('[LearnPage]   questions topics:', definedQuestions.map(q => q!.topic).join(', '));
    }
  }, [isLoading, totalQuestions, questions]);

  useEffect(() => {
    if (isLoading || isGeneratingCurrent) {
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
  }, [isLoading, isGeneratingCurrent]);

  const currentQuestion = questions[currentIndex];
  
  // Generate question on demand when navigating to a missing question
  useEffect(() => {
    if (!isLoading && currentQuestion === undefined && currentIndex < totalQuestions) {
      console.log('[LearnPage] Question missing at index', currentIndex, ', generating...');
      onGenerateQuestion(currentIndex);
    }
  }, [currentIndex, currentQuestion, isLoading, totalQuestions, onGenerateQuestion]);

  // Removed this useEffect as it was causing excessive logging
  // The main props change logging is handled above

  useEffect(() => {
    if (currentQuestion) {
      console.log('[LearnPage] Current question changed');
      console.log('[LearnPage]   Index:', currentIndex);
      console.log('[LearnPage]   Topic:', currentQuestion.topic);
      console.log('[LearnPage]   Description:', currentQuestion.description);
      console.log('[LearnPage]   Starter code length:', currentQuestion.starterCode.length);
      setCode(currentQuestion.starterCode);
      setExecutionResult(null);
      // Reset try count and hints when question changes
      setTryCount(0);
      setHints([]);
      setCanRequestHint(false);
      // Start timer for new question
      setTimerStartTime(Date.now());
      setElapsedSeconds(0);
      setIsTimerRunning(true);
    } else {
      // Clear code when question is not available yet
      setCode('');
      setExecutionResult(null);
      // Reset try count and hints when question is cleared
      setTryCount(0);
      setHints([]);
      setCanRequestHint(false);
      // Stop timer
      setIsTimerRunning(false);
      setTimerStartTime(null);
      setElapsedSeconds(0);
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

  // Timer update effect
  useEffect(() => {
    if (!isTimerRunning || !timerStartTime) return;

    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - timerStartTime) / 1000);
      setElapsedSeconds(elapsed);
    }, 1000);

    return () => clearInterval(interval);
  }, [isTimerRunning, timerStartTime]);

  // Format timer as mm:ss
  const formatTimer = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

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
      
      // Check if we have test cases to run
      const hasTestCases = currentQuestion?.testCases && currentQuestion.testCases.length > 0;
      
      let result: ExecutionResult;
      if (hasTestCases) {
        console.log('[LearnPage] Running code with test cases:', currentQuestion.testCases.length);
        result = await runPythonCodeWithTests(code, currentQuestion.testCases);
      } else {
        result = await runPythonCode(code);
      }
      
      const duration = Date.now() - startTime;
      
      console.log('[LearnPage] Code execution completed');
      console.log('[LearnPage]   Duration:', `${duration}ms`);
      console.log('[LearnPage]   Has output:', !!result.output);
      console.log('[LearnPage]   Has error:', !!result.error);
      console.log('[LearnPage]   Output length:', result.output?.length || 0);
      if (result.testResults) {
        console.log('[LearnPage]   Test results:', `${result.testResults.passed}/${result.testResults.total} passed`);
      }
      
      setExecutionResult(result);
      
      // Handle hint logic after test execution
      if (result.testResults && currentQuestion) {
        const allTestsPassed = result.testResults.passed === result.testResults.total;
        
        if (allTestsPassed) {
          // Reset try count and hints when all tests pass
          console.log('[LearnPage] All tests passed, resetting try count and hints');
          setTryCount(0);
          setHints([]);
          setCanRequestHint(false);
          // Stop timer when all tests pass
          setIsTimerRunning(false);

          // Track completion
          setQuestionStatuses(prev => {
            const newMap = new Map(prev);
            newMap.set(currentIndex, true);
            return newMap;
          });

          if (onQuestionCompleted && currentQuestion) {
            onQuestionCompleted(currentIndex, currentQuestion.topic);
          }
        } else {
          // Increment try count for failed attempts
          const newTryCount = tryCount + 1;
          setTryCount(newTryCount);
          console.log('[LearnPage] Tests failed, try count:', newTryCount);
          
          // Show button to request hint if threshold is met
          if (newTryCount % hintThreshold === 0) {
            console.log('[LearnPage] Hint available (try count:', newTryCount, ', threshold:', hintThreshold, ')');
            setCanRequestHint(true);
          }
        }
      }
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

  const hasQuestions = questions.some(q => q !== undefined);

  const allQuestionsCompleted = () => {
    if (questions.length < totalQuestions) return false;
    const definedQuestions = questions.filter(q => q !== undefined);
    if (definedQuestions.length < totalQuestions) return false;

    for (let i = 0; i < totalQuestions; i++) {
      if (!questionStatuses.get(i)) return false;
    }
    return true;
  };

  const isAllCompleted = allQuestionsCompleted();
  
  if (isLoading || (!hasQuestions && !isGeneratingCurrent)) {
    return (
      <div className="h-full flex flex-col bg-transparent">
        {/* Loading Banner */}
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center max-w-2xl px-6 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm rounded-xl p-8 shadow-sm">
            <div className="mb-8">
              <div className="w-16 h-16 border-4 border-gray-300 dark:border-slate-700 border-t-gray-900 dark:border-t-slate-200 rounded-full animate-spin mx-auto mb-6"></div>
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-slate-200 mb-4">
                {LOADING_MESSAGES[loadingMessageIndex]}
              </h2>
              <p className="text-gray-600 dark:text-slate-400">
                We're generating personalized practice questions based on your weak areas.
                This might take a moment...
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show loading if current question is being generated
  if (isGeneratingCurrent || !currentQuestion) {
    return (
      <div className="h-full flex flex-col bg-transparent">
        {/* Loading Banner */}
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center max-w-2xl px-6 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm rounded-xl p-8 shadow-sm">
            <div className="mb-8">
              <div className="w-16 h-16 border-4 border-gray-300 dark:border-slate-700 border-t-gray-900 dark:border-t-slate-200 rounded-full animate-spin mx-auto mb-6"></div>
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-slate-200 mb-4">
                {LOADING_MESSAGES[loadingMessageIndex]}
              </h2>
              <p className="text-gray-600 dark:text-slate-400">
                Generating question {currentIndex + 1} of {totalQuestions}...
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-transparent">
      {/* Main Content - 3 Columns */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Column - Question */}
        <div className="w-1/3 flex flex-col bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm border-r border-gray-200/50 dark:border-slate-800/50 overflow-hidden">
          <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
            <div className="mb-6">
              <p className="text-sm text-gray-500 dark:text-slate-400 mb-2">
                Question {currentIndex + 1} of {totalQuestions}
              </p>
              <span className="inline-block px-3 py-1 text-xs font-medium text-gray-700 dark:text-slate-300 bg-gray-100 dark:bg-slate-800 rounded-full mb-4">
                {currentQuestion.topic}
              </span>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-slate-200 mb-3">
                {currentQuestion.title}
              </h2>
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <ReactMarkdown>{currentQuestion.question}</ReactMarkdown>
              </div>
            </div>

            <div className="space-y-4 mb-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-200">Examples:</h3>
              
              <div className="bg-gray-50 dark:bg-slate-800/50 rounded-lg p-4 border border-gray-200 dark:border-slate-700">
                <p className="text-sm font-semibold text-gray-700 dark:text-slate-300 mb-2">Example 1:</p>
                <div className="space-y-1 font-mono text-sm">
                  <p><span className="text-gray-500 dark:text-slate-500">Input:</span> <span className="text-gray-900 dark:text-slate-200">{currentQuestion.example1.input}</span></p>
                  <p><span className="text-gray-500 dark:text-slate-500">Output:</span> <span className="text-gray-900 dark:text-slate-200">{currentQuestion.example1.output}</span></p>
                  <p className="text-gray-600 dark:text-slate-400 text-xs mt-2"><span className="text-gray-500 dark:text-slate-500">Explanation:</span> {currentQuestion.example1.outputExplanation}</p>
                </div>
              </div>

              <div className="bg-gray-50 dark:bg-slate-800/50 rounded-lg p-4 border border-gray-200 dark:border-slate-700">
                <p className="text-sm font-semibold text-gray-700 dark:text-slate-300 mb-2">Example 2:</p>
                <div className="space-y-1 font-mono text-sm">
                  <p><span className="text-gray-500 dark:text-slate-500">Input:</span> <span className="text-gray-900 dark:text-slate-200">{currentQuestion.example2.input}</span></p>
                  <p><span className="text-gray-500 dark:text-slate-500">Output:</span> <span className="text-gray-900 dark:text-slate-200">{currentQuestion.example2.output}</span></p>
                  <p className="text-gray-600 dark:text-slate-400 text-xs mt-2"><span className="text-gray-500 dark:text-slate-500">Explanation:</span> {currentQuestion.example2.outputExplanation}</p>
                </div>
              </div>
            </div>

            {/* Navigation */}
            <div className="mt-6 flex items-center justify-between pt-6 border-t border-gray-200 dark:border-slate-700">
              <button
                onClick={handlePrevious}
                disabled={currentIndex === 0}
                className="flex items-center gap-2 px-4 py-2 bg-gray-200 dark:bg-slate-800 hover:bg-gray-300 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed text-gray-900 dark:text-slate-200 rounded-lg transition-colors"
              >
                <ChevronLeft size={18} />
                Previous
              </button>
              <button
                onClick={handleNext}
                disabled={currentIndex >= totalQuestions - 1}
                className="flex items-center gap-2 px-4 py-2 bg-gray-200 dark:bg-slate-800 hover:bg-gray-300 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed text-gray-900 dark:text-slate-200 rounded-lg transition-colors"
              >
                Next
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        </div>

        {/* Middle Column - Code Editor */}
        <div className={isOutputCollapsed ? "flex-1 flex flex-col" : "w-1/3 flex flex-col"}>
          <MonacoEditor
            key={currentIndex}
            code={code}
            onChange={setCode}
            onRun={handleRun}
            isRunning={isRunning}
            hints={hints}
            isLoadingHint={isLoadingHint}
            canRequestHint={canRequestHint}
            timerDisplay={formatTimer(elapsedSeconds)}
            onRequestHint={async () => {
              if (!currentQuestion || isLoadingHint) return;
              
              setIsLoadingHint(true);
              setCanRequestHint(false);
              
              try {
                const hintText = await requestHint(
                  currentQuestion,
                  code,
                  hints,
                  executionResult?.testResults
                );
                
                const newHint: Hint = {
                  text: hintText,
                  timestamp: Date.now()
                };
                
                setHints(prev => [...prev, newHint]);
                console.log('[LearnPage] Hint received and added');
              } catch (err) {
                console.error('[LearnPage] Error requesting hint:', err);
                setCanRequestHint(true); // Re-enable button on error
              } finally {
                setIsLoadingHint(false);
              }
            }}
          />
        </div>

        {/* Right Column - Output */}
        {isOutputCollapsed ? (
          <div className="w-8 flex flex-col bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm border-l border-gray-200/50 dark:border-slate-800/50 overflow-hidden cursor-pointer group hover:bg-gray-50/50 dark:hover:bg-slate-800/50 transition-colors"
               onClick={() => setIsOutputCollapsed(false)}
               title="Expand Output">
            <div className="flex-1 flex items-center justify-center">
              <ChevronLeft size={16} className="text-gray-400 dark:text-slate-500 group-hover:text-gray-600 dark:group-hover:text-slate-300 transition-colors" />
            </div>
          </div>
        ) : (
          <div className="w-1/3 flex flex-col bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm border-l border-gray-200/50 dark:border-slate-800/50 overflow-hidden min-w-0">
            <div className="h-12 bg-gray-100/90 dark:bg-slate-800/90 border-b border-gray-200/50 dark:border-slate-700/50 flex items-center justify-between px-4 flex-shrink-0">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-slate-200">Output</h3>
              <button
                onClick={() => setIsOutputCollapsed(true)}
                className="p-1 hover:bg-gray-200/50 dark:hover:bg-slate-700/50 rounded transition-colors"
                title="Collapse Output"
                aria-label="Collapse Output"
              >
                <ChevronRight size={16} className="text-gray-600 dark:text-slate-400" />
              </button>
            </div>
          <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 custom-scrollbar min-w-0">
            {executionResult ? (
              <div className="space-y-3">
                {executionResult.testResults && executionResult.testResults.cases.length > 0 ? (
                  <>
                    {/* Test Results Summary */}
                    <div className={`rounded-lg p-3 border ${
                      executionResult.testResults.passed === executionResult.testResults.total
                        ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                        : 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800'
                    }`}>
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold text-gray-900 dark:text-slate-200">
                          Test Results
                        </p>
                        <p className={`text-sm font-bold ${
                          executionResult.testResults.passed === executionResult.testResults.total
                            ? 'text-green-600 dark:text-green-400'
                            : 'text-yellow-600 dark:text-yellow-400'
                        }`}>
                          {executionResult.testResults.passed}/{executionResult.testResults.total} passed
                        </p>
                      </div>
                    </div>

                    {/* Individual Test Cases */}
                    <div className="space-y-2">
                      {executionResult.testResults.cases.map((testCase, index) => (
                        <div
                          key={index}
                          className={`rounded-lg p-3 border min-w-0 ${
                            testCase.passed
                              ? 'bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800/50'
                              : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800/50'
                          }`}
                        >
                          <div className="flex items-start gap-2 mb-2">
                            {testCase.passed ? (
                              <Check size={18} className="text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                            ) : (
                              <X size={18} className="text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">
                                Test Case {index + 1}
                              </p>
                              <div className="bg-gray-100 dark:bg-slate-800/50 rounded p-2 mb-2 min-w-0">
                                <p className="text-xs text-gray-600 dark:text-slate-400 mb-1">Input:</p>
                                <pre className="text-xs text-gray-900 dark:text-slate-200 font-mono whitespace-pre-wrap break-words overflow-wrap-anywhere">
                                  {testCase.input}
                                </pre>
                              </div>
                              <div className="grid grid-cols-2 gap-2 min-w-0">
                                <div className="bg-gray-100 dark:bg-slate-800/50 rounded p-2 min-w-0">
                                  <p className="text-xs text-gray-600 dark:text-slate-400 mb-1">Expected:</p>
                                  <pre className="text-xs text-gray-900 dark:text-slate-200 font-mono whitespace-pre-wrap break-words overflow-wrap-anywhere">
                                    {testCase.expectedOutput}
                                  </pre>
                                </div>
                                <div className={`rounded p-2 min-w-0 ${
                                  testCase.passed ? 'bg-green-50 dark:bg-green-900/20' : 'bg-red-50 dark:bg-red-900/20'
                                }`}>
                                  <p className="text-xs text-gray-600 dark:text-slate-400 mb-1">Got:</p>
                                  <pre className={`text-xs font-mono whitespace-pre-wrap break-words overflow-wrap-anywhere ${
                                    testCase.passed ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'
                                  }`}>
                                    {testCase.actualOutput}
                                  </pre>
                                </div>
                              </div>
                              {testCase.error && (
                                <div className="mt-2 bg-red-100 dark:bg-red-900/30 rounded p-2">
                                  <p className="text-xs text-red-600 dark:text-red-400">{testCase.error}</p>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <>
                    {/* Standard Output Display (when no test cases) */}
                    <div className="bg-gray-100 dark:bg-slate-800 rounded-lg p-3 min-w-0">
                      <p className="text-xs text-gray-600 dark:text-slate-400 mb-1">Stdout:</p>
                      <pre className="text-sm text-gray-900 dark:text-slate-200 font-mono whitespace-pre-wrap break-words overflow-wrap-anywhere">
                        {executionResult.output || '(no output)'}
                      </pre>
                    </div>
                    {executionResult.error && (
                      <div className="bg-red-100 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg p-3 min-w-0">
                        <p className="text-xs text-red-600 dark:text-red-400 mb-1">Stderr:</p>
                        <pre className="text-sm text-red-700 dark:text-red-300 font-mono whitespace-pre-wrap break-words overflow-wrap-anywhere">
                          {executionResult.error}
                        </pre>
                      </div>
                    )}
                  </>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500 dark:text-slate-500">
                <p className="text-sm">Run your code to see output here</p>
              </div>
            )}
          </div>
          </div>
        )}
      </div>

      {/* Floating Done Bar */}
      {isAllCompleted && onNavigateToSummary && (
        <div className="fixed bottom-0 left-0 right-0 bg-gradient-to-r from-green-500 to-emerald-600 dark:from-green-600 dark:to-emerald-700 shadow-2xl z-50 border-t border-green-600 dark:border-green-700">
          <div className="max-w-7xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                  <Check size={24} className="text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">All Questions Completed! 🎉</h3>
                  <p className="text-sm text-green-100">Great job! View your learning summary.</p>
                </div>
              </div>
              <button
                onClick={onNavigateToSummary}
                className="bg-white text-green-600 hover:bg-green-50 dark:hover:bg-green-100 font-semibold px-6 py-2.5 rounded-lg shadow-lg hover:shadow-xl transition-all transform hover:scale-105"
              >
                View Summary →
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LearnPage;

