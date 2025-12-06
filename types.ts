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