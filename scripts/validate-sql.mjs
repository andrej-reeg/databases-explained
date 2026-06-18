// Load the SqlRunner seed schema into SQLite (sql.js) and run a smoke set of
// queries, so a broken seed or a regressed core example fails CI.
// Usage: node scripts/validate-sql.mjs
import {readFileSync} from 'node:fs';

const {default: initSqlJs} = await import('sql.js/dist/sql-wasm.js');
const SQL = await initSqlJs();

const schemaSrc = readFileSync('src/components/SqlRunner/schema.ts', 'utf8');
// Match the SEED_SQL template literal by name, so reordering exports or adding
// another backtick string above it does not silently grab the wrong block.
const seed = schemaSrc.match(/export\s+const\s+SEED_SQL\s*=\s*`([^`]*)`/)?.[1];
if (!seed) {
  console.error('Could not extract SEED_SQL from schema.ts');
  process.exit(1);
}

const db = new SQL.Database();
db.run(seed);

// (query, expected-first-cell) smoke checks tied to lesson prose.
const checks = [
  ['SELECT COUNT(*) FROM customers', 6],
  ['SELECT COUNT(*) FROM orders WHERE customer_id = 1', 2], // Ana has two orders
  ['SELECT COUNT(*) FROM orders WHERE customer_id = 3', 0], // Cleo has none
  ['SELECT COUNT(*) FROM customers WHERE country IS NULL', 1], // Eve
  // HAVING must actually filter (Dee, total 25, excluded):
  ['SELECT COUNT(*) FROM (SELECT customer_id FROM orders GROUP BY customer_id HAVING SUM(total) > 30)', 3],
];

let failed = 0;
for (const [sql, expected] of checks) {
  try {
    const res = db.exec(sql);
    const got = res[0]?.values?.[0]?.[0];
    if (got !== expected) {
      failed++;
      console.error(`FAIL ${sql}\n  expected ${expected}, got ${got}`);
    }
  } catch (e) {
    failed++;
    console.error(`ERROR ${sql}\n  ${String(e.message || e)}`);
  }
}

console.log(`${checks.length - failed}/${checks.length} SQL smoke checks passed`);
process.exit(failed ? 1 : 0);
