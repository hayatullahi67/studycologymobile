
export enum ExamMode {
  PRACTICE = 'PRACTICE',
  EXAM = 'EXAM',
  PAST_QUESTION = 'PAST_QUESTION',
  EDU_GAME = 'EDU_GAME',
}

export interface Option {
  id: string;
  text: string;
}

export interface Question {
  id: string;
  subjectId: string;
  text: string;
  options: Option[];
  correctOptionId: string;
  explanation: string;
}

export interface Subject {
  id: string;
  name: string;
  icon: string;
  questionCount: number;
  exam_name?: string;
}

export interface SubjectResult {
  subjectId: string;
  name: string;
  score: number;
  totalQuestions: number;
  correctAnswers: number;
  wrongAnswers: number;
}

export interface ExamResult {
  id: string;
  totalScore: number;
  totalQuestions: number;
  totalCorrect: number;
  totalWrong: number;
  subjectResults: SubjectResult[];
  timeSpent: number; // in seconds
  timeLeft?: number; // for persistence
  date: string;
  mode: ExamMode;
  userAnswers: Record<string, string>;
  paperId?: string;
  subjectId?: string;
}

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
}

export interface Note {
  id: string;
  subjectId: string;
  title: string;
  content: string;
  topic?: string;
  date: string;
  created_at: string;
  quiz?: QuizQuestion[];
}

export interface JambText {
  id: string;
  type: 'literature' | 'english';
  title: string;
  author?: string;
  thumbnail_url?: string;
  category?: string;
  content: string;
  created_at: string;
  quiz?: QuizQuestion[];
}

export interface UserProgress {
  lastExam?: ExamResult;
  isDataDownloaded: boolean;
}

export interface Paper {
  id: string;
  subjectId: string;
  year: number;
  name: string;
  questions: Question[];
}
