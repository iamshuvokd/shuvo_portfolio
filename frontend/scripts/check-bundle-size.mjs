// Performance budget for the production build (run after `npm run build`).
// Fails CI when something big sneaks onto the critical path again (e.g. an unoptimised image).
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';

const dist = resolve(dirname(fileURLToPath(import.meta.url)), '../dist');
const KB = 1024;

// Budgets in KB. JS/CSS are measured gzipped (what actually travels); images as-is.
const budgets = {
  initialJsGzip: 280, // every JS file the home page needs before it is interactive, together
  anyImage: 120,
  favicon: 20,
  css: 30,
};

const walk = (dir) => readdirSync(dir).flatMap((name) => (statSync(join(dir, name)).isDirectory() ? walk(join(dir, name)) : [join(dir, name)]));
const files = walk(dist).map((path) => ({ path, rel: path.slice(dist.length + 1).replaceAll('\\', '/'), size: statSync(path).size }));

// Lazy chunks are the ones reached only through dynamic import() / modulepreload-free; find the entry's static imports.
const html = readFileSync(join(dist, 'index.html'), 'utf-8');
const initial = new Set([...html.matchAll(/(?:src|href)="\/(assets\/[^"]+\.js)"/g)].map((m) => m[1]));
const entryCode = [...initial].map((rel) => readFileSync(join(dist, rel), 'utf-8')).join('\n');
// Static imports between chunks look like: import"./react-abc.js" / from"./motion-abc.js"
for (const match of entryCode.matchAll(/(?:from|import)\s*["']\.\/([\w.-]+\.js)["']/g)) initial.add(`assets/${match[1]}`);

const gz = (rel) => gzipSync(readFileSync(join(dist, rel))).length;
const failures = [];
const report = [];

const initialGzip = [...initial].filter((rel) => files.some((f) => f.rel === rel)).reduce((sum, rel) => sum + gz(rel), 0);
report.push(`initial JS (gzip): ${(initialGzip / KB).toFixed(0)} KB  [budget ${budgets.initialJsGzip}]  files: ${[...initial].map((r) => r.replace('assets/', '')).join(', ')}`);
if (initialGzip / KB > budgets.initialJsGzip) failures.push('initial JavaScript is over budget');

for (const file of files) {
  const ext = extname(file.rel).toLowerCase();
  if (['.png', '.jpg', '.jpeg', '.webp', '.gif', '.ico'].includes(ext)) {
    const limit = file.rel.startsWith('favicon') ? budgets.favicon : budgets.anyImage;
    if (file.size / KB > limit) failures.push(`${file.rel} is ${(file.size / KB).toFixed(0)} KB (limit ${limit} KB)`);
  }
  if (ext === '.css' && gz(file.rel) / KB > budgets.css) failures.push(`${file.rel} CSS is ${(gz(file.rel) / KB).toFixed(0)} KB gzip (limit ${budgets.css} KB)`);
}

const lazy = files.filter((f) => f.rel.endsWith('.js') && !initial.has(f.rel)).map((f) => `${f.rel.replace('assets/', '')} ${(gz(f.rel) / KB).toFixed(0)} KB gz`);
report.push(`lazy chunks: ${lazy.join(', ') || 'none'}`);

console.log(report.join('\n'));
if (failures.length) {
  console.error(`\nBundle budget FAILED:\n - ${failures.join('\n - ')}`);
  process.exit(1);
}
console.log('Bundle budget OK');
