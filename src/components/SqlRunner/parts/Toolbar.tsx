import React from 'react';
import styles from '../styles.module.css';

type Props = {
  hasSolution: boolean;
  ready: boolean;
  loading: boolean;
  showSchema: boolean;
  onToggleSchema: () => void;
  onFormat: () => void;
  onReset: () => void;
  onShowSolution: () => void;
  onRun: () => void;
};

// The action bar above the editor: schema toggle, format, reset, show-solution,
// and run.
export default function Toolbar({
  hasSolution,
  ready,
  loading,
  showSchema,
  onToggleSchema,
  onFormat,
  onReset,
  onShowSolution,
  onRun,
}: Props) {
  return (
    <div className={styles.bar}>
      <span className={styles.label}>{hasSolution ? 'Your answer' : 'Try it'}</span>
      <span className={styles.spacer} />
      <button
        type="button"
        className={`${styles.reset} ${styles.iconBtn}`}
        onClick={onToggleSchema}
        disabled={!ready}
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
        onClick={onFormat}
        disabled={!ready}
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
        onClick={onReset}
        disabled={!ready}
        aria-label="Reset data"
        title="Reset data">
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <polyline points="1 4 1 10 7 10" />
          <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
        </svg>
      </button>
      {hasSolution && (
        <button
          type="button"
          className={styles.reset}
          onClick={onShowSolution}
          disabled={!ready}>
          Show solution
        </button>
      )}
      <button
        type="button"
        className={styles.run}
        onClick={onRun}
        disabled={!ready}
        title="Run (Ctrl/Cmd+Enter)"
        aria-keyshortcuts="Control+Enter Meta+Enter">
        {loading ? 'Loading…' : 'Run'}
      </button>
    </div>
  );
}
