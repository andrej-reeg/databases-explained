import {useEffect, useState} from 'react';
import {hashStr} from '../lib/result';

// Editor text that persists across reloads, keyed by page path + initial query
// (so each box on a page keeps its own edits).
export function usePersistentQuery(initialQuery: string) {
  const storageKey =
    typeof window !== 'undefined'
      ? `db-learn:sql:${window.location.pathname}:${hashStr(initialQuery)}`
      : '';
  const [query, setQuery] = useState(() => {
    if (storageKey) {
      const saved = window.localStorage.getItem(storageKey);
      if (saved != null) return saved;
    }
    return initialQuery;
  });
  useEffect(() => {
    if (storageKey) {
      try {
        window.localStorage.setItem(storageKey, query);
      } catch {}
    }
  }, [query, storageKey]);
  return [query, setQuery] as const;
}
