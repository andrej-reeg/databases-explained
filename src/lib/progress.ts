// Lightweight lesson-completion tracking in localStorage.
// Keyed by doc permalink. Emits a 'db-progress' event so the UI can react.
const KEY = 'db-learn:progress';
const EVENT = 'db-progress';

type Progress = Record<string, boolean>;

export function getProgress(): Progress {
  if (typeof window === 'undefined') return {};
  try {
    return JSON.parse(window.localStorage.getItem(KEY) || '{}');
  } catch {
    return {};
  }
}

export function isDone(id: string): boolean {
  return !!getProgress()[id];
}

export function setDone(id: string, done: boolean): void {
  if (typeof window === 'undefined') return;
  const p = getProgress();
  if (done) p[id] = true;
  else delete p[id];
  window.localStorage.setItem(KEY, JSON.stringify(p));
  window.dispatchEvent(new CustomEvent(EVENT));
}

export function countDone(match: (id: string) => boolean): number {
  return Object.keys(getProgress()).filter(match).length;
}

export function resetProgress(): void {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(KEY);
  window.dispatchEvent(new CustomEvent(EVENT));
}

// Subscribe to progress changes (same-tab event + cross-tab storage event).
export function onProgressChange(cb: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  window.addEventListener(EVENT, cb);
  window.addEventListener('storage', cb);
  return () => {
    window.removeEventListener(EVENT, cb);
    window.removeEventListener('storage', cb);
  };
}
