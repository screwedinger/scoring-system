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

export interface QuestionHistoryEntry {
  questionNumber: number;
  directTeamName: string;
  bounceResult: {
    awardedTeamNames: string[];
    pointsEach: number;
  } | null;
  pounceResults: {
    teamName: string;
    status: 'correct' | 'incorrect';
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