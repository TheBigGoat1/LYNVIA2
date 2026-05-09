import { readFileSync } from 'fs';
const txt = readFileSync('./messages/de.json', 'utf8');
const lines = txt.split('\n');
const byteOffset = (lineNum) => lines.slice(0, lineNum - 1).join('\n').length + 1;
// Check from ScenarioCalculator opening (line 1724) through "results" (after forms closes)
const scStart = byteOffset(1724);
const endLine = byteOffset(1912);
const region = txt.slice(scStart, endLine);
let depth = 0, inStr = false, esc = false;
for (let i = 0; i < region.length; i++) {
  const c = region[i];
  if (esc) { esc = false; continue; }
  if (c === '\\') { esc = true; continue; }
  if (c === '"') { inStr = !inStr; continue; }
  if (inStr) continue;
  if (c === '{') depth++;
  if (c === '}') {
    depth--;
    const lineNum = 1724 + region.slice(0, i).split('\n').length - 1;
    if (depth <= 0) {
      console.log('DEPTH HITS', depth, 'at line', lineNum);
      console.log('Context:', JSON.stringify(region.slice(Math.max(0,i-80), i+40)));
    }
  }
}
console.log('Final depth at line 1912:', depth, '(should be 1 = inside ScenarioCalculator)');
