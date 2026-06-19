import React, {useRef, useState} from 'react';
import BrowserOnly from '@docusaurus/BrowserOnly';
import {useColorMode} from '@docusaurus/theme-common';
import {themes} from 'prism-react-renderer';
import {SEED_SQL, DEFAULT_QUERY} from './schema';
import {makeHighlighter} from './lib/highlight';
import {matches, toCsv, download} from './lib/result';
import {useSqlDatabase} from './hooks/useSqlDatabase';
import {usePersistentQuery} from './hooks/usePersistentQuery';
import {useAutocomplete} from './hooks/useAutocomplete';
import Toolbar from './parts/Toolbar';
import SchemaPanel from './parts/SchemaPanel';
import SqlEditor from './parts/SqlEditor';
import Results from './parts/Results';
import type {ResultSet, Verdict} from './types';
import styles from './styles.module.css';

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
  const {colorMode} = useColorMode();
  const highlight = makeHighlighter(colorMode === 'dark' ? themes.vsDark : themes.github);

  const [query, setQuery] = usePersistentQuery(initialQuery);
  const db = useSqlDatabase(schema);
  const editorWrapRef = useRef<HTMLDivElement | null>(null);
  const ac = useAutocomplete({editorWrapRef, vocabRef: db.vocabRef, setQuery});

  const [results, setResults] = useState<ResultSet[] | null>(null);
  const [message, setMessage] = useState('');
  const [verdict, setVerdict] = useState<Verdict>('none');
  const [showSchema, setShowSchema] = useState(false);

  const ready = db.status === 'ready';

  function run() {
    if (!ready) return;
    db.setError('');
    setMessage('');
    setResults(null);
    setVerdict('none');
    try {
      const res = db.exec(query);
      if (res.length > 0) {
        setResults(res);
        const last = res[res.length - 1];
        setMessage(`${last.values.length} row${last.values.length === 1 ? '' : 's'} returned.`);
        if (solution) {
          const exp = db.expected(solution);
          const v = exp && matches(last, exp, ordered) ? 'correct' : 'wrong';
          setVerdict(v);
          onVerdict?.(v);
        }
      } else {
        const changed = db.rowsModified();
        setMessage(`Statement ran. ${changed} row${changed === 1 ? '' : 's'} changed.`);
        if (solution) {
          setVerdict('wrong'); // expected a result to check
          onVerdict?.('wrong');
        }
      }
    } catch (e: any) {
      db.setError(String(e?.message ?? e));
    }
  }

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
    db.reset();
    setResults(null);
    setVerdict('none');
    setMessage('Database reset to its starting data.');
  }

  return (
    <div className={styles.runner}>
      <Toolbar
        hasSolution={!!solution}
        ready={ready}
        loading={db.status === 'loading'}
        showSchema={showSchema}
        onToggleSchema={() => setShowSchema((s) => !s)}
        onFormat={formatSql}
        onReset={resetDb}
        onShowSolution={() => solution && setQuery(solution)}
        onRun={run}
      />

      {showSchema && <SchemaPanel schema={db.getSchema()} />}

      <SqlEditor
        value={query}
        onValueChange={ac.onEditorChange}
        setQuery={setQuery}
        highlight={highlight}
        height={height}
        editorWrapRef={editorWrapRef}
        onRun={run}
        onBlur={ac.onEditorBlur}
        onNavKeyDown={ac.handleKeyDown}
        sug={ac.sug}
        listId={ac.listId}
        onHover={ac.setActive}
        onPick={ac.accept}
      />

      <Results
        error={db.error}
        verdict={verdict}
        message={message}
        results={results}
        onExportCsv={exportCsv}
      />
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
