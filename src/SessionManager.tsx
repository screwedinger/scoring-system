import { useState } from 'react';
import { Archive, Check, Download, X } from 'lucide-react';
import { useQuizStore } from './store';

type SessionDetails = { quizName: string; organizer: string; quizmaster: string; venue: string; notes: string };
const METADATA_KEY = 'quiz-session-metadata';
const IGNORED_EVENT_TYPES = new Set(['TIMER_TOGGLED']);

type QuizEventView = { id: string; type: string; label: string; timestamp: string; payload?: Record<string, unknown> };

function getSavedDetails(sessionId: string): Partial<SessionDetails> {
  try { const raw = localStorage.getItem(`${METADATA_KEY}:${sessionId}`); return raw ? JSON.parse(raw) : {}; } catch { return {}; }
}

function downloadJSON(payload: unknown, filename: string) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a'); link.href = url; link.download = filename;
  document.body.appendChild(link); link.click(); link.remove(); URL.revokeObjectURL(url);
}

export default function SessionManager() {
  const session = useQuizStore((state) => state.session);
  const [open, setOpen] = useState(false);
  const [ending, setEnding] = useState(false);
  const [details, setDetails] = useState<SessionDetails>(() => {
    const saved = getSavedDetails(session.id);
    return { quizName: saved.quizName || '', organizer: saved.organizer || '', quizmaster: saved.quizmaster || '', venue: saved.venue || '', notes: saved.notes || '' };
  });
  const events = useQuizStore((state) => state.events) as QuizEventView[];
  const visibleEventCount = events.filter((event) => !IGNORED_EVENT_TYPES.has(event.type)).length;

  const updateDetail = (key: keyof SessionDetails, value: string) => {
    const next = { ...details, [key]: value }; setDetails(next);
    localStorage.setItem(`${METADATA_KEY}:${session.id}`, JSON.stringify(next));
  };

  const endSession = () => {
    if (!details.quizName.trim()) return;
    setEnding(true);
    const state = useQuizStore.getState();
    const endedAt = new Date().toISOString();
    const meaningfulEvents = state.events.filter((event) => !IGNORED_EVENT_TYPES.has(event.type));
    const archive = {
      format: 'scoring-system-session', formatVersion: 1,
      quiz: { name: details.quizName.trim(), organizer: details.organizer.trim() || null, quizmaster: details.quizmaster.trim() || null, venue: details.venue.trim() || null, notes: details.notes.trim() || null, startedAt: state.session.createdAt, endedAt },
      session: state.session,
      summary: { teams: state.teams.length, questionsCompleted: state.historyLog.filter((entry) => entry.type === 'question').length, rounds: new Set(state.historyLog.map((entry) => entry.roundName)).size, events: meaningfulEvents.length },
      teams: state.teams.map((team) => ({ id: team.id, finalName: team.name, finalScore: team.score })),
      scoringHistory: state.historyLog,
      events: meaningfulEvents,
      exportedAt: endedAt,
    };
    const safeName = details.quizName.trim().replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase() || 'quiz-session';
    downloadJSON(archive, `${safeName}-${endedAt.slice(0, 10)}.json`);
    localStorage.removeItem(`${METADATA_KEY}:${session.id}`);
    localStorage.removeItem('quiz-master-storage');
    window.setTimeout(() => window.location.reload(), 150);
  };

  return (
    <>
      <button onClick={() => setOpen(true)} className="fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-950/95 px-3.5 py-2.5 text-xs font-bold text-slate-200 shadow-2xl backdrop-blur transition hover:bg-slate-800">
        <Archive className="h-4 w-4 text-amber-400" /> End Session
      </button>
      {open && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-xl overflow-hidden rounded-3xl border border-slate-700 bg-slate-950 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 px-6 py-5">
              <div><div className="flex items-center gap-2 text-lg font-black text-white"><Archive className="h-5 w-5 text-amber-400" /> End Quiz Session</div><p className="mt-1 text-xs text-slate-500">Name this completed quiz before it is archived.</p></div>
              <button onClick={() => setOpen(false)} className="rounded-xl p-2 text-slate-400 hover:bg-slate-800 hover:text-white"><X className="h-5 w-5" /></button>
            </div>
            <div className="space-y-4 p-6">
              <label className="block"><span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-400">Quiz name <span className="text-rose-400">*</span></span><input autoFocus value={details.quizName} onChange={(e) => updateDetail('quizName', e.target.value)} placeholder="Netflix & Quiz" className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-white outline-none focus:border-indigo-500" /></label>
              <div className="grid gap-4 sm:grid-cols-2">{(['organizer', 'quizmaster', 'venue'] as const).map((key) => <label key={key} className="block"><span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">{key}</span><input value={details[key]} onChange={(e) => updateDetail(key, e.target.value)} placeholder={key === 'organizer' ? 'Headrush' : key === 'quizmaster' ? 'Quizmaster name' : 'Venue'} className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-white outline-none focus:border-indigo-500" /></label>)}</div>
              <label className="block"><span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">Notes</span><textarea value={details.notes} onChange={(e) => updateDetail('notes', e.target.value)} placeholder="Finals — 8 teams" rows={3} className="w-full resize-none rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-white outline-none focus:border-indigo-500" /></label>
              <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 text-xs text-slate-400"><div className="mb-2 font-bold text-slate-200">Archive summary</div><div>{stateSummary()}</div><div className="mt-1">Meaningful quiz actions are logged. Timer pause/resume and ordinary UI navigation are excluded.</div></div>
              <div className="flex justify-end gap-2 pt-1"><button onClick={() => setOpen(false)} disabled={ending} className="rounded-xl border border-slate-700 px-4 py-2.5 text-xs font-bold text-slate-300 hover:bg-slate-800">Cancel</button><button onClick={endSession} disabled={!details.quizName.trim() || ending} className="flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-black text-white shadow-lg shadow-indigo-600/20 hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-40">{ending ? <Check className="h-4 w-4" /> : <Download className="h-4 w-4" />} End & Download</button></div>
            </div>
          </div>
        </div>
      )}
    </>
  );

  function stateSummary() {
    const state = useQuizStore.getState();
    return `${state.teams.length} teams · ${state.historyLog.filter((entry) => entry.type === 'question').length} questions · ${visibleEventCount} logged events`;
  }
}
