export interface Team {
  id: number;
  name: string;
  score: number;
}

export type QuizPhase =
  | 'IDLE'
  | 'POUNCING'
  | 'BOUNCING'
  | 'POUNCE_REVIEW'
  | 'QUESTION_END';

export type PounceStatus = 'pending' | 'correct' | 'incorrect';

export type BounceDirection = 'clockwise' | 'anticlockwise';

export interface QuestionHistoryEntry {
  type: 'question' | 'special_round';
  questionNumber?: number;
  roundName: string;
  direction?: BounceDirection;
  directTeamName?: string;
  bounceResult?: { teamName: string; points: number }[] | null;
  pounceResults?: {
    teamName: string;
    status: 'correct' | 'incorrect';
    points: number;
  }[];
  specialRoundResults?: { teamName: string; points: number }[];
  timestamp: string;
}

export type QuizEventType =
  | 'QUIZ_RESET'
  | 'TEAM_COUNT_CHANGED'
  | 'TEAM_RENAMED'
  | 'SCORE_ADJUSTED'
  | 'ROUND_SWITCHED'
  | 'QUESTION_STARTED'
  | 'POUNCE_TOGGLED'
  | 'TIMER_TOGGLED'
  | 'BOUNCE_SELECTION_CHANGED'
  | 'BOUNCE_POINTS_CHANGED'
  | 'BOUNCE_COMMITTED'
  | 'POUNCE_RESULT_CHANGED'
  | 'QUESTION_FINALIZED'
  | 'QUESTION_ADVANCED'
  | 'SPECIAL_ROUND_APPLIED';

export interface QuizEvent {
  id: string;
  type: QuizEventType;
  label: string;
  timestamp: string;
  payload?: Record<string, unknown>;
}

export interface QuizSession {
  id: string;
  createdAt: string;
  updatedAt: string;
}

export interface QuizStateSnapshot {
  teams: Team[];
  questionNumber: number;
  roundNumber: number;
  roundName: string;
  bounceDirection: BounceDirection;
  directTeamIndex: number;
  phase: QuizPhase;
  timerSeconds: number;
  isTimerRunning: boolean;
  pounces: Record<number, PounceStatus>;
  bounceCustomPoints: Record<number, number>;
  historyLog: QuestionHistoryEntry[];
  events: QuizEvent[];
}
