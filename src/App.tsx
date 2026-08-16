import { useEffect, useState, useMemo } from 'react';
import { useQuizStore } from './store';
import { 
  Play, Pause, FastForward, RotateCcw, RotateCw, ArrowRight, 
  CheckCircle, XCircle, Plus, Minus, Trophy, Sparkles, 
  Menu, X, History, ExternalLink, Download 
} from 'lucide-react';
import confetti from 'canvas-confetti';

export default function App() {
  const {
    teams,
    questionNumber,
    roundNumber,
    roundName,
    bounceDirection,
    directTeamIndex,
    phase,
    timerSeconds,
    isTimerRunning,
    pounces,
    bounceCustomPoints,
    historyLog,
    setTeamCount,
    switchRound,
    updateTeamName,
    manualAdjustScore,
    startQuestion,
    tickTimer,
    toggleTimer,
    togglePounce,
    skipToBounce,
    toggleBounceSelection,
    setBouncePointsForTeam,
    confirmBounceAndReviewPounce,
    setPounceResult,
    togglePounceReviewKey,
    finalizeQuestion,
    nextQuestion,
    applySpecialRoundScores,
    resetQuiz
  } = useQuizStore();

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isSpecialRoundOpen, setIsSpecialRoundOpen] = useState(false);
  const [specialTitle, setSpecialTitle] = useState('Special Round');
  const [specialScores, setSpecialScores] = useState<Record<number, number>>({});

  // Global Timer Interval
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    if (isTimerRunning) {
      interval = setInterval(() => {
        tickTimer();
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isTimerRunning, tickTimer]);

  // Comprehensive Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept when user is actively typing in text/number inputs
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      // Space: Start/Pause Timer
      if (e.code === 'Space') {
        e.preventDefault();
        if (phase === 'IDLE') startQuestion();
        else if (phase === 'POUNCING') toggleTimer();
        return;
      }

      // Enter: Advance Workflow
      if (e.code === 'Enter') {
        e.preventDefault();
        if (phase === 'POUNCING') {
          skipToBounce();
        } else if (phase === 'BOUNCING') {
          confirmBounceAndReviewPounce();
        } else if (phase === 'POUNCE_REVIEW') {
          finalizeQuestion();
        } else if (phase === 'QUESTION_END') {
          nextQuestion();
        }
        return;
      }

      // Number keys 1-9 (and 0 for Team 10)
      let keyNum = parseInt(e.key, 10);
      if (e.key === '0' && teams.length >= 10) keyNum = 10;

      if (!isNaN(keyNum) && keyNum >= 1 && keyNum <= teams.length) {
        const teamId = teams[keyNum - 1].id;

        if (phase === 'POUNCING') {
          togglePounce(teamId);
        } else if (phase === 'BOUNCING') {
          toggleBounceSelection(teamId);
        } else if (phase === 'POUNCE_REVIEW') {
          togglePounceReviewKey(teamId);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    phase, 
    teams, 
    togglePounce, 
    toggleTimer, 
    startQuestion, 
    skipToBounce, 
    confirmBounceAndReviewPounce, 
    toggleBounceSelection, 
    togglePounceReviewKey, 
    finalizeQuestion, 
    nextQuestion
  ]);

  // Snake Grid Layout
  const snakeGridTeams = useMemo(() => {
    const half = Math.ceil(teams.length / 2);
    const topRow = teams.slice(0, half);
    const bottomRow = teams.slice(half).reverse();
    return [...topRow, ...bottomRow];
  }, [teams]);

  // Export History as CSV
  const exportHistoryCSV = () => {
    if (historyLog.length === 0) return;
    const headers = ['Type', 'Question/Round', 'Direction', 'Direct Team', 'Bounce Award', 'Pounce Slips', 'Special Round Breakdown', 'Time'];
    const rows = historyLog.map(h => {
      if (h.type === 'special_round') {
        return [
          'Special Round',
          `"${h.roundName}"`,
          '-',
          '-',
          '-',
          '-',
          `"${h.specialRoundResults ? h.specialRoundResults.map(s => `${s.teamName}: ${s.points > 0 ? `+${s.points}` : s.points}`).join('; ') : '-'}"`,
          h.timestamp
        ];
      }
      return [
        'Question',
        `"${h.roundName} Q${h.questionNumber}"`,
        h.direction || 'clockwise',
        `"${h.directTeamName}"`,
        `"${h.bounceResult ? h.bounceResult.map(b => `${b.teamName} (+${b.points})`).join('; ') : 'Pass'}"`,
        `"${h.pounceResults ? h.pounceResults.map(p => `${p.teamName}: ${p.points > 0 ? `+${p.points}` : p.points}`).join('; ') : 'None'}"`,
        '-',
        h.timestamp
      ];
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `quiz_history_round${roundNumber}_q${questionNumber}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSpecialSubmit = () => {
    applySpecialRoundScores(specialScores, specialTitle.trim() || 'Special Round');
    setSpecialScores({});
    setIsSpecialRoundOpen(false);
    confetti({ particleCount: 60, spread: 70, origin: { y: 0.6 } });
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans select-none overflow-x-hidden">
      
      {/* Top Header */}
      <header className="flex items-center justify-between px-6 py-4 z-20">
        <div className="flex items-center gap-3">
          <span className="text-xs uppercase font-extrabold tracking-widest bg-indigo-950/80 border border-indigo-500/30 text-indigo-400 px-3 py-1.5 rounded-xl">
            {roundName} • Q{questionNumber}
          </span>
          <span className="text-xs font-semibold text-slate-400">
            Direct: <strong className="text-amber-400 font-bold">{teams[directTeamIndex]?.name}</strong>
          </span>
          <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-slate-900 border border-slate-800 text-slate-400 flex items-center gap-1">
            {bounceDirection === 'clockwise' ? '🔄 Clockwise' : '🔁 Anti-Clockwise'}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsHistoryOpen(true)}
            className="flex items-center gap-1.5 bg-slate-900/80 hover:bg-slate-800 text-slate-300 border border-slate-800 px-3.5 py-2 rounded-xl text-xs font-bold transition shadow-sm"
          >
            <History className="w-4 h-4 text-indigo-400" /> History
          </button>
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className={`p-2 rounded-xl border transition ${
              isSidebarOpen 
                ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg' 
                : 'bg-slate-900/80 border-slate-800 text-slate-300 hover:bg-slate-800'
            }`}
            title="Menu & Settings"
          >
            {isSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </header>

      {/* Main Screen */}
      <main className="flex-1 flex flex-col p-6 max-w-7xl mx-auto w-full gap-6">
        
        {/* PHASE 1: IDLE / POUNCING */}
        {(phase === 'IDLE' || phase === 'POUNCING') && (
          <div className="bg-slate-900/70 border border-slate-800/80 rounded-3xl p-6 md:p-8 shadow-2xl flex-1 flex flex-col gap-6 backdrop-blur">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs uppercase font-bold tracking-widest text-indigo-400">Pounce Window</span>
                <h1 className="text-2xl md:text-3xl font-black mt-0.5">
                  {phase === 'IDLE' ? 'Ready for Question' : '⚡ 30s Pounce Timer Running'}
                </h1>
                <p className="text-slate-400 text-xs mt-1">
                  Press <kbd className="px-1.5 py-0.5 bg-slate-800 rounded font-mono text-[10px]">1</kbd>–<kbd className="px-1.5 py-0.5 bg-slate-800 rounded font-mono text-[10px]">8</kbd> to toggle pounce slips • Press <kbd className="px-1.5 py-0.5 bg-slate-800 rounded font-mono text-[10px]">Enter</kbd> to jump to Bounce.
                </p>
              </div>

              <div className={`px-6 py-2 rounded-2xl border text-4xl font-black font-mono tracking-tighter ${
                timerSeconds <= 5 
                  ? 'bg-rose-950/80 border-rose-500 text-rose-400 animate-pulse' 
                  : 'bg-slate-950 border-slate-800 text-indigo-400'
              }`}>
                {timerSeconds}s
              </div>
            </div>

            {/* Timer Actions */}
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
                    {isTimerRunning ? 'Pause (Space)' : 'Resume (Space)'}
                  </button>
                  <button
                    onClick={skipToBounce}
                    className="bg-amber-600 hover:bg-amber-500 text-white font-bold py-3.5 px-8 rounded-2xl flex items-center justify-center gap-2 transition"
                  >
                    <FastForward className="w-5 h-5" /> Go to Bounce (Enter)
                  </button>
                </>
              )}
            </div>

            {/* Snake Seating Grid (Top: 1->4, Bottom: 8<-5) */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 flex-1">
              {snakeGridTeams.map((team) => {
                const isDirect = team.id - 1 === directTeamIndex;
                const isPounced = !!pounces[team.id];

                return (
                  <div
                    key={team.id}
                    onClick={() => phase === 'POUNCING' && togglePounce(team.id)}
                    className={`relative p-5 rounded-2xl border flex flex-col justify-between transition-all ${
                      isPounced
                        ? 'bg-rose-950/40 border-rose-500 shadow-lg shadow-rose-950 ring-1 ring-rose-500/50'
                        : 'bg-slate-950/80 border-slate-800 hover:border-slate-700'
                    } ${phase === 'POUNCING' ? 'cursor-pointer active:scale-95' : ''}`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono font-bold text-slate-500">[{team.id}]</span>
                      {isDirect && (
                        <span className="px-2 py-0.5 bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-bold rounded">
                          DIRECT
                        </span>
                      )}
                    </div>

                    <div className="my-2" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="text"
                        value={team.name}
                        onChange={(e) => updateTeamName(team.id, e.target.value)}
                        className="bg-transparent font-bold text-base text-slate-100 focus:outline-none focus:border-b border-indigo-500 w-full"
                      />
                    </div>

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

        {/* PHASE 2: BOUNCE */}
        {phase === 'BOUNCING' && (
          <div className="bg-slate-900/70 border border-slate-800/80 rounded-3xl p-6 md:p-8 shadow-2xl flex-1 flex flex-col gap-6 backdrop-blur">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs uppercase font-bold tracking-widest text-amber-400">Bounce Turn</span>
                <h1 className="text-2xl md:text-3xl font-black mt-0.5">Select & Customize Bounce Points</h1>
                <p className="text-slate-400 text-xs mt-1">
                  Press team numbers <kbd className="px-1.5 py-0.5 bg-slate-800 rounded font-mono text-[10px]">1</kbd>–<kbd className="px-1.5 py-0.5 bg-slate-800 rounded font-mono text-[10px]">8</kbd> to select • Press <kbd className="px-1.5 py-0.5 bg-slate-800 rounded font-mono text-[10px]">Enter</kbd> to confirm and reveal pounces.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 flex-1">
              {snakeGridTeams.map((team) => {
                const isDirect = team.id - 1 === directTeamIndex;
                const isPounced = !!pounces[team.id];
                const isSelected = bounceCustomPoints[team.id] !== undefined;

                return (
                  <div
                    key={team.id}
                    onClick={() => !isPounced && toggleBounceSelection(team.id)}
                    className={`relative p-5 rounded-2xl border text-left flex flex-col justify-between transition-all ${
                      isPounced
                        ? 'bg-slate-950/40 border-slate-900 text-slate-600 opacity-40 cursor-not-allowed'
                        : isSelected
                        ? 'bg-purple-950/50 border-purple-500 text-white ring-2 ring-purple-500/50 shadow-lg'
                        : 'bg-slate-950/80 border-slate-800 hover:border-slate-600 text-slate-200 cursor-pointer'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono font-bold text-slate-500">[{team.id}]</span>
                      {isDirect && (
                        <span className="px-2 py-0.5 bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-bold rounded">
                          DIRECT
                        </span>
                      )}
                    </div>

                    <div className="font-bold text-base my-2">{team.name}</div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-800/80" onClick={(e) => e.stopPropagation()}>
                      {isSelected ? (
                        <div className="flex items-center gap-1">
                          <span className="text-xs text-purple-300 font-bold">+</span>
                          <input
                            type="number"
                            step="0.5"
                            value={bounceCustomPoints[team.id]}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value);
                              setBouncePointsForTeam(team.id, isNaN(val) ? 0 : val);
                            }}
                            className="w-16 px-2 py-1 bg-purple-900/60 border border-purple-400 rounded-lg text-sm font-mono font-bold text-white text-center focus:outline-none"
                          />
                          <span className="text-xs text-purple-300">pts</span>
                        </div>
                      ) : (
                        <span className="text-xl font-mono font-black">{team.score} pts</span>
                      )}

                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                        isPounced
                          ? 'bg-slate-800 text-slate-500'
                          : isSelected
                          ? 'bg-purple-500 text-white'
                          : 'bg-slate-800 text-slate-400'
                      }`}>
                        {isPounced ? 'Pounced' : isSelected ? 'Awarding' : 'Pass'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            <button
              onClick={confirmBounceAndReviewPounce}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3.5 px-6 rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 transition text-base"
            >
              {Object.keys(bounceCustomPoints).length === 0
                ? 'Pass All (0 Bounce pts) & Reveal Pounces (Enter)'
                : `Commit Bounce Points & Reveal Pounces (Enter)`}
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* PHASE 3: POUNCE REVIEW */}
        {phase === 'POUNCE_REVIEW' && (
          <div className="bg-slate-900/70 border border-slate-800/80 rounded-3xl p-6 md:p-8 shadow-2xl flex-1 flex flex-col gap-6 backdrop-blur">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs uppercase font-bold tracking-widest text-rose-400">Post-Bounce Reveal</span>
                <h1 className="text-2xl md:text-3xl font-black mt-0.5">Evaluate Hidden Pounce Submissions</h1>
                <p className="text-slate-400 text-xs mt-1">
                  Press team numbers <kbd className="px-1.5 py-0.5 bg-slate-800 rounded font-mono text-[10px]">1</kbd>–<kbd className="px-1.5 py-0.5 bg-slate-800 rounded font-mono text-[10px]">8</kbd> to toggle (+15 / -10) • Press <kbd className="px-1.5 py-0.5 bg-slate-800 rounded font-mono text-[10px]">Enter</kbd> to commit scores.
                </p>
              </div>
            </div>

            <div className="space-y-3 flex-1 overflow-y-auto">
              {Object.keys(pounces).map((idStr) => {
                const id = Number(idStr);
                const team = teams.find((t) => t.id === id);
                if (!team) return null;
                const status = pounces[id];

                return (
                  <div key={id} className="flex items-center justify-between bg-slate-950 p-4 rounded-2xl border border-slate-800">
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-mono font-bold text-slate-500 bg-slate-900 px-2 py-1 rounded">[{id}]</span>
                      <div>
                        <div className="font-bold text-slate-100 text-lg">{team.name}</div>
                        <span className="text-xs text-slate-500">Current Score: {team.score} pts</span>
                      </div>
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
              Apply Pounce Scores & Complete Question (Enter) <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* PHASE 4: QUESTION END */}
        {phase === 'QUESTION_END' && (
          <div className="bg-slate-900/70 border border-slate-800/80 rounded-3xl p-8 shadow-2xl flex flex-col items-center justify-center gap-4 text-center flex-1 backdrop-blur">
            <CheckCircle className="w-14 h-14 text-emerald-400" />
            <h2 className="text-3xl font-black">Question {questionNumber} Completed</h2>
            <p className="text-slate-400 text-sm max-w-sm">
              Scores committed. Press <kbd className="px-2 py-1 bg-slate-800 rounded font-mono text-xs text-indigo-300">Enter</kbd> to advance the direct turn {bounceDirection === 'clockwise' ? 'clockwise' : 'anti-clockwise'}.
            </p>
            <button
              onClick={nextQuestion}
              className="bg-indigo-600 hover:bg-indigo-500 font-bold py-4 px-10 rounded-2xl flex items-center gap-2 shadow-lg shadow-indigo-600/30 transition text-base mt-2"
            >
              Next Question (Enter) <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        )}
      </main>

      {/* Side Menu Drawer */}
      {isSidebarOpen && (
        <div className="fixed inset-0 z-40 flex justify-end">
          <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={() => setIsSidebarOpen(false)} />

          <div className="relative w-full max-w-sm bg-slate-900 border-l border-slate-800 h-full p-6 shadow-2xl flex flex-col gap-5 z-50 overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2 font-black text-lg">
                <Trophy className="w-5 h-5 text-amber-400" /> Settings & Rounds
              </div>
              <button onClick={() => setIsSidebarOpen(false)} className="p-1.5 text-slate-400 hover:text-white rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Round 1 vs Round 2 Presets */}
            <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 space-y-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">Switch Round</span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => switchRound(1)}
                  className={`py-2.5 px-3 rounded-xl text-xs font-bold transition flex flex-col items-center gap-1 border ${
                    roundNumber === 1
                      ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-850'
                  }`}
                >
                  <div className="flex items-center gap-1">
                    <RotateCw className="w-3.5 h-3.5" /> Round 1
                  </div>
                  <span className="text-[10px] opacity-75 font-normal">Q1 • Team 1 • Clockwise</span>
                </button>

                <button
                  onClick={() => switchRound(2)}
                  className={`py-2.5 px-3 rounded-xl text-xs font-bold transition flex flex-col items-center gap-1 border ${
                    roundNumber === 2
                      ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-850'
                  }`}
                >
                  <div className="flex items-center gap-1">
                    <RotateCcw className="w-3.5 h-3.5" /> Round 2
                  </div>
                  <span className="text-[10px] opacity-75 font-normal">Q1 • Team {teams.length} • Reverse</span>
                </button>
              </div>
            </div>

            {/* Total Teams Settings */}
            <div className="flex items-center justify-between bg-slate-950 p-3 rounded-2xl border border-slate-800">
              <span className="text-xs font-semibold text-slate-400">Total Teams</span>
              <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs">
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

            {/* Quick Actions */}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => {
                  setIsSidebarOpen(false);
                  setIsSpecialRoundOpen(true);
                }}
                className="flex items-center justify-center gap-1.5 bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/30 py-2.5 rounded-xl text-xs font-bold transition"
              >
                <Sparkles className="w-3.5 h-3.5" /> Special Round
              </button>
              <button
                onClick={() => window.open(`${window.location.origin}?display=projector`, '_blank', 'width=1280,height=720')}
                className="flex items-center justify-center gap-1.5 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 py-2.5 rounded-xl text-xs font-bold transition"
              >
                <ExternalLink className="w-3.5 h-3.5" /> Projector
              </button>
            </div>

            {/* Live Standings */}
            <div className="flex-1 space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-2">Live Standings</span>
              {[...teams]
                .sort((a, b) => b.score - a.score)
                .map((team, rank) => (
                  <div key={team.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs">
                    <div className="flex items-center gap-2.5">
                      <span className={`font-mono font-bold ${
                        rank === 0 ? 'text-amber-400' : rank === 1 ? 'text-slate-300' : rank === 2 ? 'text-amber-600' : 'text-slate-600'
                      }`}>
                        #{rank + 1}
                      </span>
                      <span className="font-bold text-slate-200 truncate w-28">{team.name}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className={`font-mono font-black text-sm ${
                        team.score > 0 ? 'text-emerald-400' : team.score < 0 ? 'text-rose-400' : 'text-slate-400'
                      }`}>
                        {team.score}
                      </span>
                      <div className="flex flex-col gap-0.5">
                        <button onClick={() => manualAdjustScore(team.id, 5)} className="p-0.5 text-slate-500 hover:text-emerald-400 hover:bg-slate-800 rounded">
                          <Plus className="w-2.5 h-2.5" />
                        </button>
                        <button onClick={() => manualAdjustScore(team.id, -5)} className="p-0.5 text-slate-500 hover:text-rose-400 hover:bg-slate-800 rounded">
                          <Minus className="w-2.5 h-2.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
            </div>

            <button
              onClick={resetQuiz}
              className="w-full flex items-center justify-center gap-2 bg-rose-600/10 hover:bg-rose-600/20 text-rose-400 border border-rose-500/20 py-2.5 rounded-xl text-xs font-bold transition mt-auto"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Reset Complete Quiz
            </button>
          </div>
        </div>
      )}

      {/* History Log Modal with Questions & Special Rounds */}
      {isHistoryOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-2xl rounded-3xl p-6 shadow-2xl space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <History className="w-5 h-5 text-indigo-400" />
                <h3 className="font-bold text-lg">Scoring History Log</h3>
              </div>
              <div className="flex items-center gap-2">
                {historyLog.length > 0 && (
                  <button
                    onClick={exportHistoryCSV}
                    className="flex items-center gap-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 px-3 py-1.5 rounded-xl text-xs font-bold transition"
                  >
                    <Download className="w-3.5 h-3.5" /> Export CSV
                  </button>
                )}
                <button onClick={() => setIsHistoryOpen(false)} className="text-slate-500 hover:text-slate-300 text-sm">
                  Close
                </button>
              </div>
            </div>

            {historyLog.length === 0 ? (
              <div className="text-center text-slate-500 py-12 text-sm">
                No rounds scored yet. Completed questions and special rounds will appear here.
              </div>
            ) : (
              <div className="space-y-3 overflow-y-auto flex-1 pr-1">
                {historyLog.map((log, index) => {
                  if (log.type === 'special_round') {
                    return (
                      <div key={index} className="bg-purple-950/20 border border-purple-500/30 p-4 rounded-2xl flex flex-col gap-2">
                        <div className="flex items-center justify-between border-b border-purple-900/40 pb-2">
                          <span className="font-bold text-purple-300 text-sm flex items-center gap-1.5">
                            <Sparkles className="w-4 h-4 text-purple-400" /> {log.roundName}
                          </span>
                          <span className="text-slate-500 text-xs">{log.timestamp}</span>
                        </div>
                        <div className="text-xs">
                          <span className="text-slate-400 font-semibold">Points Adjustments: </span>
                          <div className="flex flex-wrap gap-1.5 mt-1.5">
                            {log.specialRoundResults && log.specialRoundResults.length > 0 ? (
                              log.specialRoundResults.map((s, sIdx) => (
                                <span
                                  key={sIdx}
                                  className={`px-2 py-0.5 rounded text-[11px] font-bold border ${
                                    s.points > 0
                                      ? 'bg-purple-900/50 border-purple-400/40 text-purple-200'
                                      : 'bg-rose-950/60 border-rose-500/40 text-rose-300'
                                  }`}
                                >
                                  {s.teamName} ({s.points > 0 ? `+${s.points}` : s.points})
                                </span>
                              ))
                            ) : (
                              <span className="text-slate-500">0 pts adjusted</span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div key={index} className="bg-slate-950 border border-slate-800/80 p-4 rounded-2xl flex flex-col gap-2">
                      <div className="flex items-center justify-between border-b border-slate-900 pb-2">
                        <span className="font-bold text-indigo-400 text-sm">{log.roundName} • Q{log.questionNumber}</span>
                        <span className="text-slate-500 text-xs">Direct: <strong className="text-slate-300">{log.directTeamName}</strong> ({log.direction}) • {log.timestamp}</span>
                      </div>

                      <div className="text-xs">
                        <span className="text-slate-400 font-semibold">Bounce Award: </span>
                        {log.bounceResult && log.bounceResult.length > 0 ? (
                          <span className="text-emerald-400 font-bold">
                            {log.bounceResult.map(b => `${b.teamName} (+${b.points} pts)`).join(', ')}
                          </span>
                        ) : (
                          <span className="text-slate-500">Passed</span>
                        )}
                      </div>

                      <div className="text-xs">
                        <span className="text-slate-400 font-semibold">Pounce Slips: </span>
                        {!log.pounceResults || log.pounceResults.length === 0 ? (
                          <span className="text-slate-500">No pounces</span>
                        ) : (
                          <div className="flex flex-wrap gap-1.5 mt-1">
                            {log.pounceResults.map((p, pIdx) => (
                              <span
                                key={pIdx}
                                className={`px-2 py-0.5 rounded text-[11px] font-bold border ${
                                  p.status === 'correct'
                                    ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
                                    : 'bg-rose-950/60 border-rose-500/40 text-rose-300'
                                }`}
                              >
                                {p.teamName} ({p.points > 0 ? `+${p.points}` : p.points})
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Special Round Drawer */}
      {isSpecialRoundOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-400" />
                <h3 className="font-bold text-lg">Special Round Batch Scorer</h3>
              </div>
              <button onClick={() => setIsSpecialRoundOpen(false)} className="text-slate-500 hover:text-slate-300 text-sm">
                Close
              </button>
            </div>

            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Special Round Title</label>
              <input
                type="text"
                value={specialTitle}
                onChange={(e) => setSpecialTitle(e.target.value)}
                placeholder="e.g. Theme Round / Written Round"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-sm font-semibold text-white focus:outline-none focus:border-purple-500"
              />
            </div>

            <p className="text-slate-400 text-xs">
              Add (+) or deduct (-) custom points per team. This will be logged into history.
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
              <button onClick={() => setIsSpecialRoundOpen(false)} className="flex-1 bg-slate-800 hover:bg-slate-700 font-semibold py-2.5 rounded-xl text-sm transition">
                Cancel
              </button>
              <button onClick={handleSpecialSubmit} className="flex-1 bg-purple-600 hover:bg-purple-500 text-white font-semibold py-2.5 rounded-xl text-sm shadow-lg shadow-purple-600/30 transition">
                Apply Special Scores
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}