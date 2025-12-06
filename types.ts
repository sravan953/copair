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