import { useEffect, useMemo, useState } from 'react';
import { FileText, Save, X } from 'lucide-react';
import { useQuizStore } from './store';

export type QuizDetailsData = {
  quizName: string;
  organizer: string;
  quizmaster: string;
  venue: string;
  notes: string;
};

export const QUIZ_DETAILS_KEY = 'quiz-session-details';

const buildDefaultNotes = (teams: { name: string; score: number }[]) =>
  [...teams]
    .sort((a, b) => b.score - a.score)
    .slice(0, 8)
    .map((team, index) => `${index + 1}. ${team.name} — ${team.score} pts`)
    .join('\n');

export const getQuizDetails = (): QuizDetailsData => {
  try {
    const raw = localStorage.getItem(QUIZ_DETAILS_KEY);
    if (raw) {
      const saved = JSON.parse(raw) as Partial<QuizDetailsData>;
      return {
        quizName: saved.quizName || '',
        organizer: saved.organizer || 'Headrush',
        quizmaster: saved.quizmaster || '',
        venue: saved.venue || 'CEP 110',
        notes: saved.notes || '',
      };
    }
  } catch {
    // Fall through to defaults.
  }
  return { quizName: '', organizer: 'Headrush', quizmaster: '', venue: 'CEP 110', notes: '' };
};

export const saveQuizDetails = (details: QuizDetailsData) => {
  localStorage.setItem(QUIZ_DETAILS_KEY, JSON.stringify(details));
};

export const defaultStandingsNotes = buildDefaultNotes;

export default function QuizDetails({ onClose }: { onClose: () => void }) {
  const teams = useQuizStore((state) => state.teams);
  const [details, setDetails] = useState<QuizDetailsData>(() => getQuizDetails());
  const generatedNotes = useMemo(() => buildDefaultNotes(teams), [teams]);
  const [notesCustomized, setNotesCustomized] = useState(() => Boolean(getQuizDetails().notes));

  useEffect(() => {
    if (!notesCustomized) {
      setDetails((current) => ({ ...current, notes: generatedNotes }));
    }
  }, [generatedNotes, notesCustomized]);

  const update = (key: keyof QuizDetailsData, value: string) => {
    setDetails((current) => ({ ...current, [key]: value }));
    if (key === 'notes') setNotesCustomized(true);
  };

  const save = () => {
    saveQuizDetails(details);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[85] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-xl overflow-hidden rounded-3xl border border-slate-700 bg-slate-950 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-5">
          <div>
            <div className="flex items-center gap-2 text-lg font-black text-white"><FileText className="h-5 w-5 text-indigo-400" /> Quiz Details</div>
            <p className="mt-1 text-xs text-slate-500">These details stay with the current session and are frozen into its archive when it ends.</p>
          </div>
          <button onClick={onClose} className="rounded-xl p-2 text-slate-400 hover:bg-slate-800 hover:text-white"><X className="h-5 w-5" /></button>
        </div>

        <div className="space-y-4 p-6">
          <label className="block">
            <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-400">Quiz name</span>
            <input value={details.quizName} onChange={(e) => update('quizName', e.target.value)} placeholder="Netflix & Quiz" className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-white outline-none focus:border-indigo-500" />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block"><span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">Organizer</span><input value={details.organizer} onChange={(e) => update('organizer', e.target.value)} className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-white outline-none focus:border-indigo-500" /></label>
            <label className="block"><span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">Quizmaster</span><input value={details.quizmaster} onChange={(e) => update('quizmaster', e.target.value)} placeholder="Quizmaster name" className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-white outline-none focus:border-indigo-500" /></label>
          </div>

          <label className="block"><span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">Venue</span><input value={details.venue} onChange={(e) => update('venue', e.target.value)} className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-white outline-none focus:border-indigo-500" /></label>

          <label className="block"><span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">Notes</span><textarea value={details.notes} onChange={(e) => update('notes', e.target.value)} rows={5} className="w-full resize-none rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 font-mono text-xs text-white outline-none focus:border-indigo-500" /></label>

          <div className="flex items-center justify-end gap-2 border-t border-slate-800 pt-4">
            <button onClick={onClose} className="rounded-xl border border-slate-700 px-4 py-2.5 text-xs font-bold text-slate-300 hover:bg-slate-800">Cancel</button>
            <button onClick={save} className="flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-black text-white hover:bg-indigo-500"><Save className="h-4 w-4" /> Save Details</button>
          </div>
        </div>
      </div>
    </div>
  );
}
