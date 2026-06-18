import {type ReactNode, useEffect, useState} from 'react';
import clsx from 'clsx';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import useBaseUrl from '@docusaurus/useBaseUrl';
import Layout from '@theme/Layout';
import Heading from '@theme/Heading';

import {countDone, onProgressChange, resetProgress} from '@site/src/lib/progress';
import styles from './index.module.css';

type Stage = {
  num: string;
  title: string;
  blurb: string;
  to: string;
  prefix: string;
  total: number;
};

const STAGES: Stage[] = [
  {
    num: '0',
    title: 'Orientation',
    blurb: 'What data and databases are, and how the main types differ - relational, NoSQL, vector, OLTP vs OLAP.',
    to: '/docs/intro',
    prefix: '/docs/intro',
    total: 1,
  },
  {
    num: '1',
    title: 'Speaking SQL',
    blurb: 'Query, filter, aggregate, join, subquery, and window - run every example live in your browser.',
    to: '/docs/speaking-sql/',
    prefix: '/docs/speaking-sql',
    total: 10,
  },
  {
    num: '2',
    title: 'Designing a Database',
    blurb: 'DDL and functions, then ER modeling, keys, and normalization driven by real anomalies.',
    to: '/docs/designing/',
    prefix: '/docs/designing',
    total: 6,
  },
  {
    num: '3',
    title: 'Correct & Fast',
    blurb: 'Indexes and query plans, plus transactions and isolation - the production-ready milestone.',
    to: '/docs/correct-and-fast/',
    prefix: '/docs/correct-and-fast',
    total: 4,
  },
  {
    num: '4',
    title: 'Databases in Real Apps',
    blurb: 'Access control, ORMs and migrations, pooling, SQL injection, caching, and operations.',
    to: '/docs/real-apps/',
    prefix: '/docs/real-apps',
    total: 9,
  },
  {
    num: '5',
    title: 'Beyond Relational',
    blurb: 'Transactional vs analytical workloads, warehousing, NoSQL modeling, and JSON in SQL.',
    to: '/docs/beyond-relational/',
    prefix: '/docs/beyond-relational',
    total: 7,
  },
  {
    num: '6',
    title: 'Scaling & Advanced',
    blurb: 'Replication, sharding, CAP and consistency, concurrency internals, and vector search with RAG.',
    to: '/docs/scaling/',
    prefix: '/docs/scaling',
    total: 5,
  },
  {
    num: '7',
    title: 'Capstone',
    blurb: 'Build a bookstore database from scratch - design, query, index, and secure it end to end.',
    to: '/docs/capstone',
    prefix: '/docs/capstone',
    total: 1,
  },
];

const HIGHLIGHTS = [
  {
    title: 'Run real SQL, no install',
    body: 'Editable query boxes run a real SQLite database in your browser. Edit, press Run, see results.',
    icon: (
      <svg viewBox="0 0 24 24" width="34" height="34" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <polyline points="4 17 10 11 4 5" />
        <line x1="12" y1="19" x2="20" y2="19" />
      </svg>
    ),
  },
  {
    title: 'Up to date for 2026',
    body: 'Vector search and RAG, NewSQL, serverless databases, and the modern defaults. Not a decade-old syllabus.',
    icon: (
      <svg viewBox="0 0 24 24" width="34" height="34" fill="currentColor" aria-hidden="true">
        <path d="M12 2l2.1 6.4H21l-5.5 4 2.1 6.6L12 15.2 6.4 19l2.1-6.6L3 8.4h6.9z" />
      </svg>
    ),
  },
  {
    title: 'Learn by doing',
    body: 'Interactive checks, answer-verifying exercises, and a short quiz at the end of every lesson.',
    icon: (
      <svg viewBox="0 0 24 24" width="34" height="34" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="12" cy="12" r="9" />
        <polyline points="8 12 11 15 16 9" />
      </svg>
    ),
  },
];

function HomepageHeader() {
  const {siteConfig} = useDocusaurusContext();
  return (
    <header className={clsx('hero', styles.heroBanner)}>
      <div className="container">
        <img
          src={useBaseUrl('/img/logo.svg')}
          alt=""
          width={76}
          height={76}
          className={styles.heroLogo}
        />
        <Heading as="h1" className={styles.heroTitle}>
          {siteConfig.title}
        </Heading>
        <p className={styles.heroSubtitle}>{siteConfig.tagline}</p>
        <p className={styles.heroLede}>
          Learn databases by doing. Start from the basics and go all the way to
          modern distributed and AI databases, writing real SQL in your browser
          as you go.
        </p>
        <div className={styles.buttons}>
          <Link className="button button--primary button--lg" to="/docs/intro">
            Start learning
          </Link>
        </div>
      </div>
    </header>
  );
}

function Highlights() {
  return (
    <section className={styles.highlights}>
      <div className="container">
        <div className="row">
          {HIGHLIGHTS.map((h) => (
            <div className="col col--4" key={h.title}>
              <div className={styles.highlightCard}>
                <span className={styles.highlightIcon}>{h.icon}</span>
                <Heading as="h3" className={styles.highlightTitle}>
                  {h.title}
                </Heading>
                <p className={styles.highlightBody}>{h.body}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function StagePath() {
  // Progress is client-only (localStorage). Starts at 0 for SSR, fills in after mount.
  const [done, setDoneCounts] = useState<number[]>(() => STAGES.map(() => 0));

  useEffect(() => {
    const recompute = () =>
      setDoneCounts(
        STAGES.map((s) =>
          Math.min(s.total, countDone((id) => id.startsWith(s.prefix))),
        ),
      );
    recompute();
    return onProgressChange(recompute);
  }, []);

  const totalLessons = STAGES.reduce((n, s) => n + s.total, 0);
  const totalDone = done.reduce((n, d) => n + d, 0);

  return (
    <section className={styles.stages}>
      <div className="container">
        <Heading as="h2" className={styles.stagesHeading}>
          The path
        </Heading>
        <p className={styles.stagesIntro}>
          Each stage builds on the last. Start at the top, or jump to what you
          need.
          {totalDone > 0 && (
            <>
              {' '}
              <strong>
                {totalDone} / {totalLessons} lessons done.
              </strong>{' '}
              <button type="button" className={styles.resetLink} onClick={resetProgress}>
                Reset progress
              </button>
            </>
          )}
        </p>
        <div className={styles.stageGrid}>
          {STAGES.map((s, i) => {
            const n = done[i];
            const pct = Math.round((n / s.total) * 100);
            const complete = n >= s.total;
            return (
              <Link key={s.num} to={s.to} className={styles.stageCard}>
                <span className={`${styles.stageNum} ${complete ? styles.stageNumDone : ''}`}>
                  {complete ? '✓' : s.num}
                </span>
                <span className={styles.stageBody}>
                  <span className={styles.stageTitle}>{s.title}</span>
                  <span className={styles.stageBlurb}>{s.blurb}</span>
                  <span className={styles.stageProgress} aria-label={`${n} of ${s.total} lessons done`}>
                    <span className={styles.stageBar}>
                      <span className={styles.stageBarFill} style={{width: `${pct}%`}} />
                    </span>
                    <span className={styles.stageCount}>
                      {n}/{s.total}
                    </span>
                  </span>
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export default function Home(): ReactNode {
  return (
    <Layout
      title="Learn databases, hands-on"
      description="A practical, current tutorial on data and databases - from SQL basics to distributed and vector databases, with a live in-browser SQL sandbox.">
      <HomepageHeader />
      <main>
        <Highlights />
        <StagePath />
      </main>
    </Layout>
  );
}
