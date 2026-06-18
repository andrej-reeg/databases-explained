import {type ReactNode, useEffect, useRef, useState} from 'react';
import Footer from '@theme-original/DocItem/Footer';
import type FooterType from '@theme/DocItem/Footer';
import type {WrapperProps} from '@docusaurus/types';
import {useDoc} from '@docusaurus/plugin-content-docs/client';
import {isDone, setDone} from '@site/src/lib/progress';
import styles from './styles.module.css';

type Props = WrapperProps<typeof FooterType>;

// Auto-marks the lesson complete once the reader scrolls its end into view -
// no button to click. A subtle chip confirms it (with an undo).
export default function FooterWrapper(props: Props): ReactNode {
  const {metadata} = useDoc();
  const id = metadata.permalink;
  const ref = useRef<HTMLDivElement>(null);
  const [done, setDoneState] = useState(false);

  useEffect(() => {
    setDoneState(isDone(id));
  }, [id]);

  useEffect(() => {
    if (isDone(id)) return;
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setDone(id, true);
          setDoneState(true);
          obs.disconnect();
        }
      },
      {threshold: 0.1},
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [id]);

  return (
    <div ref={ref}>
      <div className={styles.status} aria-live="polite">
        {done && (
          <span className={styles.chip}>
            <span className={styles.check} aria-hidden="true">
              <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </span>
            Lesson complete
            <button
              type="button"
              className={styles.undo}
              onClick={() => {
                setDone(id, false);
                setDoneState(false);
              }}>
              undo
            </button>
          </span>
        )}
      </div>
      <Footer {...props} />
    </div>
  );
}
