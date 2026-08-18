import { useEffect, useMemo, useState } from 'react';
import { Archive, Check, Clipboard, Download, FileText, History, Redo2, RotateCcw, Save, X } from 'lucide-react';
import { useQuizStore } from './store';

type Details = { quizName: string; organizer: string; quizmaster: string; venue: string; notes: string };
type EventView = { id: string; type: string; label: string; timestamp: string; payload?: Record<string, unknown> };
const DETAILS_KEY = 'quiz-session-details';
const IGNORED = new Set(['TIMER_TOGGLED']);

const loadDetails = (): Details => {
  try {
    const raw = localStorage.getItem(DETAILS_KEY);
    const saved = raw ? JSON.parse(raw) as Partial<Details> : {};
    return { quizName: saved.quizName || '', organizer: saved.organizer || 'Headrush', quizmaster: saved.quizmaster || '', venue: saved.venue || 'CEP 110', notes: saved.notes || '' };
  } catch {
    return { quizName: '', organizer: 'Headrush', quizmaster: '', venue: 'CEP 110', notes: '' };
  }
};

const standingsNotes = (teams: { name: string; score: number }[]) =>
  [...teams].sort((a, b) => b.score - a.score).slice(0, 8).map((t, i) => `${i + 1}. ${t.name} — ${t.score} pts`).join('\n');

const downloadJSON = (data: unknown, filename: string) => {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a'); link.href = url; link.download = filename;
  document.body.appendChild(link); link.click(); link.remove(); URL.revokeObjectURL(url);
};

function formatEvent(event: EventView) {
  const payload = event.payload || {};
  if (event.type === 'TEAM_RENAMED') {
    const name = typeof payload.newName === 'string' ? payload.newName : typeof payload.name === 'string' ? payload.name : event.label;
    return `Team ${payload.teamId ?? ''} renamed → ${name}`;
  }
  if (event.type === 'TEAM_COUNT_CHANGED') return `Team count changed → ${payload.count}`;
  return event.label;
}

export default function Phase1Tools() {
  const events = useQuizStore((s) => s.events) as EventView[];
  const session = useQuizStore((s) => s.session);
  const teams = useQuizStore((s) => s.teams);
  const undoStack = useQuizStore((s) => s.undoStack);
  const redoStack = useQuizStore((s) => s.redoStack);
  const undo = useQuizStore((s) => s.undo);
  const redo = useQuizStore((s) => s.redo);
  const visibleEvents = useMemo(() => events.filter((e) => !IGNORED.has(e.type)), [events]);

  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<'activity' | 'details'>('activity');
  const [endOpen, setEndOpen] = useState(false);
  const [ending, setEnding] = useState(false);
  const [copied, setCopied] = useState(false);
  const [details, setDetails] = useState<Details>(() => loadDetails());
  const [notesEdited, setNotesEdited] = useState(() => Boolean(loadDetails().notes));

  // Reset Complete Quiz now opens the same End Session flow instead of silently wiping the session.
  useEffect(() => {
    const originalReset = useQuizStore.getState().resetQuiz;
    useQuizStore.setState({ resetQuiz: () => { setEndOpen(true); } });
    return () => { useQuizStore.setState({ resetQuiz: originalReset }); };
  }, []);

  useEffect(() => {
    if (!notesEdited) setDetails((d) => ({ ...d, notes: standingsNotes(teams) }));
  }, [teams, notesEdited]);

  const updateDetail = (key: keyof Details, value: string) => {
    setDetails((d) => ({ ...d, [key]: value }));
    if (key === 'notes') setNotesEdited(true);
  };

  const saveDetails = () => {
    localStorage.setItem(DETAILS_KEY, JSON.stringify(details));
  };

  const finishSession = (download: boolean) => {
    if (!details.quizName.trim()) return;
    setEnding(true);
    const state = useQuizStore.getState();
    const endedAt = new Date().toISOString();
    const meaningfulEvents = state.events.filter((event) => !IGNORED.has(event.type));
    const archive = {
      format: 'scoring-system-session',
      formatVersion: 1,
      quiz: {
        name: details.quizName.trim(), organizer: details.organizer.trim() || null,
        quizmaster: details.quizmaster.trim() || null, venue: details.venue.trim() || null,
        notes: details.notes.trim() || standingsNotes(state.teams),
        startedAt: state.session.createdAt, endedAt,
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
      exportedAt: endedAt,
    };

    if (download) {
      const safeName = details.quizName.trim().replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase() || 'quiz-session';
      downloadJSON(archive, `${safeName}-${endedAt.slice(0, 10)}.json`);
    }

    // Reset only after the archive has been constructed/exported.
    const originalReset = (window as Window & { __quizOriginalReset?: () => void }).__quizOriginalReset;
    localStorage.removeItem(DETAILS_KEY);
    setEndOpen(false); setOpen(false); setEnding(false);
    originalReset?.();
  };

  const copySessionId = async () => {
    if (navigator.clipboard) await navigator.clipboard.writeText(session.id);
    setCopied(true); window.setTimeout(() => setCopied(false), 1200);
  };

  // Keep the real reset function available while this component intercepts the UI reset action.
  useEffect(() => {
    const originalReset = useQuizStore.getState().resetQuiz;
    (window as Window & { __quizOriginalReset?: () => void }).__quizOriginalReset = originalReset;
    return () => { delete (window as Window & { __quizOriginalReset?: () => void }).__quizOriginalReset; };
  }, []);

  return (
    <>
      <div className="fixed bottom-4 left-4 z-50 flex items-center gap-1 rounded-2xl border border-slate-700 bg-slate-950/95 p-1.5 shadow-2xl backdrop-blur">
        <button onClick={undo} disabled={!undoStack.length} title="Undo (⌘Z / Ctrl+Z)" className="rounded-xl p-2.5 text-slate-300 hover:bg-slate-800 disabled:opacity-30"><RotateCcw className="h-4 w-4" /></button>
        <button onClick={redo} disabled={!redoStack.length} title="Redo (⌘⇧Z / Ctrl+Y)" className="rounded-xl p-2.5 text-slate-300 hover:bg-slate-800 disabled:opacity-30"><Redo2 className="h-4 w-4" /></button>
        <div className="mx-1 h-6 w-px bg-slate-800" />
        <button onClick={() => setOpen(true)} className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold text-slate-300 hover:bg-slate-800"><History className="h-4 w-4 text-indigo-400" /><span className="hidden sm:inline">Sessions</span><span className="rounded-md bg-slate-800 px-1.5 py-0.5 font-mono text-[10px]">{visibleEvents.length}</span></button>
      </div>

      {open && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/60 p-4 backdrop-blur-sm sm:items-center">
          <div className="flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-slate-700 bg-slate-950 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4"><div><div className="flex items-center gap-2 text-sm font-black text-white"><History className="h-4 w-4 text-indigo-400" /> Sessions</div><p className="mt-1 text-[11px] text-slate-500">Active session activity and quiz details.</p></div><button onClick={() => setOpen(false)} className="rounded-xl p-2 text-slate-400 hover:bg-slate-800"><X className="h-5 w-5" /></button></div>
            <div className="flex border-b border-slate-800 px-4"><button onClick={() => setTab('activity')} className={`border-b-2 px-4 py-3 text-xs font-bold ${tab === 'activity' ? 'border-indigo-500 text-indigo-300' : 'border-transparent text-slate-500'}`}><History className="mr-1 inline h-3.5 w-3.5" /> Activity</button><button onClick={() => setTab('details')} className={`border-b-2 px-4 py-3 text-xs font-bold ${tab === 'details' ? 'border-indigo-500 text-indigo-300' : 'border-transparent text-slate-500'}`}><FileText className="mr-1 inline h-3.5 w-3.5" /> Quiz Details</button></div>

            {tab === 'activity' ? (
              <>
                <div className="grid grid-cols-3 gap-3 border-b border-slate-800 p-4"><div className="rounded-2xl border border-slate-800 bg-slate-900 p-3"><div className="text-[10px] uppercase text-slate-500">Events</div><div className="mt-1 text-xl font-black text-white">{visibleEvents.length}</div></div><div className="rounded-2xl border border-slate-800 bg-slate-900 p-3"><div className="text-[10px] uppercase text-slate-500">Undo</div><div className="mt-1 text-xl font-black text-white">{undoStack.length}</div></div><div className="rounded-2xl border border-slate-800 bg-slate-900 p-3"><div className="text-[10px] uppercase text-slate-500">Session</div><div className="mt-1 truncate font-mono text-xs text-slate-300">{session.id.slice(0, 8)}</div></div></div>
                <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3"><div className="min-w-0"><div className="text-[10px] uppercase text-slate-500">Session ID</div><div className="truncate font-mono text-xs text-slate-300">{session.id}</div></div><button onClick={copySessionId} className="ml-3 flex shrink-0 items-center gap-1.5 rounded-xl border border-slate-700 px-3 py-2 text-xs font-bold text-slate-300">{copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Clipboard className="h-3.5 w-3.5" />}{copied ? 'Copied' : 'Copy ID'}</button></div>
                <div className="flex-1 overflow-y-auto p-4">{visibleEvents.length === 0 ? <div className="p-8 text-center text-sm text-slate-500">No events yet.</div> : <div className="space-y-2">{visibleEvents.map((event) => <div key={event.id} className="flex items-start gap-3 rounded-2xl border border-slate-800 bg-slate-900/70 p-3"><div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-indigo-400" /><div className="min-w-0 flex-1"><div className="text-xs font-bold text-slate-200">{formatEvent(event)}</div><div className="mt-1 flex gap-2 text-[10px] text-slate-500"><span className="font-mono">{event.type}</span><span>•</span><span>{new Date(event.timestamp).toLocaleTimeString()}</span></div></div></div>)}</div>}</div>
                <button onClick={() => setEndOpen(true)} className="mx-4 mb-4 flex items-center justify-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2.5 text-xs font-bold text-rose-300 hover:bg-rose-500/20"><Archive className="h-4 w-4" /> End Session</button>
              </>
            ) : (
              <div className="space-y-4 overflow-y-auto p-5"><label className="block"><span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">Quiz name</span><input value={details.quizName} onChange={(e) => updateDetail('quizName', e.target.value)} placeholder="Netflix & Quiz" className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-white" /></label><div className="grid gap-4 sm:grid-cols-2"><label className="block"><span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">Organizer</span><input value={details.organizer} onChange={(e) => updateDetail('organizer', e.target.value)} className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-white" /></label><label className="block"><span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">Quizmaster</span><input value={details.quizmaster} onChange={(e) => updateDetail('quizmaster', e.target.value)} placeholder="Quizmaster name" className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-white" /></label></div><label className="block"><span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">Venue</span><input value={details.venue} onChange={(e) => updateDetail('venue', e.target.value)} className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-white" /></label><label className="block"><span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">Notes</span><textarea value={details.notes || standingsNotes(teams)} onChange={(e) => updateDetail('notes', e.target.value)} rows={6} className="w-full resize-none rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 font-mono text-xs text-white" /></label><button onClick={() => { saveDetails(); setTab('activity'); }} className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white"><Save className="h-4 w-4" /> Save Details</button></div>
            )}
          </div>
        </div>
      )}

      {endOpen && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"><div className="w-full max-w-xl rounded-3xl border border-slate-700 bg-slate-950 shadow-2xl"><div className="flex items-center justify-between border-b border-slate-800 px-6 py-5"><div><div className="flex items-center gap-2 text-lg font-black text-white"><Archive className="h-5 w-5 text-amber-400" /> End Quiz Session</div><p className="mt-1 text-xs text-slate-500">Your details are already filled in when you have saved them.</p></div><button onClick={() => setEndOpen(false)} disabled={ending} className="rounded-xl p-2 text-slate-400 hover:bg-slate-800"><X className="h-5 w-5" /></button></div><div className="space-y-4 p-6"><label className="block"><span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-400">Quiz name *</span><input autoFocus value={details.quizName} onChange={(e) => updateDetail('quizName', e.target.value)} placeholder="Netflix & Quiz" className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-white" /></label><div className="grid gap-4 sm:grid-cols-2"><label className="block"><span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">Organizer</span><input value={details.organizer} onChange={(e) => updateDetail('organizer', e.target.value)} className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-white" /></label><label className="block"><span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">Quizmaster</span><input value={details.quizmaster} onChange={(e) => updateDetail('quizmaster', e.target.value)} className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-white" /></label></div><label className="block"><span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">Venue</span><input value={details.venue} onChange={(e) => updateDetail('venue', e.target.value)} className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-white" /></label><label className="block"><span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">Notes</span><textarea value={details.notes || standingsNotes(teams)} onChange={(e) => updateDetail('notes', e.target.value)} rows={5} className="w-full resize-none rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 font-mono text-xs text-white" /></label><div className="flex justify-end gap-2 border-t border-slate-800 pt-4"><button onClick={() => setEndOpen(false)} disabled={ending} className="rounded-xl border border-slate-700 px-4 py-2.5 text-xs font-bold text-slate-300">Cancel</button><button onClick={() => finishSession(false)} disabled={!details.quizName.trim() || ending} className="rounded-xl border border-slate-700 px-4 py-2.5 text-xs font-bold text-slate-200">End Session</button><button onClick={() => finishSession(true)} disabled={!details.quizName.trim() || ending} className="flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-black text-white disabled:opacity-40"><Download className="h-4 w-4" /> End & Export JSON</button></div></div></div></div>
      )}
    </>
  );
}
