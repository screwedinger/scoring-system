import { useEffect, useState } from 'react';
import { Trophy, Timer } from 'lucide-react';
import type { Team, QuizPhase } from './types';

interface DisplayState {
  teams: Team[];
  questionNumber: number;
  directTeamIndex: number;
  phase: QuizPhase;
  timerSeconds: number;
  isTimerRunning: boolean;
}

export default function ProjectorView() {
  const [data, setData] = useState<DisplayState>(() => {
    // Initial fallback from localStorage if available
    const saved = localStorage.getItem('quiz-master-storage');
    if (saved) {
      try {
        const parsed = JSON.parse(saved).state;
        return {
          teams: parsed.teams || [],
          questionNumber: parsed.questionNumber || 1,
          directTeamIndex: parsed.directTeamIndex || 0,
          phase: parsed.phase || 'IDLE',
          timerSeconds: parsed.timerSeconds ?? 30,
          isTimerRunning: parsed.isTimerRunning || false,
        };
      } catch (e) {
        // Fallback to defaults
      }
    }
    return {
      teams: [],
      questionNumber: 1,
      directTeamIndex: 0,
      phase: 'IDLE',
      timerSeconds: 30,
      isTimerRunning: false,
    };
  });

  useEffect(() => {
    const channel = new BroadcastChannel('quiz_display_channel');
    channel.onmessage = (event) => {
      setData(event.data);
    };
    return () => channel.close();
  }, []);

  const sortedTeams = [...data.teams].sort((a, b) => b.score - a.score);
  const directTeam = data.teams[data.directTeamIndex];

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col p-8 select-none">
      {/* Top Banner */}
      <header className="flex items-center justify-between border-b border-slate-800/80 pb-6 mb-8">
        <div>
          <span className="text-indigo-400 font-bold uppercase tracking-widest text-sm">Quiz Live Scoreboard</span>
          <h1 className="text-4xl font-black tracking-tight mt-1">Question {data.questionNumber}</h1>
        </div>

        {/* Big Stage Timer */}
        <div className="flex items-center gap-4">
          <div className="text-right">
            <span className="text-xs uppercase tracking-wider text-slate-400 font-semibold block">Direct Turn</span>
            <span className="text-xl font-bold text-amber-400">{directTeam?.name || '---'}</span>
          </div>

          <div className={`flex items-center gap-3 px-6 py-3 rounded-2xl border ${
            data.timerSeconds <= 5 && data.phase === 'POUNCING'
              ? 'bg-rose-950/80 border-rose-500 text-rose-400 animate-pulse'
              : 'bg-slate-900 border-slate-800 text-indigo-400'
          }`}>
            <Timer className="w-7 h-7" />
            <span className="text-4xl font-black font-mono tracking-tight">{data.timerSeconds}s</span>
          </div>
        </div>
      </header>

      {/* Stage Leaderboard Grid */}
      <main className="flex-1 grid grid-cols-2 gap-4">
        {sortedTeams.map((team, rank) => {
          const isLeader = rank === 0;
          return (
            <div
              key={team.id}
              className={`flex items-center justify-between p-6 rounded-2xl border transition-all ${
                isLeader
                  ? 'bg-gradient-to-r from-amber-500/10 via-slate-900 to-slate-900 border-amber-500/40 shadow-lg shadow-amber-500/5'
                  : 'bg-slate-900/60 border-slate-800/80'
              }`}
            >
              <div className="flex items-center gap-5">
                <span className={`text-2xl font-black font-mono w-8 ${
                  rank === 0 ? 'text-amber-400' : rank === 1 ? 'text-slate-300' : rank === 2 ? 'text-amber-600' : 'text-slate-600'
                }`}>
                  #{rank + 1}
                </span>
                <div>
                  <h3 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
                    {team.name}
                    {isLeader && <Trophy className="w-5 h-5 text-amber-400" />}
                  </h3>
                </div>
              </div>

              <div className={`text-4xl font-black font-mono px-4 py-1 rounded-xl ${
                team.score > 0 ? 'text-emerald-400' : team.score < 0 ? 'text-rose-400' : 'text-slate-400'
              }`}>
                {team.score}
              </div>
            </div>
          );
        })}
      </main>
    </div>
  );
}