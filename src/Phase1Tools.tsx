import { useMemo, useState } from 'react';
import { Check, Clipboard, Download, History, Redo2, RotateCcw, X } from 'lucide-react';
import { useQuizStore } from './store';

export default function Phase1Tools() {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const events = useQuizStore((state) => state.events);
  const session = useQuizStore((state) => state.session);
  const undoStack = useQuizStore((state) => state.undoStack);
  const redoStack = useQuizStore((state) => state.redoStack);
  const undo = useQuizStore((state) => state.undo);
  const redo = useQuizStore((state) => state.redo);

  const recentEvents = useMemo(() => events.slice(0, 12), [events]);

  const copySessionId = async () => {
    if (navigator.clipboard) await navigator.clipboard.writeText(session.id);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1200);
  };

  const exportSession = () => {
    const state = useQuizStore.getState();
    const payload = {
      session: state.session,
      teams: state.teams,
      questionNumber: state.questionNumber,
      roundNumber: state.roundNumber,
      roundName: state.roundName,
      historyLog: state.historyLog,
      events: state.events,
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `quiz-session-${session.id.slice(0, 8)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <div className="fixed bottom-4 left-4 z-50 flex items-center gap-1 rounded-2xl border border-slate-700 bg-slate-950/95 p-1.5 shadow-2xl shadow-black/40 backdrop-blur">
        <button onClick={undo} disabled={undoStack.length === 0} title="Undo (⌘Z / Ctrl+Z)" className="rounded-xl p-2.5 text-slate-300 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-30"><RotateCcw className="h-4 w-4" /></button>
        <button onClick={redo} disabled={redoStack.length === 0} title="Redo (⌘⇧Z / Ctrl+Y)" className="rounded-xl p-2.5 text-slate-300 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-30"><Redo2 className="h-4 w-4" /></button>
        <div className="mx-1 h-6 w-px bg-slate-800" />
        <button onClick={() => setOpen(true)} className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold text-slate-300 transition hover:bg-slate-800">
          <History className="h-4 w-4 text-indigo-400" /><span className="hidden sm:inline">Session</span><span className="rounded-md bg-slate-800 px-1.5 py-0.5 font-mono text-[10px]">{events.length}</span>
        </button>
      </div>

      {open && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/60 p-4 backdrop-blur-sm sm:items-center">
          <div className="flex max-h-[80vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-slate-700 bg-slate-950 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
              <div><div className="flex items-center gap-2 text-sm font-black text-white"><History className="h-4 w-4 text-indigo-400" /> Session history</div><p className="mt-1 text-[11px] text-slate-500">Persistent event history for the current quiz session.</p></div>
              <button onClick={() => setOpen(false)} className="rounded-xl p-2 text-slate-400 hover:bg-slate-800 hover:text-white"><X className="h-5 w-5" /></button>
            </div>
            <div className="grid grid-cols-2 gap-3 border-b border-slate-800 p-4 sm:grid-cols-4">
              <div className="rounded-2xl border border-slate-800 bg-slate-900 p-3"><div className="text-[10px] uppercase tracking-wider text-slate-500">Events</div><div className="mt-1 text-xl font-black text-white">{events.length}</div></div>
              <div className="rounded-2xl border border-slate-800 bg-slate-900 p-3"><div className="text-[10px] uppercase tracking-wider text-slate-500">Undo</div><div className="mt-1 text-xl font-black text-white">{undoStack.length}</div></div>
              <div className="rounded-2xl border border-slate-800 bg-slate-900 p-3"><div className="text-[10px] uppercase tracking-wider text-slate-500">Redo</div><div className="mt-1 text-xl font-black text-white">{redoStack.length}</div></div>
              <button onClick={exportSession} className="rounded-2xl border border-indigo-500/30 bg-indigo-500/10 p-3 text-left transition hover:bg-indigo-500/20"><Download className="h-4 w-4 text-indigo-400" /><div className="mt-1 text-xs font-bold text-indigo-200">Export JSON</div></button>
            </div>
            <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
              <div className="min-w-0"><div className="text-[10px] uppercase tracking-wider text-slate-500">Session ID</div><div className="truncate font-mono text-xs text-slate-300">{session.id}</div></div>
              <button onClick={copySessionId} className="ml-3 flex shrink-0 items-center gap-1.5 rounded-xl border border-slate-700 px-3 py-2 text-xs font-bold text-slate-300 hover:bg-slate-800">{copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Clipboard className="h-3.5 w-3.5" />}{copied ? 'Copied' : 'Copy ID'}</button>
            </div>
            <div className="overflow-y-auto p-4">
              {recentEvents.length === 0 ? <div className="rounded-2xl border border-dashed border-slate-800 p-8 text-center text-sm text-slate-500">No events yet. Start a question to create the first event.</div> : <div className="space-y-2">{recentEvents.map((event) => <div key={event.id} className="flex items-start gap-3 rounded-2xl border border-slate-800 bg-slate-900/70 p-3"><div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-indigo-400" /><div className="min-w-0 flex-1"><div className="text-xs font-bold text-slate-200">{event.label}</div><div className="mt-1 flex flex-wrap gap-2 text-[10px] text-slate-500"><span className="font-mono">{event.type}</span><span>•</span><span>{new Date(event.timestamp).toLocaleTimeString()}</span></div></div></div>)}</div>}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
