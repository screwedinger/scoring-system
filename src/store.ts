import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Team, QuizPhase, PounceStatus, QuizStateSnapshot } from './types';

interface QuizStore {
  teams: Team[];
  questionNumber: number;
  directTeamIndex: number; // 0 to N-1
  phase: QuizPhase;
  timerSeconds: number;
  isTimerRunning: boolean;
  pounces: Record<number, PounceStatus>; // teamId -> status
  bounceCurrentIndex: number; // pointer in eligible bounce queue
  history: QuizStateSnapshot[];

  // Actions
  setTeamCount: (count: number) => void;
  updateTeamName: (id: number, name: string) => void;
  manualAdjustScore: (id: number, delta: number) => void;
  setDirectTeam: (index: number) => void;
  
  // Phase Controls
  startQuestion: () => void;
  tickTimer: () => void;
  toggleTimer: () => void;
  togglePounce: (teamId: number) => void;
  finishPouncePhase: () => void;
  
  // Pounce Review
  setPounceResult: (teamId: number, status: 'correct' | 'incorrect') => void;
  proceedToBounce: () => void;

  // Bounce Operations
  awardBounceFull: (teamId: number) => void;
  awardBounceSplit: (teamId1: number, teamId2: number) => void;
  passBounce: () => void;
  
  // Round Completion & Reset
  nextQuestion: () => void;
  applySpecialRoundScores: (adjustments: Record<number, number>) => void;
  undo: () => void;
  resetQuiz: () => void;
}

const DEFAULT_TEAMS: Team[] = Array.from({ length: 8 }, (_, i) => ({
  id: i + 1,
  name: `Team ${i + 1}`,
  score: 0,
}));

// Broadcast channel instance for multi-window sync
const quizChannel = typeof window !== 'undefined' ? new BroadcastChannel('quiz_display_channel') : null;

export const broadcastState = (state: any) => {
  if (quizChannel) {
    quizChannel.postMessage({
      teams: state.teams,
      questionNumber: state.questionNumber,
      directTeamIndex: state.directTeamIndex,
      phase: state.phase,
      timerSeconds: state.timerSeconds,
      isTimerRunning: state.isTimerRunning,
    });
  }
};

export const useQuizStore = create<QuizStore>()(
  persist(
    (set, get) => ({
      teams: DEFAULT_TEAMS,
      questionNumber: 1,
      directTeamIndex: 0,
      phase: 'IDLE',
      timerSeconds: 30,
      isTimerRunning: false,
      pounces: {},
      bounceCurrentIndex: 0,
      history: [],

      setTeamCount: (count) => {
        const current = get().teams;
        let nextTeams: Team[] = [];
        if (count > current.length) {
          nextTeams = [
            ...current,
            ...Array.from({ length: count - current.length }, (_, i) => ({
              id: current.length + i + 1,
              name: `Team ${current.length + i + 1}`,
              score: 0,
            })),
          ];
        } else {
          nextTeams = current.slice(0, count);
        }
        set({ teams: nextTeams, directTeamIndex: 0 });
      },

      updateTeamName: (id, name) => {
        set((state) => ({
          teams: state.teams.map((t) => (t.id === id ? { ...t, name } : t)),
        }));
      },

      manualAdjustScore: (id, delta) => {
        set((state) => ({
          teams: state.teams.map((t) => (t.id === id ? { ...t, score: t.score + delta } : t)),
        }));
      },

      setDirectTeam: (index) => set({ directTeamIndex: index }),

      startQuestion: () => {
        set({
          phase: 'POUNCING',
          timerSeconds: 30,
          isTimerRunning: true,
          pounces: {},
          bounceCurrentIndex: 0,
        });
      },

      tickTimer: () => {
        const { timerSeconds, isTimerRunning } = get();
        if (!isTimerRunning) return;
        if (timerSeconds <= 1) {
          get().finishPouncePhase();
        } else {
          set({ timerSeconds: timerSeconds - 1 });
        }
      },

      toggleTimer: () => {
        set((state) => ({ isTimerRunning: !state.isTimerRunning }));
      },

      togglePounce: (teamId) => {
        const { phase, pounces } = get();
        if (phase !== 'POUNCING') return;

        const nextPounces = { ...pounces };
        if (nextPounces[teamId]) {
          delete nextPounces[teamId];
        } else {
          nextPounces[teamId] = 'pending';
        }
        set({ pounces: nextPounces });
      },

      finishPouncePhase: () => {
        const pounces = get().pounces;
        const hasPounces = Object.keys(pounces).length > 0;
        set({
          isTimerRunning: false,
          phase: hasPounces ? 'POUNCE_REVIEW' : 'BOUNCING',
        });
      },

      setPounceResult: (teamId, status) => {
        set((state) => ({
          pounces: { ...state.pounces, [teamId]: status },
        }));
      },

      proceedToBounce: () => {
        const { teams, pounces } = get();
        // Calculate and apply pounce scores
        let updatedTeams = [...teams];
        Object.entries(pounces).forEach(([idStr, status]) => {
          const id = Number(idStr);
          const delta = status === 'correct' ? 15 : -10;
          updatedTeams = updatedTeams.map((t) => (t.id === id ? { ...t, score: t.score + delta } : t));
        });

        set({
          teams: updatedTeams,
          phase: 'BOUNCING',
          bounceCurrentIndex: 0,
        });
      },

      awardBounceFull: (teamId) => {
        set((state) => ({
          teams: state.teams.map((t) => (t.id === teamId ? { ...t, score: t.score + 10 } : t)),
          phase: 'QUESTION_END',
        }));
      },

      awardBounceSplit: (teamId1, teamId2) => {
        set((state) => ({
          teams: state.teams.map((t) => {
            if (t.id === teamId1 || t.id === teamId2) {
              return { ...t, score: t.score + 5 };
            }
            return t;
          }),
          phase: 'QUESTION_END',
        }));
      },

      passBounce: () => {
        set((state) => ({ bounceCurrentIndex: state.bounceCurrentIndex + 1 }));
      },

      nextQuestion: () => {
        const { teams, directTeamIndex, questionNumber } = get();
        set({
          questionNumber: questionNumber + 1,
          directTeamIndex: (directTeamIndex + 1) % teams.length,
          phase: 'IDLE',
          timerSeconds: 30,
          isTimerRunning: false,
          pounces: {},
          bounceCurrentIndex: 0,
        });
      },

      applySpecialRoundScores: (adjustments) => {
        set((state) => ({
          teams: state.teams.map((t) => ({
            ...t,
            score: t.score + (adjustments[t.id] || 0),
          })),
        }));
      },

      undo: () => {
        // Simple placeholder for history rollback
      },

      resetQuiz: () => {
        set({
          teams: DEFAULT_TEAMS,
          questionNumber: 1,
          directTeamIndex: 0,
          phase: 'IDLE',
          timerSeconds: 30,
          isTimerRunning: false,
          pounces: {},
          bounceCurrentIndex: 0,
        });
      },
    }),
    {
      name: 'quiz-master-storage',
    }
  )
);
useQuizStore.subscribe((state) => {
  broadcastState(state);
});