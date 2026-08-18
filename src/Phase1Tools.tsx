import { useMemo, useState } from 'react';
import { Archive, Check, Clipboard, Download, History, Redo2, RotateCcw, X } from 'lucide-react';
import { useQuizStore } from './store';

type Details = { quizName: string; organizer: string; quizmaster: string; venue: string; notes: string };
type EventView = { id: string; type: string; label: string; timestamp: string; payload?: Record<string, unknown> };

const DETAILS_KEY = 'quiz-session-details';
const IGNORED = new Set(['TIMER_TOGGLED']);

const loadDetails = (): Details => {
  try {
    const raw = localStorage.getItem(DETAILS_KEY);
    const saved = raw ? JSON.parse(raw) as Partial<Details> : {};
    return {
      quizName: saved.quizName || '',
      organizer: saved.organizer || 'Headrush',
      quizmaster: saved.quizmaster || '',
      venue: saved.venue || 'CEP 110',
      notes: saved.notes || '',
    };
  } catch {
    return { quizName: '', organizer: 'Headrush', quizmaster: '', venue: 'CEP 110', notes: '' };
  }
};

const standingsNotes = (teams: { name: string; score: number }[]) =>
  [...teams]
    .sort((a, b) => b.score - a.score)
    .slice(0, 8)
    .map((team, index) => `${index + 1}. ${team.name} — ${team.score} pts`)
    .join('\n');

const downloadJSON = (data: unknown, filename: string) => {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

function formatEvent(event: EventView) {
  const payload = event.payload || {};
  if (event.type === 'TEAM_RENAMED') {
    const newName = typeof payload.newName === 'string'
      ? payload.newName
      : typeof payload.name === 'string' ? payload.name : event.label;
    return `Team ${payload.teamId ?? ''} renamed → ${newName}`;
  }
  if (event.type === 'TEAM_COUNT_CHANGED') return `Team count changed → ${payload.count}`;
  return event.label;
}

export default function Phase1Tools() {
  const events = useQuizStore((state) => state.events) as EventView[];
  const session = useQuizStore((state) => state.session);
  const teams = useQuizStore((state) => state.teams);
  const historyLog = useQuizStore((state) => state.historyLog);
  const undoStack = useQuizStore((state) => state.undoStack);
  const redoStack = useQuizStore((state) => state.redoStack);
  const undo = useQuizStore((state) => state.undo);
  const redo = useQuizStore((state) => state.redo);
  const resetQuiz = useQuizStore((state) => state.resetQuiz);
  const visibleEvents = useMemo(() => events.filter((event) => !IGNORED.has(event.type)), [events]);

  const [open, setOpen] = useState(false);
  const [endOpen, setEndOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [details, setDetails] = useState<Details>(() => loadDetails());

  const updateDetail = (key: keyof Details, value: string) => {
    const next = { ...details, [key]: value };
    setDetails(next);
    localStorage.setItem(DETAILS_KEY, JSON.stringify(next));
  };

  const buildArchive = () => {
    const state = useQuizStore.getState();
    const exportedAt = new Date().toISOString();
    const meaningfulEvents = state.events.filter((event) => !IGNORED.has(event.type));
    return {
      format: 'scoring-system-session',
      formatVersion: 1,
      quiz: {
        name: details.quizName.trim() || null,
        organizer: details.organizer.trim() || 'Headrush',
        quizmaster: details.quizmaster.trim() || null,
        venue: details.venue.trim() || 'CEP 110',
        notes: details.notes.trim() || standingsNotes(state.teams),
        startedAt: state.session.createdAt,
        exportedAt,
      },
      session: state.session,
      summary: {
        teams: state.teams.length,
        questionsCompleted: state.historyLog.filter((entry) => entry.type === 'question').length,
        rounds: new Set(state.historyLog.map((entry) => entry.roundName)).size,
        events: meaningfulEvents.length,
      },
      teams: state.teams.map((team) => ({ id: team.id, finalName: team.name, finalScore: team.score })),
      scoringHistory: state.historyLog,
      events: meaningfulEvents,
    };
  };

  const exportJSON = () => {
    const archive = buildArchive();
    const safeName = details.quizName.trim()
      .replace(/[^a-z0-9]+/gi, '-')
      .replace(/^-|-$/g, '')
      .toLowerCase() || 'quiz-session';
    downloadJSON(archive, `${safeName}-${new Date().toISOString().slice(0, 10)}.json`);
  };

  const endQuiz = () => {
    // End means actually reset the Zustand session. Do not route through another UI handler.
    localStorage.removeItem(DETAILS_KEY);
    setEndOpen(false);
    setOpen(false);
    resetQuiz();
  };

  const copySessionId = async () => {
    if (navigator.clipboard) await navigator.clipboard.writeText(session.id);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1200);
  };

  return (
    <>
      <div className="fixed bottom-4 left-4 z-50 flex items-center gap-1 rounded-2xl border border-slate-700 bg-slate-950/95 p-1.5 shadow-2xl backdrop-blur">
        <button onClick={undo} disabled={!undoStack.length} title="Undo (⌘Z / Ctrl+Z)" className="rounded-xl p-2.5 text-slate-300 hover:bg-slate-800 disabled:opacity-30"><RotateCcw className="h-4 w-4" /></button>
        <button onClick={redo} disabled={!redoStack.length} title="Redo (⌘⇧Z / Ctrl+Y)" className="rounded-xl p-2.5 text-slate-300 hover:bg-slate-800 disabled:opacity-30"><Redo2 className="h-4 w-4" /></button>
        <div className="mx-1 h-6 w-px bg-slate-800" />
        <button onClick={() => setOpen(true)} className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold text-slate-300 hover:bg-slate-800">
          <History className="h-4 w-4 text-indigo-400" />
          <span className="hidden sm:inline">Sessions</span>
          <span className="rounded-md bg-slate-800 px-1.5 py-0.5 font-mono text-[10px]">{visibleEvents.length}</span>
        </button>
      </div>

      {open && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/60 p-4 backdrop-blur-sm sm:items-center">
          <div className="flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-slate-700 bg-slate-950 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
              <div>
                <div className="flex items-center gap-2 text-sm font-black text-white"><History className="h-4 w-4 text-indigo-400" /> Sessions</div>
                <p className="mt-1 text-[11px] text-slate-500">Current quiz session activity.</p>
              </div>
              <button onClick={() => setOpen(false)} className="rounded-xl p-2 text-slate-400 hover:bg-slate-800"><X className="h-5 w-5" /></button>
            </div>

            <div className="grid grid-cols-3 gap-3 border-b border-slate-800 p-4">
              <div className="rounded-2xl border border-slate-800 bg-slate-900 p-3"><div className="text-[10px] uppercase text-slate-500">Events</div><div className="mt-1 text-xl font-black text-white">{visibleEvents.length}</div></div>
              <div className="rounded-2xl border border-slate-800 bg-slate-900 p-3"><div className="text-[10px] uppercase text-slate-500">Undo</div><div className="mt-1 text-xl font-black text-white">{undoStack.length}</div></div>
              <div className="rounded-2xl border border-slate-800 bg-slate-900 p-3"><div className="text-[10px] uppercase text-slate-500">Session</div><div className="mt-1 truncate font-mono text-xs text-slate-300">{session.id.slice(0, 8)}</div></div>
            </div>

            <div className="flex items-center gap-2 border-b border-slate-800 px-4 py-3">
              <div className="min-w-0 flex-1">
                <div className="text-[10px] uppercase text-slate-500">Session ID</div>
                <div className="truncate font-mono text-xs text-slate-300">{session.id}</div>
              </div>
              <button onClick={copySessionId} className="flex shrink-0 items-center gap-1.5 rounded-xl border border-slate-700 px-3 py-2 text-xs font-bold text-slate-300 hover:bg-slate-800">
                {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Clipboard className="h-3.5 w-3.5" />}{copied ? 'Copied' : 'Copy ID'}
              </button>
              <button onClick={exportJSON} className="flex shrink-0 items-center gap-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs font-bold text-emerald-300 hover:bg-emerald-500/20">
                <Download className="h-3.5 w-3.5" /> Export JSON
              </button>
              <button onClick={() => setEndOpen(true)} className="flex shrink-0 items-center gap-1.5 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs font-bold text-rose-300 hover:bg-rose-500/20">
                <Archive className="h-3.5 w-3.5" /> End Quiz
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {visibleEvents.length === 0 ? (
                <div className="p-8 text-center text-sm text-slate-500">No events yet.</div>
              ) : (
                <div className="space-y-2">
                  {visibleEvents.map((event) => (
                    <div key={event.id} className="flex items-start gap-3 rounded-2xl border border-slate-800 bg-slate-900/70 p-3">
                      <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-indigo-400" />
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-bold text-slate-200">{formatEvent(event)}</div>
                        <div className="mt-1 flex gap-2 text-[10px] text-slate-500"><span className="font-mono">{event.type}</span><span>•</span><span>{new Date(event.timestamp).toLocaleTimeString()}</span></div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {endOpen && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border border-slate-700 bg-slate-950 p-6 shadow-2xl">
            <div className="flex items-center gap-3"><Archive className="h-5 w-5 text-amber-400" /><div><h3 className="text-lg font-black text-white">End Quiz?</h3><p className="mt-1 text-xs text-slate-500">This ends the current session and resets the scorer.</p></div></div>
            {!details.quizName.trim() && <p className="mt-4 rounded-xl border border-amber-500/20 bg-amber-500/10 p-3 text-xs text-amber-300">Quiz Details have not been filled in yet. You can fill them from the Quiz Details option in the menu before ending.</p>}
            <div className="mt-5 flex justify-end gap-2"><button onClick={() => setEndOpen(false)} className="rounded-xl border border-slate-700 px-4 py-2.5 text-xs font-bold text-slate-300 hover:bg-slate-800">Cancel</button><button onClick={endQuiz} className="rounded-xl bg-rose-600 px-5 py-2.5 text-xs font-black text-white hover:bg-rose-500">End & Reset Quiz</button></div>
          </div>
        </div>
      )}
    </>
  );
}
