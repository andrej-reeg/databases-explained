import {type ReactNode, useCallback, useEffect, useMemo, useState} from 'react';
import Layout from '@theme/Layout';
import Heading from '@theme/Heading';

import SqlRunner from '@site/src/components/SqlRunner';
import {
  CHALLENGES,
  SCHEMA_SQL,
  type Challenge,
  type Difficulty,
} from '@site/src/components/Playground/challenges';
import styles from './playground.module.css';

const STORAGE_KEY = 'db-learn:playground';
const DIFFICULTIES: Difficulty[] = ['Beginner', 'Intermediate', 'Advanced'];

function loadSolved(): Set<number> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return new Set<number>(raw ? JSON.parse(raw) : []);
  } catch {
    return new Set();
  }
}

function saveSolved(ids: Set<number>): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify([...ids]));
  } catch {}
}

// A starter that is unique per challenge so each box keeps its own saved edits.
function starter(c: Challenge): string {
  return `-- Challenge ${c.id}: ${c.title}\n-- Write your query, then press Run (Ctrl/Cmd+Enter).\n`;
}

// Challenge id encoded in the URL hash (e.g. `#challenge-7`), or null if absent
// or unknown. Tolerates a bare `#7` too.
function hashId(): number | null {
  if (typeof window === 'undefined') return null;
  const m = window.location.hash.match(/(\d+)/);
  if (!m) return null;
  const id = Number(m[1]);
  return CHALLENGES.some((c) => c.id === id) ? id : null;
}

type Filter = 'All' | Difficulty;

const iconProps = {
  width: 18,
  height: 18,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
};

function ChevronLeft() {
  return (
    <svg {...iconProps}>
      <polyline points="15 18 9 12 15 6" />
    </svg>
  );
}

function ChevronRight() {
  return (
    <svg {...iconProps}>
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}

function Shuffle() {
  return (
    <svg {...iconProps}>
      <polyline points="16 3 21 3 21 8" />
      <line x1="4" y1="20" x2="21" y2="3" />
      <polyline points="21 16 21 21 16 21" />
      <line x1="15" y1="15" x2="21" y2="21" />
      <line x1="4" y1="4" x2="9" y2="9" />
    </svg>
  );
}

function Playground(): ReactNode {
  const [solved, setSolved] = useState<Set<number>>(() => new Set());
  const [currentId, setCurrentId] = useState<number>(CHALLENGES[0].id);
  const [filter, setFilter] = useState<Filter>('All');

  // localStorage is client-only: hydrate after mount.
  useEffect(() => {
    setSolved(loadSolved());
  }, []);

  // Open the challenge named in the URL hash (deep-link/share), and follow
  // back/forward navigation between challenges.
  useEffect(() => {
    const fromHash = hashId();
    if (fromHash != null) setCurrentId(fromHash);
    const onHash = () => {
      const id = hashId();
      if (id != null) setCurrentId(id);
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  // Keep the hash pointed at the current challenge (replace, so it doesn't spam
  // the history stack as the learner clicks around).
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const target = `#challenge-${currentId}`;
    if (window.location.hash !== target) {
      window.history.replaceState(null, '', target);
    }
  }, [currentId]);

  const current = useMemo(
    () => CHALLENGES.find((c) => c.id === currentId) ?? CHALLENGES[0],
    [currentId],
  );

  const visible = useMemo(
    () =>
      filter === 'All'
        ? CHALLENGES
        : CHALLENGES.filter((c) => c.difficulty === filter),
    [filter],
  );

  const markSolved = useCallback(
    (verdict: 'correct' | 'wrong') => {
      if (verdict !== 'correct') return;
      setSolved((prev) => {
        if (prev.has(currentId)) return prev;
        const next = new Set(prev);
        next.add(currentId);
        saveSolved(next);
        return next;
      });
    },
    [currentId],
  );

  const go = useCallback(
    (delta: number) => {
      const idx = visible.findIndex((c) => c.id === currentId);
      // If the current challenge is filtered out, start from the list edge.
      const base = idx === -1 ? (delta > 0 ? -1 : 0) : idx;
      const nextIdx = (base + delta + visible.length) % visible.length;
      setCurrentId(visible[nextIdx].id);
    },
    [visible, currentId],
  );

  const random = useCallback(() => {
    const pool = visible.filter((c) => c.id !== currentId);
    if (!pool.length) return;
    // Deterministic-enough shuffle source without Math.random in module scope.
    const pick = pool[(Date.now() + pool.length) % pool.length];
    setCurrentId(pick.id);
  }, [visible, currentId]);

  const resetProgress = useCallback(() => {
    setSolved(new Set());
    saveSolved(new Set());
  }, []);

  const solvedCount = solved.size;
  const total = CHALLENGES.length;
  const pct = Math.round((solvedCount / total) * 100);

  return (
    <Layout
      title="SQL Playground"
      description="Practise SQL against a sample store database - 50 challenges with instant answer checking, run live in your browser.">
      <main className={styles.page}>
        <div className={styles.header}>
          <Heading as="h1" className={styles.title}>
            SQL Playground
          </Heading>
          <p className={styles.lede}>
            50 query challenges against a sample store database. Read the task,
            write the query, press <kbd>Run</kbd>. Your result is checked against
            the expected answer instantly. Click the grid icon in the runner to
            see every table and column.
          </p>
          <div className={styles.progress}>
            <div className={styles.progressBar}>
              <span className={styles.progressFill} style={{width: `${pct}%`}} />
            </div>
            <span className={styles.progressLabel}>
              {solvedCount} / {total} solved
            </span>
            {solvedCount > 0 && (
              <button
                type="button"
                className={styles.resetLink}
                onClick={resetProgress}>
                Reset
              </button>
            )}
          </div>
        </div>

        <div className={styles.layout}>
          <aside className={styles.sidebar} aria-label="Challenge list">
            <div className={styles.filters} role="tablist" aria-label="Filter by difficulty">
              {(['All', ...DIFFICULTIES] as Filter[]).map((f) => (
                <button
                  key={f}
                  type="button"
                  className={`${styles.filterBtn} ${filter === f ? styles.filterActive : ''}`}
                  aria-pressed={filter === f}
                  onClick={() => setFilter(f)}>
                  {f}
                </button>
              ))}
            </div>
            <ol className={styles.list}>
              {visible.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    className={`${styles.listItem} ${c.id === currentId ? styles.listActive : ''}`}
                    aria-current={c.id === currentId}
                    onClick={() => setCurrentId(c.id)}>
                    <span
                      className={`${styles.check} ${solved.has(c.id) ? styles.checkDone : ''}`}
                      aria-hidden="true">
                      {solved.has(c.id) ? '✓' : c.id}
                    </span>
                    <span className={styles.itemText}>{c.title}</span>
                    <span className={`${styles.diff} ${styles[`d${c.difficulty}`]}`}>
                      {c.difficulty[0]}
                    </span>
                  </button>
                </li>
              ))}
            </ol>
          </aside>

          <section className={styles.workspace} aria-live="polite">
            <div className={styles.taskHead}>
              <span className={styles.taskNum}>#{current.id}</span>
              <Heading as="h2" className={styles.taskTitle}>
                {current.title}
              </Heading>
              {solved.has(current.id) && (
                <span className={styles.solvedTag}>✓ Solved</span>
              )}
            </div>

            <div className={styles.badges}>
              <span className={`${styles.badge} ${styles[`d${current.difficulty}`]}`}>
                {current.difficulty}
              </span>
              <span className={styles.topic}>{current.topic}</span>
            </div>

            <p className={styles.prompt}>{current.prompt}</p>

            {current.hint && (
              <details className={styles.hint}>
                <summary>Need a hint?</summary>
                <p>{current.hint}</p>
              </details>
            )}

            <SqlRunner
              key={current.id}
              query={starter(current)}
              schema={SCHEMA_SQL}
              solution={current.solution}
              ordered={current.ordered ?? false}
              height={150}
              onVerdict={markSolved}
            />

            <div className={styles.nav}>
              <button type="button" className={styles.navBtn} onClick={() => go(-1)}>
                <ChevronLeft />
                Previous
              </button>
              <button type="button" className={styles.navBtn} onClick={random}>
                <Shuffle />
                Surprise me
              </button>
              <button type="button" className={styles.navBtn} onClick={() => go(1)}>
                Next
                <ChevronRight />
              </button>
            </div>
          </section>
        </div>
      </main>
    </Layout>
  );
}

export default Playground;
