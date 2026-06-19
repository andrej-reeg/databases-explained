import React from 'react';
import type {ResultSet, Verdict} from '../types';
import styles from '../styles.module.css';

type Props = {
  error: string;
  verdict: Verdict;
  message: string;
  results: ResultSet[] | null;
  onExportCsv: () => void;
};

// Everything shown below the editor: error, solution verdict, the row-count
// message + CSV export, and the result tables.
export default function Results({error, verdict, message, results, onExportCsv}: Props) {
  return (
    <>
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
            <button type="button" className={styles.csvBtn} onClick={onExportCsv}>
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
    </>
  );
}
