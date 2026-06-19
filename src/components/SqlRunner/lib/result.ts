// Pure helpers for comparing, exporting and keying result sets. No React, no DOM
// beyond the download anchor.
import type {ResultSet} from '../types';

// Compare two result sets by value (ignoring column names). Order-insensitive
// unless `ordered`, so set-style answers still match regardless of row order.
export function matches(a: ResultSet, b: ResultSet, ordered: boolean): boolean {
  if (a.values.length !== b.values.length) return false;
  let A = a.values.map((r) => JSON.stringify(r));
  let B = b.values.map((r) => JSON.stringify(r));
  if (!ordered) {
    A = [...A].sort();
    B = [...B].sort();
  }
  return A.every((x, i) => x === B[i]);
}

export function hashStr(s: string): string {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}

export function toCsv(rs: ResultSet): string {
  const esc = (v: unknown) => {
    const s = v === null || v === undefined ? '' : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const head = rs.columns.map(esc).join(',');
  const rows = rs.values.map((r) => r.map(esc).join(','));
  return [head, ...rows].join('\n');
}

export function download(filename: string, text: string): void {
  const blob = new Blob([text], {type: 'text/csv;charset=utf-8'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
