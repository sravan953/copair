export interface Problem {
  id: string;
  title: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  description: string;
  examples: {
    input: string;
    output: string;
    explanation?: string;
  }[];
  starterCode: string;
}

export interface ChatMessage {
  role: 'user' | 'model' | 'system';
  text: string;
  timestamp: number;
}

export interface ExecutionResult {
  output: string;
  error?: string;
  testResults?: {
    passed: number;
    total: number;
    cases: {
      input: string;
      expectedOutput: string;
      actualOutput: string;
      passed: boolean;
      error?: string;
    }[];
  };
}

export enum TabState {
  PROBLEM = 'PROBLEM',
  CHAT = 'CHAT'
}

export interface AnalysisResult {
  overallScore: {
    correct: number;
    total: number;
    percentage: number;
  };
  weakAreas: {
    topic: string;
    incorrectCount: number;
    totalQuestions: number;
    severity: 'high' | 'medium' | 'low';
    commonMistakes: string[];
    recommendations: string[];
  }[];
  strengths: {
    topic: string;
    correctCount: number;
    totalQuestions: number;
  }[];
  recommendations: {
    priority: 'high' | 'medium' | 'low';
    action: string;
    reason: string;
  }[];
  summary: string;
}

export interface LearningQuestion {
  topic: string;
  title: string;
  question: string;
  description: string;
  example1: {
    input: string;
    output: string;
    outputExplanation: string;
  };
  example2: {
    input: string;
    output: string;
    outputExplanation: string;
  };
  starterCode: string;
  answer: string;
  testCases: {
    input: string;  // Python code that calls the function, e.g., "solution([1,2,3], 5)"
    expectedOutput: string;  // Expected output as string, e.g., "[0, 2]"
  }[];
}

export interface Hint {
  text: string;
  timestamp: number;
}

export interface QuestionCompletion {
  questionIndex: number;
  topic: string;
  completed: boolean;
  completedAt?: number;
}