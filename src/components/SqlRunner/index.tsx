import React, {useEffect, useRef, useState} from 'react';
import BrowserOnly from '@docusaurus/BrowserOnly';
import useBaseUrl from '@docusaurus/useBaseUrl';
import {useColorMode} from '@docusaurus/theme-common';
import Editor from 'react-simple-code-editor';
import {Highlight, themes, type PrismTheme} from 'prism-react-renderer';
import {SEED_SQL, DEFAULT_QUERY} from './schema';
import styles from './styles.module.css';

type ResultSet = {columns: string[]; values: unknown[][]};
type Verdict = 'none' | 'correct' | 'wrong';

// Highlight SQL with prism-react-renderer (the same engine Docusaurus uses, so
// the SQL grammar is guaranteed present) and colour tokens inline from the
// theme - works in light and dark with no extra CSS.
function makeHighlighter(theme: PrismTheme) {
  return (code: string) => (
    <Highlight code={code} language="sql" theme={theme}>
      {({tokens, getLineProps, getTokenProps}) => (
        <>
          {tokens.map((line, i) => (
            <span {...getLineProps({line})} key={i}>
              {line.map((token, key) => (
                <span {...getTokenProps({token})} key={key} />
              ))}
              {i < tokens.length - 1 ? '\n' : ''}
            </span>
          ))}
        </>
      )}
    </Highlight>
  );
}

// Compare two result sets by value (ignoring column names). Order-insensitive
// unless `ordered`, so set-style answers still match regardless of row order.
function matches(a: ResultSet, b: ResultSet, ordered: boolean): boolean {
  if (a.values.length !== b.values.length) return false;
  let A = a.values.map((r) => JSON.stringify(r));
  let B = b.values.map((r) => JSON.stringify(r));
  if (!ordered) {
    A = [...A].sort();
    B = [...B].sort();
  }
  return A.every((x, i) => x === B[i]);
}

function hashStr(s: string): string {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}

function toCsv(rs: ResultSet): string {
  const esc = (v: unknown) => {
    const s = v === null || v === undefined ? '' : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const head = rs.columns.map(esc).join(',');
  const rows = rs.values.map((r) => r.map(esc).join(','));
  return [head, ...rows].join('\n');
}

function download(filename: string, text: string): void {
  const blob = new Blob([text], {type: 'text/csv;charset=utf-8'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function Runner({
  initialQuery,
  schema,
  solution,
  ordered,
  height,
  onVerdict,
}: {
  initialQuery: string;
  schema: string;
  solution?: string;
  ordered: boolean;
  height: number;
  onVerdict?: (verdict: 'correct' | 'wrong') => void;
}) {
  const wasmUrl = useBaseUrl('/sql-wasm.wasm');
  const {colorMode} = useColorMode();
  const highlightSql = makeHighlighter(
    colorMode === 'dark' ? themes.vsDark : themes.github,
  );
  const dbRef = useRef<any>(null);
  const SqlRef = useRef<any>(null);

  // Persist this box's edits across reloads, keyed by page + initial query.
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
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [results, setResults] = useState<ResultSet[] | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [verdict, setVerdict] = useState<Verdict>('none');
  const [showSchema, setShowSchema] = useState(false);

  // Read the current schema (tables + columns) straight from the live DB.
  function getSchema(): {table: string; cols: {name: string; type: string; pk: boolean}[]}[] {
    const db = dbRef.current;
    if (!db) return [];
    try {
      const tables = db.exec(
        "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name",
      );
      const names: string[] = tables[0]?.values.map((r: unknown[]) => String(r[0])) ?? [];
      return names.map((table) => {
        const info = db.exec(`PRAGMA table_info("${table}")`);
        const cols = (info[0]?.values ?? []).map((r: unknown[]) => ({
          name: String(r[1]),
          type: String(r[2] || ''),
          pk: Number(r[5]) > 0,
        }));
        return {table, cols};
      });
    } catch {
      return [];
    }
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const initSqlJs = (await import('sql.js')).default;
        const SQL = await initSqlJs({locateFile: () => wasmUrl});
        if (cancelled) return;
        SqlRef.current = SQL;
        const db = new SQL.Database();
        db.run(schema);
        dbRef.current = db;
        setStatus('ready');
      } catch (e: any) {
        if (!cancelled) {
          setError(String(e?.message ?? e));
          setStatus('error');
        }
      }
    })();
    return () => {
      cancelled = true;
      try {
        dbRef.current?.close();
      } catch {}
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Run the canonical solution on a throwaway DB so the learner's own writes
  // never affect what we compare against.
  function expectedResult(): ResultSet | null {
    const SQL = SqlRef.current;
    if (!SQL || !solution) return null;
    const tdb = new SQL.Database();
    try {
      tdb.run(schema);
      const r = tdb.exec(solution) as ResultSet[];
      return r.length ? r[r.length - 1] : null;
    } finally {
      tdb.close();
    }
  }

  function run() {
    const db = dbRef.current;
    if (!db) return;
    setError('');
    setMessage('');
    setResults(null);
    setVerdict('none');
    try {
      const res = db.exec(query) as ResultSet[];
      if (res.length > 0) {
        setResults(res);
        const last = res[res.length - 1];
        setMessage(`${last.values.length} row${last.values.length === 1 ? '' : 's'} returned.`);
        if (solution) {
          const exp = expectedResult();
          const v = exp && matches(last, exp, ordered) ? 'correct' : 'wrong';
          setVerdict(v);
          onVerdict?.(v);
        }
      } else {
        const changed = db.getRowsModified();
        setMessage(`Statement ran. ${changed} row${changed === 1 ? '' : 's'} changed.`);
        if (solution) {
          setVerdict('wrong'); // expected a result to check
          onVerdict?.('wrong');
        }
      }
    } catch (e: any) {
      setError(String(e?.message ?? e));
    }
  }

  // Ctrl/Cmd+/ - toggle `-- ` line comments over the selected lines.
  function toggleComment(ta: HTMLTextAreaElement) {
    const {selectionStart, selectionEnd, value} = ta;
    const lineStart = value.lastIndexOf('\n', selectionStart - 1) + 1;
    let lineEnd = value.indexOf('\n', selectionEnd);
    if (lineEnd === -1) lineEnd = value.length;

    const segment = value.slice(lineStart, lineEnd);
    const lines = segment.split('\n');
    const commented = /^(\s*)--\s?/;
    const allCommented = lines.every((l) => l.trim() === '' || commented.test(l));

    const newLines = lines.map((l) => {
      if (l.trim() === '') return l;
      return allCommented
        ? l.replace(commented, '$1')
        : l.replace(/^(\s*)/, '$1-- ');
    });

    const newSegment = newLines.join('\n');
    const newValue = value.slice(0, lineStart) + newSegment + value.slice(lineEnd);
    setQuery(newValue);

    const delta = newSegment.length - segment.length;
    requestAnimationFrame(() => {
      ta.selectionStart = lineStart;
      ta.selectionEnd = selectionEnd + delta;
    });
  }

  // Save edits (debounced via the effect below).
  useEffect(() => {
    if (storageKey) {
      try {
        window.localStorage.setItem(storageKey, query);
      } catch {}
    }
  }, [query, storageKey]);

  async function formatSql() {
    try {
      const {format} = await import('sql-formatter');
      setQuery(format(query, {language: 'sqlite'}));
    } catch {}
  }

  function exportCsv() {
    const rs = results && results[results.length - 1];
    if (!rs) return;
    download('query-result.csv', toCsv(rs));
  }

  function resetDb() {
    const SQL = SqlRef.current;
    if (!SQL) return;
    try {
      dbRef.current?.close();
    } catch {}
    const db = new SQL.Database();
    db.run(schema);
    dbRef.current = db;
    setResults(null);
    setError('');
    setVerdict('none');
    setMessage('Database reset to its starting data.');
  }

  return (
    <div className={styles.runner}>
      <div className={styles.bar}>
        <span className={styles.label}>
          {solution ? 'Your answer' : 'Try it'}
        </span>
        <span className={styles.spacer} />
        <button
          type="button"
          className={`${styles.reset} ${styles.iconBtn}`}
          onClick={() => setShowSchema((s) => !s)}
          disabled={status !== 'ready'}
          aria-pressed={showSchema}
          aria-label={showSchema ? 'Hide schema' : 'Show schema'}
          title={showSchema ? 'Hide schema' : 'Show schema'}>
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <line x1="3" y1="9" x2="21" y2="9" />
            <line x1="9" y1="9" x2="9" y2="21" />
          </svg>
        </button>
        <button
          type="button"
          className={`${styles.reset} ${styles.iconBtn}`}
          onClick={formatSql}
          disabled={status !== 'ready'}
          aria-label="Format SQL"
          title="Format SQL">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <line x1="4" y1="6" x2="20" y2="6" />
            <line x1="4" y1="12" x2="14" y2="12" />
            <line x1="4" y1="18" x2="18" y2="18" />
          </svg>
        </button>
        <button
          type="button"
          className={`${styles.reset} ${styles.iconBtn}`}
          onClick={resetDb}
          disabled={status !== 'ready'}
          aria-label="Reset data"
          title="Reset data">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polyline points="1 4 1 10 7 10" />
            <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
          </svg>
        </button>
        {solution && (
          <button
            type="button"
            className={styles.reset}
            onClick={() => setQuery(solution)}
            disabled={status !== 'ready'}>
            Show solution
          </button>
        )}
        <button
          type="button"
          className={styles.run}
          onClick={run}
          disabled={status !== 'ready'}
          title="Run (Ctrl/Cmd+Enter)"
          aria-keyshortcuts="Control+Enter Meta+Enter">
          {status === 'loading' ? 'Loading…' : 'Run'}
        </button>
      </div>

      {showSchema && (
        <div className={styles.schema}>
          {getSchema().map((t) => (
            <div className={styles.schemaTable} key={t.table}>
              <div className={styles.schemaName}>
                {t.table}
                <span className={styles.schemaCount}>{t.cols.length}</span>
              </div>
              <ul className={styles.schemaCols}>
                {t.cols.map((c) => (
                  <li className={styles.schemaCol} key={c.name}>
                    <span className={styles.colName}>{c.name}</span>
                    <span className={styles.colMeta}>
                      <span className={styles.colType}>{c.type || 'any'}</span>
                      {c.pk && <span className={styles.pk}>PK</span>}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}

      <div className={styles.editorWrap}>
        <Editor
          value={query}
          onValueChange={setQuery}
          highlight={highlightSql}
          onKeyDown={(e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
              e.preventDefault();
              run();
            } else if ((e.ctrlKey || e.metaKey) && e.key === '/') {
              e.preventDefault();
              toggleComment(e.currentTarget as HTMLTextAreaElement);
            }
          }}
          padding={12}
          textareaClassName={styles.editorArea}
          aria-label="SQL query editor. Press Control or Command plus Enter to run."
          style={{
            fontFamily: 'var(--ifm-font-family-monospace)',
            fontSize: '0.9rem',
            minHeight: height,
          }}
        />
      </div>

      {error && (
        <pre className={styles.error} role="alert">
          {error}
        </pre>
      )}

      {verdict === 'correct' && (
        <p className={`${styles.verdict} ${styles.vOk}`} role="status">
          ✓ Correct - your result matches the expected answer.
        </p>
      )}
      {verdict === 'wrong' && (
        <p className={`${styles.verdict} ${styles.vNo}`} role="status">
          ✕ Not a match yet. Check the columns and rows, then try again.
        </p>
      )}

      {message && !error && (
        <div className={styles.resultBar}>
          <span className={styles.message}>{message}</span>
          {results && results.length > 0 && (
            <button type="button" className={styles.csvBtn} onClick={exportCsv}>
              Export CSV
            </button>
          )}
        </div>
      )}

      {results?.map((rs, i) => (
        <div className={styles.tableWrap} key={i}>
          <table className={styles.table} aria-label={`Query result ${i + 1}`}>
            <thead>
              <tr>
                {rs.columns.map((c) => (
                  <th key={c}>{c}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rs.values.map((row, r) => (
                <tr key={r}>
                  {row.map((cell, c) => (
                    <td key={c}>{cell === null ? <em>NULL</em> : String(cell)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}

export default function SqlRunner({
  query = DEFAULT_QUERY,
  schema = SEED_SQL,
  solution,
  ordered = false,
  height = 120,
  onVerdict,
}: {
  query?: string;
  schema?: string;
  /** Canonical SQL whose result the learner's query is checked against. */
  solution?: string;
  /** Require the same row order (set for ORDER BY exercises). */
  ordered?: boolean;
  height?: number;
  /** Fired after a solution-checked run, with the resulting verdict. */
  onVerdict?: (verdict: 'correct' | 'wrong') => void;
}) {
  return (
    <BrowserOnly fallback={<div className={styles.runner}>Loading SQL sandbox…</div>}>
      {() => (
        <Runner
          initialQuery={query}
          schema={schema}
          solution={solution}
          ordered={ordered}
          height={height}
          onVerdict={onVerdict}
        />
      )}
    </BrowserOnly>
  );
}
