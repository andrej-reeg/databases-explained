import React, {useMemo, useState} from 'react';
import styles from './styles.module.css';

export type QuizOption = {
  text: string;
  correct?: boolean;
};

export type QuizQuestion = {
  /** The question prompt. */
  prompt: string;
  /** 2-5 answer options; mark the right one with correct: true. Display order is shuffled automatically. */
  options: QuizOption[];
  /** Shown after answering, for both right and wrong choices. */
  explanation?: string;
};

type Picked = number | null;

// Stable string hash - lets us shuffle option order deterministically so the
// same order renders on the server and the client (no hydration mismatch),
// while the correct answer no longer sits in a predictable position.
function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return h;
}

function Question({
  q,
  index,
  onResolved,
}: {
  q: QuizQuestion;
  index: number;
  onResolved: (correct: boolean) => void;
}) {
  const [picked, setPicked] = useState<Picked>(null);
  const answered = picked !== null;

  const options = useMemo(
    () =>
      [...q.options].sort(
        (a, b) => hash(q.prompt + a.text) - hash(q.prompt + b.text),
      ),
    [q],
  );

  function choose(i: number) {
    if (answered) return; // lock after first answer
    setPicked(i);
    onResolved(!!options[i].correct);
  }

  const pickedCorrect = answered && !!options[picked].correct;

  return (
    <div className={styles.question}>
      <p className={styles.prompt}>
        <span className={styles.qnum}>{index + 1}</span>
        {q.prompt}
      </p>
      <div className={styles.options} role="group" aria-label={q.prompt}>
        {options.map((opt, i) => {
          const isPicked = picked === i;
          let state = '';
          if (answered && opt.correct) state = styles.correct;
          else if (answered && isPicked && !opt.correct) state = styles.wrong;
          return (
            <button
              key={i}
              type="button"
              className={`${styles.option} ${state}`}
              onClick={() => choose(i)}
              disabled={answered}
              aria-pressed={isPicked}>
              <span className={styles.mark} aria-hidden="true">
                {answered && opt.correct ? '✓' : answered && isPicked ? '✕' : ''}
              </span>
              {opt.text}
            </button>
          );
        })}
      </div>
      {answered && (
        <div
          className={`${styles.feedback} ${
            pickedCorrect ? styles.feedbackOk : styles.feedbackNo
          }`}>
          <strong>{pickedCorrect ? 'Correct.' : 'Not quite.'}</strong>{' '}
          {q.explanation}
        </div>
      )}
    </div>
  );
}

export default function Quiz({
  title = 'Quick quiz',
  questions,
}: {
  title?: string;
  questions: QuizQuestion[];
}) {
  const [round, setRound] = useState(0);
  const [resolved, setResolved] = useState<Record<number, boolean>>({});
  const answeredCount = Object.keys(resolved).length;
  const score = Object.values(resolved).filter(Boolean).length;
  const done = answeredCount === questions.length;

  function reset() {
    setResolved({});
    setRound((r) => r + 1); // remount questions to clear their picks
  }

  return (
    <section className={styles.quiz} aria-label={title}>
      <header className={styles.head}>
        <h3 className={styles.title}>{title}</h3>
        <span className={styles.tally} aria-live="polite">
          {answeredCount > 0
            ? `${score} / ${questions.length}`
            : `${questions.length} questions`}
        </span>
      </header>

      {questions.map((q, i) => (
        <Question
          key={`${round}-${i}`}
          q={q}
          index={i}
          onResolved={(correct) =>
            setResolved((prev) => ({...prev, [i]: correct}))
          }
        />
      ))}

      {done && (
        <div className={styles.resultRow}>
          <div className={styles.result} role="status">
            {score === questions.length
              ? `Perfect - ${score} / ${questions.length}. You have the fundamentals down.`
              : `You scored ${score} / ${questions.length}. Re-read the sections for the ones you missed, then try again.`}
          </div>
          <button type="button" className={styles.reset} onClick={reset}>
            Try again
          </button>
        </div>
      )}
    </section>
  );
}
