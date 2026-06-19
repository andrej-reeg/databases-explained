// Pure suggestion engine: given the editor text, caret offset and the live
// vocabulary, work out which clause the caret sits in, scope columns to the
// statement's FROM/JOIN, and return a ranked list. No React, no DOM - so it can
// be unit-tested in isolation.
import type {SugItem, Vocab} from '../types';

// SQL clauses, keywords and functions offered alongside live table/column names.
export const SQL_KEYWORDS = [
  'SELECT', 'FROM', 'WHERE', 'GROUP BY', 'ORDER BY', 'HAVING', 'LIMIT',
  'OFFSET', 'DISTINCT', 'AS', 'ON', 'USING', 'AND', 'OR', 'NOT', 'IN',
  'LIKE', 'BETWEEN', 'IS NULL', 'IS NOT NULL', 'EXISTS', 'CASE', 'WHEN',
  'THEN', 'ELSE', 'END', 'ASC', 'DESC', 'NULLS FIRST', 'NULLS LAST',
  'JOIN', 'INNER JOIN', 'LEFT JOIN', 'RIGHT JOIN', 'FULL JOIN',
  'CROSS JOIN', 'LEFT OUTER JOIN', 'UNION', 'UNION ALL', 'INTERSECT',
  'EXCEPT', 'WITH', 'WITH RECURSIVE', 'OVER', 'PARTITION BY',
  'INSERT INTO', 'VALUES', 'UPDATE', 'SET', 'DELETE FROM', 'CREATE TABLE',
  'ALTER TABLE', 'DROP TABLE', 'PRIMARY KEY', 'FOREIGN KEY', 'REFERENCES',
  'DEFAULT', 'CHECK', 'UNIQUE',
  'COUNT', 'SUM', 'AVG', 'MIN', 'MAX', 'ROUND', 'ABS', 'COALESCE',
  'NULLIF', 'CAST', 'LENGTH', 'LOWER', 'UPPER', 'TRIM', 'SUBSTR',
  'REPLACE', 'ROW_NUMBER', 'RANK', 'DENSE_RANK', 'NTILE', 'LAG', 'LEAD',
  'FIRST_VALUE', 'LAST_VALUE', 'STRFTIME', 'DATE', 'JULIANDAY',
];

const AGG = ['COUNT', 'SUM', 'AVG', 'MIN', 'MAX', 'DISTINCT', 'COALESCE', 'ROUND', 'CASE'];
const OPS = ['AND', 'OR', 'NOT', 'IN', 'LIKE', 'BETWEEN', 'IS NULL', 'IS NOT NULL'];

// Offered inside a CREATE TABLE column definition, never table/column names.
const DATA_TYPES = [
  'INTEGER', 'TEXT', 'REAL', 'BLOB', 'NUMERIC', 'BOOLEAN', 'DATE',
  'DATETIME', 'VARCHAR', 'CHAR', 'DECIMAL', 'FLOAT', 'DOUBLE',
];
const COL_CONSTRAINTS = [
  'PRIMARY KEY', 'NOT NULL', 'UNIQUE', 'DEFAULT', 'CHECK', 'REFERENCES',
  'COLLATE', 'AUTOINCREMENT', 'GENERATED ALWAYS AS',
];
const TABLE_CONSTRAINTS = ['PRIMARY KEY', 'FOREIGN KEY', 'UNIQUE', 'CHECK', 'CONSTRAINT'];

// Blank out comments and string literals so paren-depth/keyword scans aren't
// fooled by `--`, `/* */` or text inside quotes. Length is preserved.
function stripNoise(s: string): string {
  return s
    .replace(/--[^\n]*/g, (m) => ' '.repeat(m.length))
    .replace(/\/\*[\s\S]*?\*\//g, (m) => ' '.repeat(m.length))
    .replace(/'(?:[^']|'')*'/g, (m) => ' '.repeat(m.length));
}

// Words that can never be a table alias (so `FROM customers WHERE` doesn't read
// WHERE as an alias of customers).
const RESERVED = new Set([
  'ON', 'USING', 'WHERE', 'GROUP', 'ORDER', 'HAVING', 'LIMIT', 'AS', 'JOIN',
  'INNER', 'LEFT', 'RIGHT', 'FULL', 'OUTER', 'CROSS', 'NATURAL', 'UNION',
  'INTERSECT', 'EXCEPT', 'AND', 'OR', 'SET', 'VALUES', 'SELECT',
]);

type Mode = 'tables' | 'columns' | 'select' | 'keywords';

/**
 * Compute the ranked suggestion list for a collapsed caret at `pos`.
 * Returns null when nothing should be shown.
 */
export function computeSuggestions(
  value: string,
  pos: number,
  vocab: Vocab,
): {items: SugItem[]; word: string} | null {
  const before = value.slice(0, pos);
  const word = (before.match(/[A-Za-z_][A-Za-z0-9_]*$/) || [''])[0];
  const lw = word.toLowerCase();
  const head = before.slice(0, before.length - word.length);
  const prevChar = head.slice(-1);

  const {tables, cols, byTable} = vocab;

  // Restrict context to the statement under the caret (split on ';').
  const stmtStart = before.lastIndexOf(';') + 1;
  const rest = value.slice(pos);
  const semi = rest.indexOf(';');
  const stmt = value.slice(stmtStart, semi === -1 ? value.length : pos + semi);

  // Map every table + alias named in this statement's FROM/JOIN to its real
  // table, so `c.` and column lists can be scoped to what's actually in play.
  const findTable = (n: string) =>
    tables.find((t) => t.toLowerCase() === n.replace(/"/g, '').toLowerCase());
  const refMap = new Map<string, string>(); // alias|table (lower) -> real table
  const refRe =
    /(?:\bFROM\b|\bJOIN\b|,)\s*("?[A-Za-z_]\w*"?)(?:\s+(?:AS\s+)?("?[A-Za-z_]\w*"?))?/gi;
  let rm: RegExpExecArray | null;
  while ((rm = refRe.exec(stmt))) {
    const real = findTable(rm[1]);
    if (!real) continue; // skips SELECT-list commas and unknown names
    refMap.set(real.toLowerCase(), real);
    const alias = rm[2] ? rm[2].replace(/"/g, '') : '';
    if (alias && !RESERVED.has(alias.toUpperCase())) {
      refMap.set(alias.toLowerCase(), real);
    }
  }
  const scope = Array.from(new Set(refMap.values()));

  // ---- DDL / paren-aware contexts ------------------------------------------
  // Inside a CREATE TABLE column list, INSERT column list or CREATE INDEX
  // column list the generic clause logic is wrong (it offers table/column
  // names where data types, constraints, or a *specific* table's columns
  // belong). Detect those first and short-circuit.
  const bs = stripNoise(before.slice(stmtStart));
  const bsUp = bs.toUpperCase();
  const openStack: number[] = []; // indices of currently-open '('
  let lastTopComma = -1; // last comma at the outermost paren level
  for (let i = 0; i < bs.length; i++) {
    const c = bs[i];
    if (c === '(') openStack.push(i);
    else if (c === ')') openStack.pop();
    else if (c === ',' && openStack.length === 1) lastTopComma = i;
  }
  const depth = openStack.length;
  const openIdx = depth ? openStack[depth - 1] : -1;

  const colsOf = (real: string): SugItem[] =>
    (byTable[real] ?? []).map((name) => ({text: name, kind: 'column', detail: real}));

  let ddlBase: SugItem[] | null = null;
  if (prevChar !== '.' && depth >= 1) {
    if (/^\s*CREATE\s+(?:TEMP(?:ORARY)?\s+)?TABLE\b/i.test(bs)) {
      if (depth >= 2) {
        // Nested paren: only `REFERENCES <table>( … )` references real columns.
        const refM = bs.slice(0, openIdx).match(/\bREFERENCES\s+("?[A-Za-z_]\w*"?)\s*$/i);
        const real = refM ? findTable(refM[1]) : undefined;
        if (real) ddlBase = colsOf(real);
        else return null; // CHECK(expr) etc. — never offer tables/columns here
      } else {
        // Top-level column-definition list: name -> type -> constraints.
        const fragStart = Math.max(openIdx, lastTopComma);
        const tokens = bs.slice(fragStart + 1).trim().split(/\s+/).filter(Boolean);
        const completed = word === '' ? tokens.length : tokens.length - 1;
        if (completed <= 0) {
          if (word === '') return null; // fresh column-name slot — suggest nothing
          ddlBase = TABLE_CONSTRAINTS.map((text) => ({text, kind: 'keyword'}));
        } else {
          ddlBase = [...DATA_TYPES, ...COL_CONSTRAINTS].map((text) => ({text, kind: 'keyword'}));
        }
      }
    } else {
      // INSERT INTO <t> (col, …)  or  CREATE INDEX … ON <t> (col, …)
      const insM = bsUp.match(/\bINSERT\s+INTO\s+("?[A-Z_]\w*"?)/);
      const valuesIdx = bsUp.indexOf('VALUES');
      const idxM = /^\s*CREATE\s+(?:UNIQUE\s+)?INDEX\b/i.test(bs)
        ? bsUp.match(/\bON\s+("?[A-Z_]\w*"?)/)
        : null;
      const ref =
        insM && (valuesIdx === -1 || openIdx < valuesIdx)
          ? insM[1]
          : idxM
            ? idxM[1]
            : null;
      const real = ref ? findTable(ref) : undefined;
      if (real) ddlBase = colsOf(real);
    }
  }

  // Which clause are we in? Anchor scan is limited to the current statement.
  let mode: Mode = 'keywords';
  let qualifier: string | null = null;
  if (prevChar === '.') {
    mode = 'columns'; // qualified reference like `c.` or `customers.`
    qualifier = (head.match(/([A-Za-z_]\w*)\.$/) || [, null])[1] as string | null;
  } else {
    const up = head.slice(stmtStart).toUpperCase();
    const anchors: {re: RegExp; mode: Mode}[] = [
      {re: /\bSELECT\b/g, mode: 'select'},
      {re: /\bFROM\b/g, mode: 'tables'},
      {re: /\bJOIN\b/g, mode: 'tables'},
      {re: /\b(?:UPDATE|INTO|TABLE)\b/g, mode: 'tables'},
      {re: /\b(?:WHERE|ON|USING|HAVING|SET)\b/g, mode: 'columns'},
      {re: /\b(?:GROUP|ORDER)\s+BY\b/g, mode: 'columns'},
      {re: /\b(?:AND|OR)\b/g, mode: 'columns'},
    ];
    let best = -1;
    for (const a of anchors) {
      a.re.lastIndex = 0;
      let m: RegExpExecArray | null;
      let last = -1;
      while ((m = a.re.exec(up))) last = m.index;
      if (last > best) {
        best = last;
        mode = a.mode;
      }
    }
  }

  // Don't pop the box on a bare space unless we're in a name-expecting clause.
  if (word === '' && mode === 'keywords' && !ddlBase) return null;

  const tbl = (l: string[]): SugItem[] => l.map((text) => ({text, kind: 'table'}));
  const kw = (l: string[]): SugItem[] => l.map((text) => ({text, kind: 'keyword'}));
  // Columns from the tables in this statement's FROM (each labelled with its
  // table); falls back to every column when no FROM is parsed yet.
  const scopedCols = (): SugItem[] =>
    scope.length
      ? scope.flatMap((t) =>
          (byTable[t] ?? []).map((name) => ({text: name, kind: 'column' as const, detail: t})),
        )
      : cols.map((c) => ({text: c.name, kind: 'column' as const, detail: c.tables.join(', ')}));

  let base: SugItem[];
  let appendKw = true;
  if (ddlBase) {
    base = ddlBase;
    appendKw = false; // DDL contexts get their own fixed vocabulary
  } else if (qualifier) {
    const real = refMap.get(qualifier.toLowerCase()) ?? findTable(qualifier);
    base = real
      ? (byTable[real] ?? []).map((name) => ({text: name, kind: 'column', detail: real}))
      : scopedCols();
    appendKw = false; // after `x.` only columns make sense
  } else if (mode === 'tables') {
    base = tbl(tables);
  } else if (mode === 'select') {
    base = [{text: '*', kind: 'column'}, ...scopedCols(), ...kw(AGG)];
  } else if (mode === 'columns') {
    base = [...scopedCols(), ...kw(AGG), ...kw(OPS)];
  } else {
    base = [...scopedCols(), ...tbl(tables)];
  }
  // Context names rank first, but every clause keyword stays reachable so the
  // next clause (FROM after SELECT, WHERE/JOIN after a table, ...) can be typed.
  if (appendKw) {
    const seen = new Set(base.map((it) => it.text.toUpperCase()));
    for (const k of SQL_KEYWORDS) {
      if (!seen.has(k.toUpperCase())) base.push({text: k, kind: 'keyword'});
    }
  }

  // Score a candidate against the typed word: exact-prefix beats a match at a
  // `_` word boundary (so `at` finds `created_at`) beats a loose substring.
  const score = (text: string): number => {
    if (text === '*') return 0;
    const t = text.toLowerCase();
    if (t === lw) return 0; // already fully typed
    if (t.startsWith(lw)) return 3;
    if (t.split('_').some((p) => p.startsWith(lw))) return 2;
    if (t.includes(lw)) return 1;
    return 0;
  };
  const kindRank = {column: 0, table: 1, keyword: 2};
  let items: SugItem[];
  if (word === '') {
    items = base.slice(0, 8);
  } else {
    items = base
      .map((it, i) => ({it, i, s: score(it.text)}))
      .filter((x) => x.s > 0)
      .sort(
        (a, b) =>
          b.s - a.s ||
          kindRank[a.it.kind] - kindRank[b.it.kind] ||
          a.it.text.length - b.it.text.length ||
          a.i - b.i,
      )
      .slice(0, 8)
      .map((x) => x.it);
  }
  if (items.length === 0) return null;
  return {items, word};
}
