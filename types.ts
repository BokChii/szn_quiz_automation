
export interface QuizQuestion {
  question: string;
  options: [string, string, string];
  correctIndex: number;
  explanation: string;
}

export interface QuizResult {
  questions: QuizQuestion[];
  score: number;
  total: number;
}

export type AppState = 'IDLE' | 'PROCESSING' | 'QUIZ' | 'RESULT';
