import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { render } from 'pele';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const diagrams = [
  {
    name: 'savings', page: 'research/index.html',
    label: 'Compressing input, trimming output, reusing calls, and choosing another model can affect whole-task cost. Check task success and latency too.',
    caption: 'Compare the cost of the whole task, as well as task success and latency.',
  },
  {
    name: 'cc-shunt', page: 'cc-shunt/index.html',
    label: 'A parent receives a task. A hook blocks a broad read. Scout searches files and returns cited evidence. The parent checks the evidence and continues.',
    caption: 'A broad read can be routed to Scout. The parent checks the returned evidence.',
  },
];
let changed = false;
for (const { name, page, label, caption } of diagrams) {
  const path = resolve(root, 'talks/codecon-26', page);
  const source = await readFile(resolve(root, 'talks/codecon-26/diagrams', `${name}.mmd`), 'utf8');
  const result = render(source);
  const svg = result.svg.replace('role="graphics-document document" aria-roledescription="flowchart"', `role="img" aria-label="${label}"`);
  if (svg === result.svg) throw new Error(`Could not label diagram: ${name}`);
  const start = `<!-- pele:${name}:start -->`;
  const end = `<!-- pele:${name}:end -->`;
  const original = await readFile(path, 'utf8');
  const first = original.indexOf(start);
  const last = original.indexOf(end);
  if (first < 0 || last < first || original.indexOf(start, first + start.length) !== -1 || original.indexOf(end, last + end.length) !== -1) {
    throw new Error(`Expected one pair of markers for ${name}`);
  }
  const figure = `${start}\n<figure class="diagram">${svg}<figcaption>${caption} <a href="../diagrams/${name}.mmd">Mermaid source</a></figcaption></figure>\n${end}`;
  const updated = original.slice(0, first) + figure + original.slice(last + end.length);
  if (updated !== original) {
    changed = true;
    if (!process.argv.includes('--check')) await writeFile(path, updated);
  }
}
if (process.argv.includes('--check') && changed) throw new Error('Diagrams are out of date. Run npm run diagrams.');
console.log(`Pele diagrams ${process.argv.includes('--check') ? 'verified' : 'rendered'}.`);
