import {useEffect, useRef, useState} from 'react';
import useBaseUrl from '@docusaurus/useBaseUrl';
import type {ResultSet, TableSchema, Vocab} from '../types';

type Status = 'loading' | 'ready' | 'error';

/**
 * Owns the in-browser SQLite database (sql.js): loads the WASM, seeds the
 * schema, and exposes querying + schema introspection + the autocomplete
 * vocabulary. Query-level errors are returned to the caller via `exec` throwing;
 * load-level errors set status to 'error' and populate `error`.
 */
export function useSqlDatabase(schema: string) {
  const wasmUrl = useBaseUrl('/sql-wasm.wasm');
  const dbRef = useRef<any>(null);
  const SqlRef = useRef<any>(null);
  const [status, setStatus] = useState<Status>('loading');
  const [error, setError] = useState('');
  const vocabRef = useRef<Vocab>({tables: [], cols: [], byTable: {}});

  // Read the current schema (tables + columns) straight from the live DB.
  function getSchema(): TableSchema[] {
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

  // Rebuild the autocomplete vocabulary from the live schema (run after DDL).
  function rebuildVocab() {
    const sch = getSchema();
    const colMap = new Map<string, string[]>();
    const byTable: Record<string, string[]> = {};
    sch.forEach((t) => {
      byTable[t.table] = t.cols.map((c) => c.name);
      t.cols.forEach((c) => {
        const arr = colMap.get(c.name) ?? [];
        arr.push(t.table);
        colMap.set(c.name, arr);
      });
    });
    vocabRef.current = {
      tables: sch.map((t) => t.table),
      cols: Array.from(colMap, ([name, tables]) => ({name, tables})),
      byTable,
    };
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
        rebuildVocab();
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

  // Execute SQL against the learner's DB. Throws on SQL error; rebuilds the
  // vocabulary afterwards so any DDL is reflected in suggestions.
  function exec(query: string): ResultSet[] {
    const db = dbRef.current;
    if (!db) return [];
    const res = db.exec(query) as ResultSet[];
    rebuildVocab();
    return res;
  }

  function rowsModified(): number {
    return dbRef.current?.getRowsModified() ?? 0;
  }

  // Run the canonical solution on a throwaway DB so the learner's own writes
  // never affect what we compare against.
  function expected(solution: string): ResultSet | null {
    const SQL = SqlRef.current;
    if (!SQL) return null;
    const tdb = new SQL.Database();
    try {
      tdb.run(schema);
      const r = tdb.exec(solution) as ResultSet[];
      return r.length ? r[r.length - 1] : null;
    } finally {
      tdb.close();
    }
  }

  // Recreate the database from the seed schema.
  function reset() {
    const SQL = SqlRef.current;
    if (!SQL) return;
    try {
      dbRef.current?.close();
    } catch {}
    const db = new SQL.Database();
    db.run(schema);
    dbRef.current = db;
    rebuildVocab();
    setError('');
  }

  return {status, error, setError, vocabRef, getSchema, exec, rowsModified, expected, reset};
}
