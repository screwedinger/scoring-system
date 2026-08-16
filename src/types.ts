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
  bounceResult?: {
    teamName: string;
    points: number;
  }[] | null;
  pounceResults?: {
    teamName: string;
    status: 'correct' | 'incorrect';
    points: number;
  }[];
  specialRoundResults?: {
    teamName: string;
    points: number;
  }[];
  timestamp: string;
}

export interface QuizStateSnapshot {
  teams: Team[];
  questionNumber: number;
  directTeamIndex: number;
  phase: QuizPhase;
  timerSeconds: number;
  pounces: Record<number, PounceStatus>;
  bounceAwardedTeams: number[];
}