import React from 'react';
import Editor from 'react-simple-code-editor';
import SuggestionList from './SuggestionList';
import type {SugItem, SugState} from '../types';
import styles from '../styles.module.css';

type Props = {
  value: string;
  onValueChange: (v: string) => void;
  setQuery: (v: string) => void;
  highlight: (code: string) => React.ReactNode;
  height: number;
  editorWrapRef: React.RefObject<HTMLDivElement | null>;
  onRun: () => void;
  onBlur: () => void;
  /** Autocomplete nav handler; returns true when it consumed the event. */
  onNavKeyDown: (e: React.KeyboardEvent) => boolean;
  sug: SugState | null;
  listId: string;
  onHover: (index: number) => void;
  onPick: (item: SugItem) => void;
};

// Ctrl/Cmd+/ - toggle `-- ` line comments over the selected lines.
function toggleComment(ta: HTMLTextAreaElement, setQuery: (v: string) => void) {
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
    return allCommented ? l.replace(commented, '$1') : l.replace(/^(\s*)/, '$1-- ');
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

// The SQL editor (syntax-highlighted textarea) plus its autocomplete dropdown.
export default function SqlEditor({
  value,
  onValueChange,
  setQuery,
  highlight,
  height,
  editorWrapRef,
  onRun,
  onBlur,
  onNavKeyDown,
  sug,
  listId,
  onHover,
  onPick,
}: Props) {
  return (
    <div className={styles.editorWrap} ref={editorWrapRef}>
      <Editor
        value={value}
        onValueChange={onValueChange}
        highlight={highlight}
        onKeyDown={(e) => {
          if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            e.preventDefault();
            onRun();
            return;
          }
          if (onNavKeyDown(e)) return;
          if ((e.ctrlKey || e.metaKey) && e.key === '/') {
            e.preventDefault();
            toggleComment(e.currentTarget as HTMLTextAreaElement, setQuery);
          }
        }}
        onBlur={onBlur}
        padding={12}
        textareaClassName={styles.editorArea}
        aria-label="SQL query editor. Press Control or Command plus Enter to run. Type to see suggestions."
        style={{
          fontFamily: 'var(--ifm-font-family-monospace)',
          fontSize: '0.9rem',
          minHeight: height,
        }}
      />
      {sug && sug.items.length > 0 && (
        <SuggestionList sug={sug} listId={listId} onHover={onHover} onPick={onPick} />
      )}
    </div>
  );
}
