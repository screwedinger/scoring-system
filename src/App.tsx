import React, { useEffect, useState } from 'react';
import { useQuizStore } from './store';
import { 
  Play, Pause, FastForward, RotateCcw, ArrowRight, 
  CheckCircle, XCircle, Plus, Minus, Trophy, Sparkles, Settings
} from 'lucide-react';
import confetti from 'canvas-confetti';

export default function App() {
  const {
    teams,
    questionNumber,
    directTeamIndex,
    phase,
    timerSeconds,
    isTimerRunning,
    pounces,
    bounceCurrentIndex,
    setTeamCount,
    updateTeamName,
    manualAdjustScore,
    setDirectTeam,
    startQuestion,
    tickTimer,
    toggleTimer,
    togglePounce,
    finishPouncePhase,
    setPounceResult,
    proceedToBounce,
    awardBounceFull,
    awardBounceSplit,
    passBounce,
    nextQuestion,
    applySpecialRoundScores,
    resetQuiz
  } = useQuizStore();

  // Local UI States
  const [splitTeam1, setSplitTeam1] = useState<number | null>(null);
  const [splitTeam2, setSplitTeam2] = useState<number | null>(null);
  const [isSpecialRoundOpen, setIsSpecialRoundOpen] = useState(false);
  const [specialScores, setSpecialScores] = useState<Record<number, number>>({});
  const [editingTeamId, setEditingTeamId] = useState<number | null>(null);
  const [tempEditScore, setTempEditScore] = useState<string>('');

  // Global Timer Interval
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isTimerRunning) {
      interval = setInterval(() => {
        tickTimer();
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isTimerRunning, tickTimer]);

  // Keyboard Shortcuts (1-9 for pounce toggle, Space for timer)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;

      if (e.code === 'Space') {
        e.preventDefault();
        if (phase === 'IDLE') startQuestion();
        else if (phase === 'POUNCING') toggleTimer();
      }

      const keyNum = parseInt(e.key, 10);
      if (!isNaN(keyNum) && keyNum >= 1 && keyNum <= teams.length) {
        if (phase === 'POUNCING') {
          togglePounce(teams[keyNum - 1].id);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [phase, teams, togglePounce, toggleTimer, startQuestion]);

  // Compute Eligible Bounce Queue (Clockwise starting from Direct Team, skipping Pouncers)
  const eligibleBounceTeams = React.useMemo(() => {
    if (teams.length === 0) return [];
    const ordered: typeof teams = [];
    for (let i = 0; i < teams.length; i++) {
      const idx = (directTeamIndex + i) % teams.length;
      const team = teams[idx];
      // Exclude teams that took a pounce
      if (!pounces[team.id]) {
        ordered.push(team);
      }
    }
    return ordered;
  }, [teams, directTeamIndex, pounces]);

  const activeBounceTeam = eligibleBounceTeams[bounceCurrentIndex] || null;

  // Handlers
  const handleSplitAward = () => {
    if (splitTeam1 && splitTeam2 && splitTeam1 !== splitTeam2) {
      awardBounceSplit(splitTeam1, splitTeam2);
      setSplitTeam1(null);
      setSplitTeam2(null);
    }
  };

  const handleSpecialSubmit = () => {
    applySpecialRoundScores(specialScores);
    setSpecialScores({});
    setIsSpecialRoundOpen(false);
    confetti({ particleCount: 60, spread: 70, origin: { y: 0.6 } });
  };

  const triggerWinnerCelebration = () => {
    confetti({ particleCount: 120, spread: 90, origin: { y: 0.5 } });
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Top Header */}
      <header className="border-b border-slate-800 bg-slate-900/60 px-6 py-4 backdrop-blur flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 px-3 py-1 rounded-lg text-sm font-semibold tracking-wider">
            QUESTION {questionNumber}
          </div>
          <div className="text-slate-400 text-sm">
            Direct Turn: <span className="font-bold text-amber-400">{teams[directTeamIndex]?.name}</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Team count selector */}
          <div className="flex items-center bg-slate-800 rounded-lg p-1 border border-slate-700 text-xs">
            {[8, 9, 10].map((count) => (
              <button
                key={count}
                onClick={() => setTeamCount(count)}
                className={`px-2.5 py-1 rounded font-medium transition ${
                  teams.length === count ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {count} Teams
              </button>
            ))}
          </div>

          <button
            onClick={() => setIsSpecialRoundOpen(true)}
            className="flex items-center gap-1.5 bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/30 px-3 py-1.5 rounded-lg text-xs font-semibold transition"
          >
            <Sparkles className="w-3.5 h-3.5" /> Special Round
          </button>

          <button
            onClick={resetQuiz}
            className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition"
            title="Reset Quiz"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Controller Layout */}
      <main className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6 p-6 max-w-7xl mx-auto w-full">
        {/* Left 2 Cols: Main Action Stage */}
        <div className="lg:col-span-2 space-y-6 flex flex-col">
          
          {/* Phase 1: IDLE / POUNCING STAGE */}
          {(phase === 'IDLE' || phase === 'POUNCING') && (
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col gap-6 flex-1">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold tracking-tight">
                    {phase === 'IDLE' ? 'Ready for Question' : '⚡ Pounce Window Active'}
                  </h2>
                  <p className="text-slate-400 text-xs mt-1">
                    {phase === 'IDLE' 
                      ? 'Press Space or Start to begin the 30-second pounce timer.'
                      : 'Click teams or press 1–8 on keyboard to tag pounce slips.'}
                  </p>
                </div>

                {/* 30s Countdown Display */}
                <div className={`px-5 py-2.5 rounded-xl border text-3xl font-black font-mono tracking-tighter ${
                  timerSeconds <= 5 
                    ? 'bg-rose-950/60 border-rose-500 text-rose-400 animate-pulse' 
                    : 'bg-slate-950 border-slate-800 text-indigo-400'
                }`}>
                  {timerSeconds}s
                </div>
              </div>

              {/* Action Bar */}
              <div className="flex gap-3">
                {phase === 'IDLE' ? (
                  <button
                    onClick={startQuestion}
                    className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-3 px-4 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20 transition"
                  >
                    <Play className="w-5 h-5 fill-current" /> Start 30s Pounce Timer
                  </button>
                ) : (
                  <>
                    <button
                      onClick={toggleTimer}
                      className="flex-1 bg-slate-800 hover:bg-slate-700 font-semibold py-3 px-4 rounded-xl flex items-center justify-center gap-2 border border-slate-700 transition"
                    >
                      {isTimerRunning ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                      {isTimerRunning ? 'Pause Timer' : 'Resume Timer'}
                    </button>
                    <button
                      onClick={finishPouncePhase}
                      className="bg-amber-600 hover:bg-amber-500 text-white font-semibold py-3 px-6 rounded-xl flex items-center justify-center gap-2 transition"
                    >
                      <FastForward className="w-5 h-5" /> Finish Pounces
                    </button>
                  </>
                )}
              </div>

              {/* Interactive Team Grid for Pounce */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-2 flex-1">
                {teams.map((team, idx) => {
                  const isDirect = idx === directTeamIndex;
                  const isPounced = !!pounces[team.id];

                  return (
                    <button
                      key={team.id}
                      disabled={phase === 'IDLE'}
                      onClick={() => togglePounce(team.id)}
                      className={`relative p-4 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all ${
                        isPounced
                          ? 'bg-rose-600/20 border-rose-500 text-rose-200 shadow-md shadow-rose-950'
                          : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 text-slate-300'
                      } ${phase === 'IDLE' ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer active:scale-95'}`}
                    >
                      <span className="text-xs font-mono text-slate-500 absolute top-2 left-2">[{team.id}]</span>
                      {isDirect && (
                        <span className="absolute top-2 right-2 px-1.5 py-0.5 bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-bold rounded">
                          DIRECT
                        </span>
                      )}
                      <span className="font-semibold text-sm mt-3">{team.name}</span>
                      <span className={`text-xs font-bold uppercase tracking-wider mt-1 px-2 py-0.5 rounded ${
                        isPounced ? 'bg-rose-500 text-white' : 'bg-slate-800 text-slate-400'
                      }`}>
                        {isPounced ? 'Pounced' : 'Pass'}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Phase 2: POUNCE REVIEW (+15 / -10) */}
          {phase === 'POUNCE_REVIEW' && (
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col gap-6 flex-1">
              <div>
                <h2 className="text-xl font-bold tracking-tight text-rose-400">Evaluate Pounce Submissions</h2>
                <p className="text-slate-400 text-xs mt-1">Mark each pouncing team as Correct (+15) or Incorrect (-10).</p>
              </div>

              <div className="space-y-3 flex-1">
                {Object.keys(pounces).map((idStr) => {
                  const id = Number(idStr);
                  const team = teams.find((t) => t.id === id);
                  if (!team) return null;
                  const currentStatus = pounces[id];

                  return (
                    <div key={id} className="flex items-center justify-between bg-slate-950 p-4 rounded-xl border border-slate-800">
                      <span className="font-semibold text-slate-200">{team.name}</span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setPounceResult(id, 'correct')}
                          className={`px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-1.5 border transition ${
                            currentStatus === 'correct'
                              ? 'bg-emerald-600 text-white border-emerald-500 shadow-md'
                              : 'bg-slate-800 border-slate-700 text-emerald-400 hover:bg-slate-700'
                          }`}
                        >
                          <CheckCircle className="w-4 h-4" /> +15 (Correct)
                        </button>
                        <button
                          onClick={() => setPounceResult(id, 'incorrect')}
                          className={`px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-1.5 border transition ${
                            currentStatus === 'incorrect'
                              ? 'bg-rose-600 text-white border-rose-500 shadow-md'
                              : 'bg-slate-800 border-slate-700 text-rose-400 hover:bg-slate-700'
                          }`}
                        >
                          <XCircle className="w-4 h-4" /> -10 (Incorrect)
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              <button
                onClick={proceedToBounce}
                className="w-full bg-indigo-600 hover:bg-indigo-500 font-semibold py-3 rounded-xl flex items-center justify-center gap-2 shadow-lg transition"
              >
                Apply Pounce Points & Proceed to Bounce <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          )}

          {/* Phase 3: BOUNCE QUEUE (+10 / +5 Split / Pass) */}
          {phase === 'BOUNCING' && (
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col gap-6 flex-1">
              <div>
                <h2 className="text-xl font-bold tracking-tight text-amber-400">Clockwise Bounce Phase</h2>
                <p className="text-slate-400 text-xs mt-1">
                  Active turn proceeds clockwisely. All teams that pounced have been excluded automatically.
                </p>
              </div>

              {activeBounceTeam ? (
                <div className="bg-slate-950 border border-amber-500/30 rounded-2xl p-6 flex flex-col items-center justify-center gap-4 text-center">
                  <span className="text-xs uppercase font-bold tracking-widest text-amber-400/80 bg-amber-500/10 px-3 py-1 rounded-full">
                    Current Turn
                  </span>
                  <div className="text-3xl font-black text-white">{activeBounceTeam.name}</div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 w-full max-w-md mt-2">
                    <button
                      onClick={() => awardBounceFull(activeBounceTeam.id)}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-xl shadow-lg transition col-span-2 sm:col-span-1"
                    >
                      +10 Correct
                    </button>
                    <button
                      onClick={passBounce}
                      className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-3 rounded-xl border border-slate-700 transition"
                    >
                      Pass & Bounce
                    </button>
                    <button
                      onClick={() => {
                        setSplitTeam1(activeBounceTeam.id);
                      }}
                      className="bg-purple-600 hover:bg-purple-500 text-white font-bold py-3 rounded-xl transition"
                    >
                      Split (+5 / +5)
                    </button>
                  </div>
                </div>
              ) : (
                <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 text-center text-slate-400">
                  All eligible teams have passed this question.
                </div>
              )}

              {/* Point Split Sub-drawer */}
              {splitTeam1 && (
                <div className="bg-purple-950/40 border border-purple-500/30 p-4 rounded-xl flex flex-col gap-3">
                  <span className="text-xs font-bold uppercase text-purple-300">Select 2nd Team for +5 Split</span>
                  <div className="flex flex-wrap gap-2">
                    {teams
                      .filter((t) => t.id !== splitTeam1)
                      .map((t) => (
                        <button
                          key={t.id}
                          onClick={() => setSplitTeam2(t.id)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold border ${
                            splitTeam2 === t.id
                              ? 'bg-purple-600 border-purple-400 text-white'
                              : 'bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-800'
                          }`}
                        >
                          {t.name}
                        </button>
                      ))}
                  </div>
                  {splitTeam2 && (
                    <button
                      onClick={handleSplitAward}
                      className="bg-purple-600 hover:bg-purple-500 text-white font-bold py-2 rounded-lg text-sm transition self-end px-4"
                    >
                      Confirm +5 / +5 Split
                    </button>
                  )}
                </div>
              )}

              <button
                onClick={nextQuestion}
                className="mt-auto bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold py-3 rounded-xl flex items-center justify-center gap-2 border border-slate-700 transition"
              >
                No Points / Skip to Next Question <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Phase 4: QUESTION SUMMARY */}
          {phase === 'QUESTION_END' && (
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col items-center justify-center gap-4 text-center flex-1">
              <CheckCircle className="w-12 h-12 text-emerald-400" />
              <h2 className="text-2xl font-black">Question {questionNumber} Resolved</h2>
              <p className="text-slate-400 text-sm max-w-sm">
                Points have been successfully credited. Click below to rotate the direct turn to the next team.
              </p>
              <button
                onClick={nextQuestion}
                className="bg-indigo-600 hover:bg-indigo-500 font-bold py-3.5 px-8 rounded-xl flex items-center gap-2 shadow-lg shadow-indigo-600/30 transition text-base"
              >
                Advance to Next Question <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>

        {/* Right Col: Real-time Leaderboard & Manual Adjustments */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col gap-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2 font-bold text-base">
              <Trophy className="w-4 h-4 text-amber-400" /> Leaderboard
            </div>
            <button
              onClick={triggerWinnerCelebration}
              className="text-xs text-slate-400 hover:text-amber-400 transition"
            >
              🎉 Confetti
            </button>
          </div>

          <div className="space-y-2 flex-1 overflow-y-auto">
            {[...teams]
              .sort((a, b) => b.score - a.score)
              .map((team, rank) => {
                const isEditing = editingTeamId === team.id;

                return (
                  <div
                    key={team.id}
                    className="flex items-center justify-between p-3 rounded-xl bg-slate-950/70 border border-slate-800/80 hover:border-slate-700 transition"
                  >
                    <div className="flex items-center gap-3">
                      <span className={`w-6 text-xs font-bold font-mono ${
                        rank === 0 ? 'text-amber-400' : rank === 1 ? 'text-slate-300' : rank === 2 ? 'text-amber-600' : 'text-slate-600'
                      }`}>
                        #{rank + 1}
                      </span>
                      <input
                        type="text"
                        value={team.name}
                        onChange={(e) => updateTeamName(team.id, e.target.value)}
                        className="bg-transparent font-medium text-sm text-slate-200 focus:outline-none focus:border-b border-indigo-500 w-28 sm:w-32"
                      />
                    </div>

                    <div className="flex items-center gap-2">
                      {isEditing ? (
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            value={tempEditScore}
                            onChange={(e) => setTempEditScore(e.target.value)}
                            className="w-14 px-1.5 py-0.5 bg-slate-800 border border-indigo-500 rounded text-center text-sm font-mono"
                            autoFocus
                          />
                          <button
                            onClick={() => {
                              const val = parseInt(tempEditScore, 10);
                              if (!isNaN(val)) manualAdjustScore(team.id, val - team.score);
                              setEditingTeamId(null);
                            }}
                            className="px-2 py-0.5 bg-indigo-600 rounded text-xs"
                          >
                            Save
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            setEditingTeamId(team.id);
                            setTempEditScore(team.score.toString());
                          }}
                          className={`font-mono font-bold text-base px-2.5 py-0.5 rounded cursor-pointer transition ${
                            team.score > 0 ? 'text-emerald-400 hover:bg-emerald-500/10' : team.score < 0 ? 'text-rose-400 hover:bg-rose-500/10' : 'text-slate-400 hover:bg-slate-800'
                          }`}
                          title="Click to edit score directly"
                        >
                          {team.score}
                        </button>
                      )}

                      {/* Micro Quick Adjust Buttons */}
                      <div className="flex flex-col gap-0.5">
                        <button
                          onClick={() => manualAdjustScore(team.id, 5)}
                          className="p-0.5 text-slate-500 hover:text-emerald-400 hover:bg-slate-800 rounded"
                          title="+5 Manual"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => manualAdjustScore(team.id, -5)}
                          className="p-0.5 text-slate-500 hover:text-rose-400 hover:bg-slate-800 rounded"
                          title="-5 Manual"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      </main>

      {/* Special Round Drawer / Modal */}
      {isSpecialRoundOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-400" />
                <h3 className="font-bold text-lg">Special Round Batch Scorer</h3>
              </div>
              <button
                onClick={() => setIsSpecialRoundOpen(false)}
                className="text-slate-500 hover:text-slate-300 text-sm"
              >
                Close
              </button>
            </div>

            <p className="text-slate-400 text-xs">
              Directly input points to be added (+) or deducted (-) for each team for this special round without advancing question rounds.
            </p>

            <div className="grid grid-cols-2 gap-3 max-h-60 overflow-y-auto pr-1">
              {teams.map((t) => (
                <div key={t.id} className="flex items-center justify-between bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                  <span className="text-xs font-medium text-slate-300 truncate w-24">{t.name}</span>
                  <input
                    type="number"
                    placeholder="+/- pts"
                    value={specialScores[t.id] ?? ''}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10);
                      setSpecialScores((prev) => ({
                        ...prev,
                        [t.id]: isNaN(val) ? 0 : val,
                      }));
                    }}
                    className="w-20 px-2 py-1 bg-slate-900 border border-slate-700 rounded text-center text-xs font-mono text-white focus:outline-none focus:border-purple-500"
                  />
                </div>
              ))}
            </div>

            <div className="flex gap-2 pt-2 border-t border-slate-800">
              <button
                onClick={() => setIsSpecialRoundOpen(false)}
                className="flex-1 bg-slate-800 hover:bg-slate-700 font-semibold py-2.5 rounded-xl text-sm transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSpecialSubmit}
                className="flex-1 bg-purple-600 hover:bg-purple-500 text-white font-semibold py-2.5 rounded-xl text-sm shadow-lg shadow-purple-600/30 transition"
              >
                Apply Special Scores
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}