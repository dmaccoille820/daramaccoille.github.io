export type Language = 'ga' | 'en';

export interface Question {
  id: string;
  points: number;
  clue_en: string;
  clue_ga: string;
  answer_en: string;
  answer_ga: string;
  explanation_en?: string;
  explanation_ga?: string;
  isDailyDouble?: boolean;
  isAnswered?: boolean;
}

export interface Category {
  id: string;
  name_en: string;
  name_ga: string;
  questions: Question[];
}

export interface Round {
  id: string;
  roundNumber: number;
  name_en: string;
  name_ga: string;
  categories: Category[];
}

export interface JeopardyGame {
  id: string;
  title: string;
  subject?: string;
  description?: string;
  rounds: Round[];
  createdAt?: string;
}

export interface Team {
  id: string;
  name: string;
  score: number;
  color?: string;
}

export interface GameState {
  game: JeopardyGame;
  currentRoundNumber: number;
  language: Language;
  teams: Team[];
  activeQuestion: Question | null;
  activeCategory: Category | null;
  isAnswerRevealed: boolean;
  answeredQuestionIds: string[];
}
