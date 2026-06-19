// Shared types for the SqlRunner component and its helpers/hooks.

export type ResultSet = {columns: string[]; values: unknown[][]};

export type Verdict = 'none' | 'correct' | 'wrong';

/** A table and its columns, as introspected from the live SQLite database. */
export type TableSchema = {
  table: string;
  cols: {name: string; type: string; pk: boolean}[];
};

/** Autocomplete vocabulary derived from the schema. */
export type Vocab = {
  tables: string[];
  /** Each distinct column name with the table(s) that own it. */
  cols: {name: string; tables: string[]}[];
  /** Table name -> its column names, in declaration order. */
  byTable: Record<string, string[]>;
};

export type SugKind = 'table' | 'column' | 'keyword';

export type SugItem = {text: string; kind: SugKind; detail?: string};

/** Open-dropdown state: the ranked items plus where to draw the box. */
export type SugState = {
  items: SugItem[];
  index: number;
  word: string;
  top: number;
  left: number;
};
