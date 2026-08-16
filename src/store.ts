import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Team, QuizPhase, PounceStatus, QuestionHistoryEntry } from './types';

interface QuizStore {
  teams: Team[];
  questionNumber: number;
  directTeamIndex: number;
  phase: QuizPhase;
  timerSeconds: number;
  isTimerRunning: boolean;
  pounces: Record<number, PounceStatus>;
  bounceAwardedTeams: number[];
  historyLog: QuestionHistoryEntry[];

  // Actions
  setTeamCount: (count: number) => void;
  updateTeamName: (id: number, name: string) => void;
  manualAdjustScore: (id: number, delta: number) => void;
  setDirectTeam: (index: number) => void;

  startQuestion: () => void;
  tickTimer: () => void;
  toggleTimer: () => void;
  togglePounce: (teamId: number) => void;
  skipToBounce: () => void;

  toggleBounceSelection: (teamId: number) => void;
  confirmBounceAndReviewPounce: () => void;

  setPounceResult: (teamId: number, status: 'correct' | 'incorrect') => void;
  finalizeQuestion: () => void;

  nextQuestion: () => void;
  applySpecialRoundScores: (adjustments: Record<number, number>) => void;
  resetQuiz: () => void;
}

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

const DEFAULT_TEAMS: Team[] = Array.from({ length: 8 }, (_, i) => ({
  id: i + 1,
  name: `Team ${i + 1}`,
  score: 0,
}));

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
      bounceAwardedTeams: [],
      historyLog: [],

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
          bounceAwardedTeams: [],
        });
      },

      tickTimer: () => {
        const { timerSeconds, isTimerRunning } = get();
        if (!isTimerRunning) return;
        if (timerSeconds <= 1) {
          get().skipToBounce();
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

      skipToBounce: () => {
        set({
          isTimerRunning: false,
          phase: 'BOUNCING',
        });
      },

      toggleBounceSelection: (teamId) => {
        const { bounceAwardedTeams, pounces } = get();
        if (pounces[teamId]) return;

        if (bounceAwardedTeams.includes(teamId)) {
          set({ bounceAwardedTeams: bounceAwardedTeams.filter((id) => id !== teamId) });
        } else {
          if (bounceAwardedTeams.length < 3) {
            set({ bounceAwardedTeams: [...bounceAwardedTeams, teamId] });
          }
        }
      },

      confirmBounceAndReviewPounce: () => {
        const { teams, bounceAwardedTeams, pounces } = get();
        let updatedTeams = [...teams];

        if (bounceAwardedTeams.length === 1) {
          updatedTeams = updatedTeams.map((t) =>
            t.id === bounceAwardedTeams[0] ? { ...t, score: t.score + 10 } : t
          );
        } else if (bounceAwardedTeams.length > 1) {
          const splitPoints = Math.round((10 / bounceAwardedTeams.length) * 10) / 10;
          updatedTeams = updatedTeams.map((t) =>
            bounceAwardedTeams.includes(t.id) ? { ...t, score: t.score + splitPoints } : t
          );
        }

        const hasPounces = Object.keys(pounces).length > 0;

        set({
          teams: updatedTeams,
          phase: hasPounces ? 'POUNCE_REVIEW' : 'QUESTION_END',
        });

        if (!hasPounces) {
          get().finalizeQuestion();
        }
      },

      setPounceResult: (teamId, status) => {
        set((state) => ({
          pounces: { ...state.pounces, [teamId]: status },
        }));
      },

      finalizeQuestion: () => {
        const { teams, pounces, questionNumber, directTeamIndex, bounceAwardedTeams, historyLog } = get();
        let updatedTeams = [...teams];

        const pounceDetails: QuestionHistoryEntry['pounceResults'] = [];

        Object.entries(pounces).forEach(([idStr, status]) => {
          const id = Number(idStr);
          const delta = status === 'correct' ? 15 : -10;
          const targetTeam = teams.find((t) => t.id === id);
          if (targetTeam) {
            pounceDetails.push({
              teamName: targetTeam.name,
              status,
              points: delta,
            });
          }
          updatedTeams = updatedTeams.map((t) => (t.id === id ? { ...t, score: t.score + delta } : t));
        });

        const bounceResult =
          bounceAwardedTeams.length > 0
            ? {
                awardedTeamNames: bounceAwardedTeams.map((id) => teams.find((t) => t.id === id)?.name || ''),
                pointsEach: Math.round((10 / bounceAwardedTeams.length) * 10) / 10,
              }
            : null;

        const newLogEntry: QuestionHistoryEntry = {
          questionNumber,
          directTeamName: teams[directTeamIndex]?.name || `Team ${directTeamIndex + 1}`,
          bounceResult,
          pounceResults: pounceDetails,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };

        set({
          teams: updatedTeams,
          phase: 'QUESTION_END',
          historyLog: [newLogEntry, ...historyLog],
        });
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
          bounceAwardedTeams: [],
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

      resetQuiz: () => {
        set({
          teams: DEFAULT_TEAMS,
          questionNumber: 1,
          directTeamIndex: 0,
          phase: 'IDLE',
          timerSeconds: 30,
          isTimerRunning: false,
          pounces: {},
          bounceAwardedTeams: [],
          historyLog: [],
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