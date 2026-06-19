import React from 'react';
import type {TableSchema} from '../types';
import styles from '../styles.module.css';

// Collapsible grid of the live tables and their columns.
export default function SchemaPanel({schema}: {schema: TableSchema[]}) {
  return (
    <div className={styles.schema}>
      {schema.map((t) => (
        <div className={styles.schemaTable} key={t.table}>
          <div className={styles.schemaName}>
            {t.table}
            <span className={styles.schemaCount}>{t.cols.length}</span>
          </div>
          <ul className={styles.schemaCols}>
            {t.cols.map((c) => (
              <li className={styles.schemaCol} key={c.name}>
                <span className={styles.colName}>{c.name}</span>
                <span className={styles.colMeta}>
                  <span className={styles.colType}>{c.type || 'any'}</span>
                  {c.pk && <span className={styles.pk}>PK</span>}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
