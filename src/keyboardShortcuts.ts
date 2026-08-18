import { useQuizStore } from './store';

export function installQuizKeyboardShortcuts() {
  if (typeof window === 'undefined') return () => undefined;

  const handler = (event: KeyboardEvent) => {
    const target = event.target;
    if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || (target instanceof HTMLElement && target.isContentEditable)) {
      return;
    }

    const modifier = event.metaKey || event.ctrlKey;
    if (!modifier || event.altKey) return;

    if (event.key.toLowerCase() === 'z') {
      event.preventDefault();
      if (event.shiftKey) useQuizStore.getState().redo();
      else useQuizStore.getState().undo();
      return;
    }

    if (event.key.toLowerCase() === 'y') {
      event.preventDefault();
      useQuizStore.getState().redo();
    }
  };

  window.addEventListener('keydown', handler);
  return () => window.removeEventListener('keydown', handler);
}
