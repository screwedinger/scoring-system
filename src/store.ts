import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Team, QuizPhase, PounceStatus, BounceDirection, QuestionHistoryEntry } from './types';

interface QuizStore {
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

  // Actions
  setTeamCount: (count: number) => void;
  updateTeamName: (id: number, name: string) => void;
  manualAdjustScore: (id: number, delta: number) => void;
  setDirectTeam: (index: number) => void;
  switchRound: (roundNum: number) => void;

  startQuestion: () => void;
  tickTimer: () => void;
  toggleTimer: () => void;
  togglePounce: (teamId: number) => void;
  skipToBounce: () => void;

  toggleBounceSelection: (teamId: number) => void;
  setBouncePointsForTeam: (teamId: number, points: number) => void;
  confirmBounceAndReviewPounce: () => void;

  setPounceResult: (teamId: number, status: 'correct' | 'incorrect') => void;
  togglePounceReviewKey: (teamId: number) => void;
  finalizeQuestion: () => void;

  nextQuestion: () => void;
  applySpecialRoundScores: (adjustments: Record<number, number>, specialTitle?: string) => void;
  resetQuiz: () => void;
}

const quizChannel = typeof window !== 'undefined' ? new BroadcastChannel('quiz_display_channel') : null;

export const broadcastState = (state: any) => {
  if (quizChannel) {
    quizChannel.postMessage({
      teams: state.teams,
      questionNumber: state.questionNumber,
      roundName: state.roundName,
      roundNumber: state.roundNumber,
      bounceDirection: state.bounceDirection,
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
      roundNumber: 1,
      roundName: 'Round 1',
      bounceDirection: 'clockwise',
      directTeamIndex: 0,
      phase: 'IDLE',
      timerSeconds: 30,
      isTimerRunning: false,
      pounces: {},
      bounceCustomPoints: {},
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

      switchRound: (roundNum) => {
        const { teams } = get();
        if (roundNum === 2) {
          set({
            roundNumber: 2,
            roundName: 'Round 2',
            bounceDirection: 'anticlockwise',
            questionNumber: 1,
            directTeamIndex: teams.length - 1,
            phase: 'IDLE',
            timerSeconds: 30,
            isTimerRunning: false,
            pounces: {},
            bounceCustomPoints: {},
          });
        } else {
          set({
            roundNumber: 1,
            roundName: 'Round 1',
            bounceDirection: 'clockwise',
            questionNumber: 1,
            directTeamIndex: 0,
            phase: 'IDLE',
            timerSeconds: 30,
            isTimerRunning: false,
            pounces: {},
            bounceCustomPoints: {},
          });
        }
      },

      startQuestion: () => {
        set({
          phase: 'POUNCING',
          timerSeconds: 30,
          isTimerRunning: true,
          pounces: {},
          bounceCustomPoints: {},
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
        const { bounceCustomPoints, pounces } = get();
        if (pounces[teamId]) return;

        const next = { ...bounceCustomPoints };
        if (next[teamId] !== undefined) {
          delete next[teamId];
        } else {
          const count = Object.keys(next).length + 1;
          const defaultPoints = count === 1 ? 10 : count === 2 ? 5 : 3.3;
          Object.keys(next).forEach((k) => {
            next[Number(k)] = defaultPoints;
          });
          next[teamId] = defaultPoints;
        }
        set({ bounceCustomPoints: next });
      },

      setBouncePointsForTeam: (teamId, points) => {
        set((state) => ({
          bounceCustomPoints: {
            ...state.bounceCustomPoints,
            [teamId]: points,
          },
        }));
      },

      confirmBounceAndReviewPounce: () => {
        const { teams, bounceCustomPoints, pounces } = get();
        let updatedTeams = [...teams];

        Object.entries(bounceCustomPoints).forEach(([idStr, pts]) => {
          const id = Number(idStr);
          updatedTeams = updatedTeams.map((t) => (t.id === id ? { ...t, score: t.score + pts } : t));
        });

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

      togglePounceReviewKey: (teamId) => {
        const { pounces } = get();
        if (pounces[teamId] === undefined) return;
        const current = pounces[teamId];
        const nextStatus = current === 'pending' ? 'correct' : current === 'correct' ? 'incorrect' : 'correct';
        set((state) => ({
          pounces: { ...state.pounces, [teamId]: nextStatus },
        }));
      },

      finalizeQuestion: () => {
        const { teams, pounces, questionNumber, roundName, bounceDirection, directTeamIndex, bounceCustomPoints, historyLog } = get();
        let updatedTeams = [...teams];

        const pounceDetails: NonNullable<QuestionHistoryEntry['pounceResults']> = [];

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
          Object.keys(bounceCustomPoints).length > 0
            ? Object.entries(bounceCustomPoints).map(([idStr, pts]) => ({
                teamName: teams.find((t) => t.id === Number(idStr))?.name || '',
                points: pts,
              }))
            : null;

        const newLogEntry: QuestionHistoryEntry = {
          type: 'question',
          questionNumber,
          roundName,
          direction: bounceDirection,
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
        const { teams, directTeamIndex, questionNumber, bounceDirection } = get();
        const step = bounceDirection === 'clockwise' ? 1 : -1;
        const nextIndex = (directTeamIndex + step + teams.length) % teams.length;

        set({
          questionNumber: questionNumber + 1,
          directTeamIndex: nextIndex,
          phase: 'IDLE',
          timerSeconds: 30,
          isTimerRunning: false,
          pounces: {},
          bounceCustomPoints: {},
        });
      },

      applySpecialRoundScores: (adjustments, specialTitle = 'Special Round') => {
        const { teams, historyLog } = get();
        const results: NonNullable<QuestionHistoryEntry['specialRoundResults']> = [];

        const updatedTeams = teams.map((t) => {
          const delta = adjustments[t.id] || 0;
          if (delta !== 0) {
            results.push({
              teamName: t.name,
              points: delta,
            });
          }
          return {
            ...t,
            score: t.score + delta,
          };
        });

        const newLogEntry: QuestionHistoryEntry = {
          type: 'special_round',
          roundName: specialTitle,
          specialRoundResults: results,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };

        set({
          teams: updatedTeams,
          historyLog: [newLogEntry, ...historyLog],
        });
      },

      resetQuiz: () => {
        set({
          teams: DEFAULT_TEAMS,
          questionNumber: 1,
          roundNumber: 1,
          roundName: 'Round 1',
          bounceDirection: 'clockwise',
          directTeamIndex: 0,
          phase: 'IDLE',
          timerSeconds: 30,
          isTimerRunning: false,
          pounces: {},
          bounceCustomPoints: {},
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