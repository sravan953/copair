import React, { useState, useEffect } from 'react';
import { analyzeWeakAreas, QuizQuestion, generateSingleLearningQuestion } from './services/geminiService';
import { AnalysisResult, LearningQuestion } from './types';
import ResultsPage from './components/ResultsPage';
import LearnPage from './components/LearnPage';
import { ArrowLeft } from 'lucide-react';

interface Question {
  topic: string;
  question: string;
  options: string[];
  answer: string;
}

const questions: QuizQuestion[] = [
  {
    "topic": "Arrays & Hashing",
    "question": "Which characteristic of a Hash Map allows it to solve the 'Two Sum' problem in O(n) time?",
    "options": [
      "It keeps elements sorted for binary search.",
      "It provides O(1) average time complexity for lookups.",
      "It uses a stack to track previous elements."
    ],
    "answer": "It provides O(1) average time complexity for lookups."
  },
  {
    "topic": "Two Pointers",
    "question": "In a sorted array, how does the Two Pointer technique optimize finding a target sum?",
    "options": [
      "It allows us to skip elements based on the sum being too small or too large.",
      "It sorts the array while searching to save time.",
      "It splits the array in half recursively like Merge Sort."
    ],
    "answer": "It allows us to skip elements based on the sum being too small or too large."
  },
  {
    "topic": "Stack",
    "question": "Which scenario strictly requires the Last-In-First-Out (LIFO) property of a Stack?",
    "options": [
      "Managing a printer queue.",
      "Validating nested parentheses in code.",
      "Finding the shortest path in a graph."
    ],
    "answer": "Validating nested parentheses in code."
  },
  // {
  //   "topic": "Binary Search",
  //   "question": "What is the strict precondition required to apply Binary Search?",
  //   "options": [
  //     "The dataset must be sorted.",
  //     "The dataset must contain no duplicates.",
  //     "The dataset must be a Linked List."
  //   ],
  //   "answer": "The dataset must be sorted."
  // },
  // {
  //   "topic": "Sliding Window",
  //   "question": "Why is a Sliding Window efficient for finding the longest substring without repeats?",
  //   "options": [
  //     "It sorts the string first to group characters.",
  //     "It avoids re-processing the same characters by dynamically resizing the window.",
  //     "It breaks the string into small fixed-size chunks."
  //   ],
  //   "answer": "It avoids re-processing the same characters by dynamically resizing the window."
  // },
  // {
  //   "topic": "Linked List",
  //   "question": "What is the primary trade-off of a Singly Linked List compared to an Array?",
  //   "options": [
  //     "Faster random access (indexing), but slower insertion/deletion.",
  //     "Slower random access (indexing), but faster insertion/deletion at known nodes.",
  //     "Uses less memory per element than an Array."
  //   ],
  //   "answer": "Slower random access (indexing), but faster insertion/deletion at known nodes."
  // },
  // {
  //   "topic": "Trees",
  //   "question": "Which data structure is implicitly used to manage a recursive Depth-First Search (DFS)?",
  //   "options": [
  //     "Queue",
  //     "Stack (Call Stack)",
  //     "Hash Map"
  //   ],
  //   "answer": "Stack (Call Stack)"
  // },
  // {
  //   "topic": "Tries",
  //   "question": "Why is a Trie preferred over a Hash Map for 'Autocomplete' features?",
  //   "options": [
  //     "It uses less memory for completely random strings.",
  //     "It allows efficient prefix-based lookups.",
  //     "It has a faster worst-case lookup time than a balanced BST."
  //   ],
  //   "answer": "It allows efficient prefix-based lookups."
  // },
  // {
  //   "topic": "Heap / Priority Queue",
  //   "question": "Which approach efficiently finds the K-th largest element in a stream?",
  //   "options": [
  //     "Sorting the entire stream every time a number is added.",
  //     "Maintaining a Min-Heap of size K.",
  //     "Using a Max-Heap of size N."
  //   ],
  //   "answer": "Maintaining a Min-Heap of size K."
  // },
  // {
  //   "topic": "Backtracking",
  //   "question": "What distinguishes Backtracking from naive brute-force recursion?",
  //   "options": [
  //     "It uses a Queue instead of a Stack.",
  //     "It 'prunes' or abandons paths that assume invalid conditions early.",
  //     "It always finds the optimal solution faster than Dynamic Programming."
  //   ],
  //   "answer": "It 'prunes' or abandons paths that assume invalid conditions early."
  // },
  // {
  //   "topic": "Intervals",
  //   "question": "What is the critical preprocessing step for the 'Merge Intervals' problem?",
  //   "options": [
  //     "Sorting the intervals by their start times.",
  //     "Sorting the intervals by their duration.",
  //     "Building a segment tree."
  //   ],
  //   "answer": "Sorting the intervals by their start times."
  // },
  // {
  //   "topic": "Greedy",
  //   "question": "What is the common risk when applying a Greedy algorithm?",
  //   "options": [
  //     "It uses too much memory.",
  //     "It makes a locally optimal choice that may not lead to a globally optimal solution.",
  //     "It is too slow for small datasets."
  //   ],
  //   "answer": "It makes a locally optimal choice that may not lead to a globally optimal solution."
  // },
  // {
  //   "topic": "Graphs",
  //   "question": "Which representation is more memory efficient for a 'sparse' graph?",
  //   "options": [
  //     "Adjacency Matrix",
  //     "Adjacency List",
  //     "Edge List sorted by weight"
  //   ],
  //   "answer": "Adjacency List"
  // },
  // {
  //   "topic": "Advanced Graphs",
  //   "question": "Why does Dijkstra's algorithm fail on graphs with negative edge weights?",
  //   "options": [
  //     "It cannot detect cycles.",
  //     "It assumes that adding an edge always increases the total path cost.",
  //     "It is too computationally expensive."
  //   ],
  //   "answer": "It assumes that adding an edge always increases the total path cost."
  // },
  // {
  //   "topic": "1-D DP",
  //   "question": "What is 'Memoization' in Dynamic Programming?",
  //   "options": [
  //     "Solving the problem iteratively from the bottom up.",
  //     "Caching the results of expensive function calls to avoid redundant work.",
  //     "Guessing the solution and verifying it."
  //   ],
  //   "answer": "Caching the results of expensive function calls to avoid redundant work."
  // },
  // {
  //   "topic": "2-D DP",
  //   "question": "In 'Unique Paths' (grid traversal), what does dp[i][j] typically depend on?",
  //   "options": [
  //     "The value of the cell itself only.",
  //     "The sum of paths from the cell above (i-1, j) and the cell to the left (i, j-1).",
  //     "The minimum path from the start to the end."
  //   ],
  //   "answer": "The sum of paths from the cell above (i-1, j) and the cell to the left (i, j-1)."
  // },
  // {
  //   "topic": "Bit Manipulation",
  //   "question": "How can XOR find a missing number in an array where others appear twice?",
  //   "options": [
  //     "XORing a number with itself yields 0, leaving only the unique number.",
  //     "XOR adds the bits together to find the sum.",
  //     "XOR sorts the bits in ascending order."
  //   ],
  //   "answer": "XORing a number with itself yields 0, leaving only the unique number."
  // },
  // {
  //   "topic": "Math & Geometry",
  //   "question": "How does Floyd's Cycle Detection (Tortoise and Hare) work?",
  //   "options": [
  //     "It marks every visited node in a Hash Set.",
  //     "It uses two pointers moving at different speeds; if they meet, there is a cycle.",
  //     "It reverses the list and checks if the head is reachable."
  //   ],
  //   "answer": "It uses two pointers moving at different speeds; if they meet, there is a cycle."
  // }
];

const App: React.FC = () => {
  const [answers, setAnswers] = useState<{ [key: number]: string }>({});
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [view, setView] = useState<'quiz' | 'results' | 'learn'>('quiz');
  const [learningQuestions, setLearningQuestions] = useState<LearningQuestion[]>([]);
  const [isGeneratingQuestions, setIsGeneratingQuestions] = useState(false);
  const [generatingQuestionIndex, setGeneratingQuestionIndex] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [weakAreasForLearning, setWeakAreasForLearning] = useState<AnalysisResult['weakAreas'] | null>(null);

  useEffect(() => {
    console.log('[App] View changed to:', view);
  }, [view]);

  const handleAnswerChange = (questionIndex: number, optionText: string) => {
    setAnswers(prev => ({
      ...prev,
      [questionIndex]: optionText
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Check if at least one question is answered
    const answeredCount = Object.keys(answers).length;
    if (answeredCount === 0) {
      setError("Please answer at least one question before submitting.");
      return;
    }

    setIsAnalyzing(true);
    setError(null);

    try {
      const analysis = await analyzeWeakAreas(questions, answers);
      setAnalysisResult(analysis);
      setView('results');
      // Scroll to top to show results
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      console.error("Error analyzing results:", err);
      setError("Failed to analyze your results. Please try again.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleLearnClick = async () => {
    console.log('[App] handleLearnClick called');
    
    if (!analysisResult || analysisResult.weakAreas.length === 0) {
      console.warn('[App] No weak areas to learn from');
      setError("No weak areas to learn from.");
      return;
    }

    console.log('[App] Navigating to learn view, weak areas count:', analysisResult.weakAreas.length);
    
    // Store weak areas for on-demand generation
    setWeakAreasForLearning(analysisResult.weakAreas);
    
    // Initialize with empty array (will be populated with first question)
    setLearningQuestions([]);
    
    // Navigate to learn view immediately
    setView('learn');
    setError(null);
    setIsGeneratingQuestions(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });

    try {
      console.log('[App] Starting first question generation');
      const startTime = Date.now();
      
      // Generate only the first question
      const firstQuestion = await generateSingleLearningQuestion(analysisResult.weakAreas[0]);
      
      const duration = Date.now() - startTime;
      console.log('[App] First question generated successfully');
      console.log('[App]   Duration:', `${duration}ms`);
      console.log('[App]   Topic:', firstQuestion.topic);
      
      setLearningQuestions([firstQuestion]);
    } catch (err) {
      console.error("[App] Error generating first learning question:", err);
      setError("Failed to generate learning question. Please try again.");
      // Navigate back to results on error
      setView('results');
    } finally {
      setIsGeneratingQuestions(false);
      console.log('[App] First question generation completed');
    }
  };

  const handleGenerateQuestion = async (index: number) => {
    if (!weakAreasForLearning || index >= weakAreasForLearning.length) {
      console.warn('[App] Cannot generate question: invalid index or no weak areas');
      return;
    }

    // Check if question already exists
    if (learningQuestions[index]) {
      console.log('[App] Question already exists at index', index);
      return;
    }

    console.log('[App] Generating question for index:', index);
    setGeneratingQuestionIndex(index);

    try {
      const question = await generateSingleLearningQuestion(weakAreasForLearning[index]);
      
      // Update the questions array at the specific index
      setLearningQuestions(prev => {
        const updated = [...prev];
        // Ensure array is large enough by padding with undefined
        while (updated.length <= index) {
          updated.push(undefined as any);
        }
        updated[index] = question;
        // Filter out undefined to keep array clean, but preserve indices
        return updated;
      });
      
      console.log('[App] Question generated successfully for index:', index);
    } catch (err) {
      console.error("[App] Error generating question:", err);
      setError(`Failed to generate question ${index + 1}. Please try again.`);
    } finally {
      setGeneratingQuestionIndex(null);
    }
  };

  return (
    <div className="h-screen w-full bg-gray-50 dark:bg-slate-950 flex flex-col overflow-hidden">
      {/* Header */}
      <header className="w-full bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-800 px-6 py-4 flex-shrink-0">
        <div className="flex items-center gap-3">
          {(view === 'learn' || view === 'results') && (
            <button
              onClick={() => {
                if (view === 'learn') {
                  setView('results');
                } else if (view === 'results') {
                  setView('quiz');
                }
              }}
              className="p-1.5 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
              aria-label="Go back"
            >
              <ArrowLeft size={20} className="text-gray-700 dark:text-slate-300" />
            </button>
          )}
          <h1 
            onClick={() => setView('quiz')}
            className="text-2xl font-semibold text-gray-900 dark:text-slate-200 cursor-pointer hover:text-gray-700 dark:hover:text-slate-300 transition-colors"
          >
            CoPair
          </h1>
        </div>
      </header>

      {/* Main Content - Scrollable */}
      <main className="flex-1 w-full overflow-y-auto">
        {view === 'learn' ? (
          <LearnPage 
            questions={learningQuestions}
            totalQuestions={weakAreasForLearning?.length || 0}
            onGenerateQuestion={handleGenerateQuestion}
            generatingQuestionIndex={generatingQuestionIndex}
            onBack={() => {
              setView('results');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            isLoading={isGeneratingQuestions}
          />
        ) : view === 'results' && analysisResult ? (
          <ResultsPage 
            result={analysisResult} 
            onLearnClick={handleLearnClick}
            isGeneratingQuestions={isGeneratingQuestions}
          />
        ) : (
          <div className="max-w-5xl mx-auto px-6 py-8">
            {/* Error Message */}
            {error && (
              <div className="mb-8 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                <p className="text-red-800 dark:text-red-300">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-8">
          {questions.map((q, index) => (
            <div
              key={index}
              className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow"
            >
              {/* Topic Badge */}
              <div className="mb-3">
                <span className="inline-block px-3 py-1 text-xs font-medium text-gray-600 dark:text-slate-400 bg-gray-100 dark:bg-slate-800 rounded-full">
                  {q.topic}
                </span>
              </div>

              {/* Question */}
              <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-200 mb-4">
                Q{index + 1}. {q.question}
              </h2>

              {/* Options */}
              <div className="space-y-3">
                {q.options.map((option, optionIndex) => {
                  const optionLabel = String.fromCharCode(65 + optionIndex); // A, B, C
                  const isSelected = answers[index] === option;
                  return (
                    <label
                      key={optionIndex}
                      className={`flex items-start p-3 rounded-lg border-2 cursor-pointer transition-colors ${
                        isSelected
                          ? 'border-blue-500 dark:border-blue-600 bg-blue-50 dark:bg-blue-900/20'
                          : 'border-gray-200 dark:border-slate-700 hover:border-gray-300 dark:hover:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-800'
                      }`}
                    >
                      <input
                        type="radio"
                        name={`question-${index}`}
                        value={option}
                        checked={isSelected}
                        onChange={() => handleAnswerChange(index, option)}
                        className="mt-1 mr-3 h-4 w-4 text-blue-600 dark:text-blue-500 focus:ring-blue-500 dark:focus:ring-blue-400 focus:ring-2"
                      />
                      <div className="flex-1">
                        <span className="font-medium text-gray-700 dark:text-slate-300 mr-2">{optionLabel}.</span>
                        <span className="text-gray-900 dark:text-slate-200">{option}</span>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Submit Button */}
          <div className="pt-4 pb-8">
            <button
              type="submit"
              disabled={isAnalyzing}
              className="w-full max-w-md mx-auto block bg-gray-900 hover:bg-gray-800 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-medium py-3 px-6 rounded-lg transition-colors shadow-sm hover:shadow-md"
            >
              {isAnalyzing ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Analyzing...
                </span>
              ) : (
                'Submit'
              )}
            </button>
            </div>
            </form>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
