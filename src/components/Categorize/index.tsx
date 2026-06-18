import React, {useState} from 'react';
import styles from './styles.module.css';

export type CategorizeItem = {
  text: string;
  /** Must exactly match one of the `categories` strings. */
  category: string;
};

export default function Categorize({
  categories,
  items,
  prompt = 'Tap the category you think each item belongs to.',
}: {
  categories: [string, string];
  items: CategorizeItem[];
  prompt?: string;
}) {
  const [picks, setPicks] = useState<Record<number, string>>({});

  function pick(i: number, cat: string) {
    if (picks[i]) return; // lock once answered
    setPicks((prev) => ({...prev, [i]: cat}));
  }

  const answered = Object.keys(picks).length;
  const right = items.filter((it, i) => picks[i] === it.category).length;

  return (
    <div className={styles.box}>
      <p className={styles.prompt}>{prompt}</p>
      <ul className={styles.list}>
        {items.map((it, i) => {
          const chosen = picks[i];
          const isRight = chosen === it.category;
          return (
            <li key={i} className={styles.row}>
              <span className={styles.text}>{it.text}</span>
              <span
                className={`${styles.tag} ${
                  chosen ? (isRight ? styles.ok : styles.no) : ''
                }`}
                aria-live="polite">
                {chosen ? (isRight ? 'Correct' : `It is ${it.category}`) : ''}
              </span>
              <span className={styles.btns}>
                {categories.map((cat) => {
                  let state = '';
                  if (chosen) {
                    if (cat === it.category) state = styles.right;
                    else if (cat === chosen) state = styles.wrong;
                  }
                  return (
                    <button
                      key={cat}
                      type="button"
                      className={`${styles.btn} ${state}`}
                      onClick={() => pick(i, cat)}
                      disabled={!!chosen}>
                      {cat}
                    </button>
                  );
                })}
              </span>
            </li>
          );
        })}
      </ul>
      {answered === items.length && (
        <p className={styles.score} role="status">
          {right} / {items.length} correct.
        </p>
      )}
    </div>
  );
}
