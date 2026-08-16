export interface Team {
  id: number;
  name: string;
  score: number;
}

export type QuizPhase = 
  | 'IDLE'            // Ready to start question
  | 'POUNCING'         // 30s timer running, logging pounce attempts
  | 'POUNCE_REVIEW'    // Grading pounce submissions (+15 / -10)
  | 'BOUNCING'         // Clockwise passing for eligible teams (+10 / +5 split)
  | 'QUESTION_END';    // Round resolved, ready for next question

export type PounceStatus = 'pending' | 'correct' | 'incorrect';

export interface PounceAttempt {
  teamId: number;
  status: PounceStatus;
}

export interface QuizStateSnapshot {
  teams: Team[];
  questionNumber: number;
  directTeamIndex: number;
  phase: QuizPhase;
  timerSeconds: number;
  pounces: Record<number, PounceStatus>;
  bounceCurrentIndex: number;
}