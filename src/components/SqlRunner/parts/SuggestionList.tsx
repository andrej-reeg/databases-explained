import React from 'react';
import type {SugState} from '../types';
import styles from '../styles.module.css';

type Props = {
  sug: SugState;
  listId: string;
  onHover: (index: number) => void;
  onPick: (item: SugState['items'][number]) => void;
};

// Floating autocomplete dropdown. Positioned (fixed) by the parent via sug.top/left.
export default function SuggestionList({sug, listId, onHover, onPick}: Props) {
  return (
    <ul
      className={styles.suggest}
      id={listId}
      style={{top: sug.top, left: sug.left}}
      role="listbox"
      aria-label="SQL suggestions">
      {sug.items.map((it, i) => (
        <li
          key={`${i}:${it.kind}:${it.text}`}
          id={`${listId}-opt-${i}`}
          role="option"
          aria-selected={i === sug.index}
          className={`${styles.suggestItem} ${i === sug.index ? styles.suggestActive : ''}`}
          onMouseDown={(e) => {
            // Keep focus in the textarea; accept on press.
            e.preventDefault();
            onPick(it);
          }}
          onMouseEnter={() => onHover(i)}>
          <span className={styles.suggestText}>{it.text}</span>
          <span className={styles.suggestKind}>{it.detail || it.kind}</span>
        </li>
      ))}
    </ul>
  );
}
