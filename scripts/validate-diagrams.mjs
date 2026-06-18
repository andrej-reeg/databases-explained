// Parse every ```mermaid block under docs/ to catch diagram syntax errors that
// the Docusaurus build does not (Mermaid renders client-side).
// Usage: node scripts/validate-diagrams.mjs
import {readFileSync, readdirSync, statSync} from 'node:fs';
import {join} from 'node:path';
import {JSDOM} from 'jsdom';

// Mermaid needs a DOM to parse.
const dom = new JSDOM('<!DOCTYPE html><body></body>', {pretendToBeVisual: true});
globalThis.window = dom.window;
globalThis.document = dom.window.document;
globalThis.DOMParser = dom.window.DOMParser;
globalThis.Element = dom.window.Element;

const {default: mermaid} = await import('mermaid');
mermaid.initialize({startOnLoad: false});

function walk(dir) {
  let files = [];
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) files = files.concat(walk(p));
    else if (/\.mdx?$/.test(entry)) files.push(p);
  }
  return files;
}

const blocks = [];
for (const file of walk('docs')) {
  const text = readFileSync(file, 'utf8');
  const re = /```mermaid\n([\s\S]*?)```/g;
  let m;
  while ((m = re.exec(text))) blocks.push({file, code: m[1]});
}

let failed = 0;
for (const b of blocks) {
  const first = b.code.trim().split('\n')[0];
  try {
    await mermaid.parse(b.code);
  } catch (e) {
    failed++;
    console.error(`FAIL ${b.file} [${first}]: ${String(e.message || e).split('\n')[0]}`);
  }
}

console.log(`${blocks.length - failed}/${blocks.length} mermaid diagrams parsed OK`);
process.exit(failed ? 1 : 0);
