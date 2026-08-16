import React, { useEffect, useState } from 'react';
import { useQuizStore } from './store';
import { 
  Play, Pause, FastForward, RotateCcw, ArrowRight, 
  CheckCircle, XCircle, Plus, Minus, Trophy, Sparkles, ChevronDown, ChevronUp, Edit2, ExternalLink
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
    bounceAwardedTeams,
    setTeamCount,
    updateTeamName,
    manualAdjustScore,
    startQuestion,
    tickTimer,
    toggleTimer,
    togglePounce,
    skipToBounce,
    toggleBounceSelection,
    confirmBounceAndReviewPounce,
    setPounceResult,
    finalizeQuestion,
    nextQuestion,
    applySpecialRoundScores,
    resetQuiz
  } = useQuizStore();

  // Local UI State
  const [showLeaderboard, setShowLeaderboard] = useState(true);
  const [isSpecialRoundOpen, setIsSpecialRoundOpen] = useState(false);
  const [specialScores, setSpecialScores] = useState<Record<number, number>>({});
  const [editingTeamId, setEditingTeamId] = useState<number | null>(null);

  // Timer Tick
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

  const handleSpecialSubmit = () => {
    applySpecialRoundScores(specialScores);
    setSpecialScores({});
    setIsSpecialRoundOpen(false);
    confetti({ particleCount: 50, spread: 60, origin: { y: 0.6 } });
  };

  const getSplitPointsLabel = () => {
    if (bounceAwardedTeams.length === 1) return '+10 pts to 1 Team';
    if (bounceAwardedTeams.length === 2) return '+5 pts each (2 Teams)';
    if (bounceAwardedTeams.length === 3) return '+3.3 pts each (3 Teams)';
    return 'Select team(s)';
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex p-6 gap-6 font-sans select-none">
      
      {/* LEFT / CENTER: Dynamic Main Quiz Area */}
      <div className="flex-1 flex flex-col gap-6">
        
        {/* PHASE 1: IDLE / POUNCING */}
        {(phase === 'IDLE' || phase === 'POUNCING') && (
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-2xl flex-1 flex flex-col gap-6">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs uppercase font-bold tracking-widest text-indigo-400">Pounce Window</span>
                <h1 className="text-2xl font-black mt-0.5">
                  {phase === 'IDLE' ? 'Ready to Start Question' : '⚡ 30s Pounce Timer Running'}
                </h1>
              </div>

              {/* 30s Timer Display */}
              <div className={`px-6 py-2 rounded-2xl border text-4xl font-black font-mono tracking-tighter ${
                timerSeconds <= 5 
                  ? 'bg-rose-950/80 border-rose-500 text-rose-400 animate-pulse' 
                  : 'bg-slate-950 border-slate-800 text-indigo-400'
              }`}>
                {timerSeconds}s
              </div>
            </div>

            {/* Timer Buttons */}
            <div className="flex gap-3">
              {phase === 'IDLE' ? (
                <button
                  onClick={startQuestion}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-500 font-bold py-3.5 px-6 rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30 transition text-base"
                >
                  <Play className="w-5 h-5 fill-current" /> Start 30s Pounce Timer (Space)
                </button>
              ) : (
                <>
                  <button
                    onClick={toggleTimer}
                    className="flex-1 bg-slate-800 hover:bg-slate-700 font-bold py-3.5 px-6 rounded-2xl flex items-center justify-center gap-2 border border-slate-700 transition"
                  >
                    {isTimerRunning ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                    {isTimerRunning ? 'Pause' : 'Resume'}
                  </button>
                  <button
                    onClick={skipToBounce}
                    className="bg-amber-600 hover:bg-amber-500 text-white font-bold py-3.5 px-8 rounded-2xl flex items-center justify-center gap-2 transition"
                  >
                    <FastForward className="w-5 h-5" /> Go to Bounce
                  </button>
                </>
              )}
            </div>

            {/* Team Grid with In-Card Scores and Editing */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 flex-1">
              {teams.map((team, idx) => {
                const isDirect = idx === directTeamIndex;
                const isPounced = !!pounces[team.id];

                return (
                  <div
                    key={team.id}
                    onClick={() => phase === 'POUNCING' && togglePounce(team.id)}
                    className={`relative p-5 rounded-2xl border flex flex-col justify-between transition-all ${
                      isPounced
                        ? 'bg-rose-950/40 border-rose-500 shadow-lg shadow-rose-950'
                        : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                    } ${phase === 'POUNCING' ? 'cursor-pointer active:scale-95' : ''}`}
                  >
                    {/* Header: Key and Direct Badge */}
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono font-bold text-slate-500">[{idx + 1}]</span>
                      {isDirect && (
                        <span className="px-2 py-0.5 bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-bold rounded">
                          DIRECT
                        </span>
                      )}
                    </div>

                    {/* Team Name / Edit */}
                    <div className="my-2" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="text"
                        value={team.name}
                        onChange={(e) => updateTeamName(team.id, e.target.value)}
                        className="bg-transparent font-bold text-base text-slate-100 focus:outline-none focus:border-b border-indigo-500 w-full"
                      />
                    </div>

                    {/* Points & Pounce Tag */}
                    <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
                      <span className={`text-2xl font-black font-mono ${
                        team.score > 0 ? 'text-emerald-400' : team.score < 0 ? 'text-rose-400' : 'text-slate-400'
                      }`}>
                        {team.score} pts
                      </span>
                      <span className={`text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                        isPounced ? 'bg-rose-500 text-white' : 'bg-slate-800 text-slate-400'
                      }`}>
                        {isPounced ? 'Pounced' : '---'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* PHASE 2: BOUNCE (Pounced Teams Greyed Out, Multi-select for Splits) */}
        {phase === 'BOUNCING' && (
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-2xl flex-1 flex flex-col gap-6">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs uppercase font-bold tracking-widest text-amber-400">Bounce Turn</span>
                <h1 className="text-2xl font-black mt-0.5">Select Team(s) for Bounce Points</h1>
                <p className="text-slate-400 text-xs mt-1">
                  Pounced teams are greyed out. Select 1 team for +10, or 2–3 teams to split. Pounce results remain hidden.
                </p>
              </div>

              {bounceAwardedTeams.length > 0 && (
                <div className="bg-purple-950/60 border border-purple-500/40 text-purple-300 font-bold px-4 py-2 rounded-xl text-sm">
                  {getSplitPointsLabel()}
                </div>
              )}
            </div>

            {/* Grid of Teams (Pounced Greyed Out) */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 flex-1">
              {teams.map((team, idx) => {
                const isDirect = idx === directTeamIndex;
                const isPounced = !!pounces[team.id];
                const isSelectedForBounce = bounceAwardedTeams.includes(team.id);

                return (
                  <button
                    key={team.id}
                    disabled={isPounced}
                    onClick={() => toggleBounceSelection(team.id)}
                    className={`relative p-5 rounded-2xl border text-left flex flex-col justify-between transition-all ${
                      isPounced
                        ? 'bg-slate-950/40 border-slate-900 text-slate-600 opacity-40 cursor-not-allowed'
                        : isSelectedForBounce
                        ? 'bg-purple-600/30 border-purple-500 text-white ring-2 ring-purple-500/50 shadow-lg'
                        : 'bg-slate-950 border-slate-800 hover:border-slate-600 text-slate-200 cursor-pointer'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono font-bold text-slate-500">[{idx + 1}]</span>
                      {isDirect && (
                        <span className="px-2 py-0.5 bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-bold rounded">
                          DIRECT
                        </span>
                      )}
                    </div>

                    <div className="font-bold text-base my-2">{team.name}</div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
                      <span className="text-xl font-mono font-black">{team.score} pts</span>
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                        isPounced
                          ? 'bg-slate-800 text-slate-500'
                          : isSelectedForBounce
                          ? 'bg-purple-500 text-white'
                          : 'bg-slate-800 text-slate-400'
                      }`}>
                        {isPounced ? 'Pounced' : isSelectedForBounce ? 'Selected' : 'Eligible'}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Confirm Bounce & Move to Pounce Evaluation */}
            <div className="flex gap-3">
              <button
                onClick={confirmBounceAndReviewPounce}
                className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3.5 px-6 rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 transition"
              >
                {bounceAwardedTeams.length === 0
                  ? 'Pass All (0 Bounce pts) & Reveal Pounces'
                  : `Award Bounce (${getSplitPointsLabel()}) & Reveal Pounces`}
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        {/* PHASE 3: POUNCE EVALUATION (Post-Bounce Secret Reveal) */}
        {phase === 'POUNCE_REVIEW' && (
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-2xl flex-1 flex flex-col gap-6">
            <div>
              <span className="text-xs uppercase font-bold tracking-widest text-rose-400">Post-Bounce Reveal</span>
              <h1 className="text-2xl font-black mt-0.5">Evaluate Hidden Pounce Submissions</h1>
              <p className="text-slate-400 text-xs mt-1">Bounce round has ended. Now grade the pounce slips submitted earlier.</p>
            </div>

            <div className="space-y-3 flex-1 overflow-y-auto">
              {Object.keys(pounces).map((idStr) => {
                const id = Number(idStr);
                const team = teams.find((t) => t.id === id);
                if (!team) return null;
                const status = pounces[id];

                return (
                  <div key={id} className="flex items-center justify-between bg-slate-950 p-4 rounded-2xl border border-slate-800">
                    <div>
                      <div className="font-bold text-slate-100 text-lg">{team.name}</div>
                      <span className="text-xs text-slate-500">Current Score: {team.score} pts</span>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => setPounceResult(id, 'correct')}
                        className={`px-5 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 border transition ${
                          status === 'correct'
                            ? 'bg-emerald-600 text-white border-emerald-500 shadow-md'
                            : 'bg-slate-900 border-slate-700 text-emerald-400 hover:bg-slate-800'
                        }`}
                      >
                        <CheckCircle className="w-4 h-4" /> +15 (Correct)
                      </button>
                      <button
                        onClick={() => setPounceResult(id, 'incorrect')}
                        className={`px-5 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 border transition ${
                          status === 'incorrect'
                            ? 'bg-rose-600 text-white border-rose-500 shadow-md'
                            : 'bg-slate-900 border-slate-700 text-rose-400 hover:bg-slate-800'
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
              onClick={finalizeQuestion}
              className="w-full bg-indigo-600 hover:bg-indigo-500 font-bold py-3.5 rounded-2xl flex items-center justify-center gap-2 shadow-lg transition"
            >
              Apply Pounce Scores & Complete Question <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* PHASE 4: QUESTION END */}
        {phase === 'QUESTION_END' && (
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-8 shadow-2xl flex flex-col items-center justify-center gap-4 text-center flex-1">
            <CheckCircle className="w-14 h-14 text-emerald-400" />
            <h2 className="text-3xl font-black">Question {questionNumber} Completed</h2>
            <p className="text-slate-400 text-sm max-w-sm">
              All pounce and bounce points have been logged into the scores. Ready to advance the clockwise direct turn.
            </p>
            <button
              onClick={nextQuestion}
              className="bg-indigo-600 hover:bg-indigo-500 font-bold py-4 px-10 rounded-2xl flex items-center gap-2 shadow-lg shadow-indigo-600/30 transition text-base mt-2"
            >
              Next Question <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>

      {/* RIGHT SIDEBAR: Unified Settings, Direct Info & Collapsible Leaderboard */}
      <div className="w-80 flex flex-col gap-4">
        
        {/* Settings & Info Card */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-400 block">Round Control</span>
              <div className="text-lg font-black text-white">Q{questionNumber} Direct: <span className="text-amber-400">{teams[directTeamIndex]?.name}</span></div>
            </div>
            <button
              onClick={resetQuiz}
              className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition"
              title="Reset Quiz"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>

          {/* Teams count */}
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Total Teams</span>
            <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
              {[8, 9, 10].map((cnt) => (
                <button
                  key={cnt}
                  onClick={() => setTeamCount(cnt)}
                  className={`px-2.5 py-1 rounded-lg font-bold transition ${
                    teams.length === cnt ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {cnt}
                </button>
              ))}
            </div>
          </div>

          {/* Special Round & Projector Actions */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              onClick={() => setIsSpecialRoundOpen(true)}
              className="flex items-center justify-center gap-1.5 bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/30 py-2 rounded-xl text-xs font-bold transition"
            >
              <Sparkles className="w-3.5 h-3.5" /> Special Round
            </button>
            <button
              onClick={() => window.open(`${window.location.origin}?display=projector`, '_blank', 'width=1280,height=720')}
              className="flex items-center justify-center gap-1.5 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 py-2 rounded-xl text-xs font-bold transition"
            >
              <ExternalLink className="w-3.5 h-3.5" /> Projector
            </button>
          </div>
        </div>

        {/* Collapsible Leaderboard Card */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 shadow-xl flex-1 flex flex-col">
          <div 
            onClick={() => setShowLeaderboard(!showLeaderboard)}
            className="flex items-center justify-between cursor-pointer border-b border-slate-800/80 pb-3"
          >
            <div className="flex items-center gap-2 font-bold text-sm text-slate-200">
              <Trophy className="w-4 h-4 text-amber-400" /> Leaderboard
            </div>
            {showLeaderboard ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
          </div>

          {showLeaderboard && (
            <div className="space-y-2 mt-3 flex-1 overflow-y-auto max-h-[480px]">
              {[...teams]
                .sort((a, b) => b.score - a.score)
                .map((team, rank) => (
                  <div
                    key={team.id}
                    className="flex items-center justify-between p-3 rounded-2xl bg-slate-950 border border-slate-800/80 text-xs"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className={`font-mono font-bold ${
                        rank === 0 ? 'text-amber-400' : rank === 1 ? 'text-slate-300' : rank === 2 ? 'text-amber-600' : 'text-slate-600'
                      }`}>
                        #{rank + 1}
                      </span>
                      <span className="font-bold text-slate-200 truncate w-24">{team.name}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className={`font-mono font-black text-sm ${
                        team.score > 0 ? 'text-emerald-400' : team.score < 0 ? 'text-rose-400' : 'text-slate-400'
                      }`}>
                        {team.score}
                      </span>
                      <div className="flex flex-col gap-0.5">
                        <button
                          onClick={() => manualAdjustScore(team.id, 5)}
                          className="p-0.5 text-slate-500 hover:text-emerald-400 hover:bg-slate-800 rounded"
                          title="+5 Manual"
                        >
                          <Plus className="w-2.5 h-2.5" />
                        </button>
                        <button
                          onClick={() => manualAdjustScore(team.id, -5)}
                          className="p-0.5 text-slate-500 hover:text-rose-400 hover:bg-slate-800 rounded"
                          title="-5 Manual"
                        >
                          <Minus className="w-2.5 h-2.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>

      {/* Special Round Drawer / Modal */}
      {isSpecialRoundOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-3xl p-6 shadow-2xl space-y-4">
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
              Add (+) or deduct (-) arbitrary score totals per team without changing the direct question sequence.
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