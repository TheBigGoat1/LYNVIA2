import { readFileSync } from 'fs';
const txt = readFileSync('./messages/de.json', 'utf8');
const lines = txt.split('\n');
const byteOffset = (lineNum) => lines.slice(0, lineNum - 1).join('\n').length + 1;
const scStart = byteOffset(1724);
const formsLine = byteOffset(1803);
const region = txt.slice(scStart, formsLine);
let opens = 0, closes = 0, inStr = false, esc = false;
let depth = 0;
for (let i = 0; i < region.length; i++) {
  const c = region[i];
  if (esc) { esc = false; continue; }
  if (c === '\\') { esc = true; continue; }
  if (c === '"') { inStr = !inStr; continue; }
  if (inStr) continue;
  if (c === '{') { opens++; depth++; }
  if (c === '}') {
    closes++; depth--;
    if (depth <= 0) {
      const lineNum = 1724 + region.slice(0, i).split('\n').length - 1;
      console.log('DEPTH HITS', depth, 'at line', lineNum, ':', JSON.stringify(region.slice(Math.max(0,i-50), i+20)));
    }
  }
}
console.log('Region line 1724→1803: opens=', opens, 'closes=', closes, 'final depth=', depth);
console.log('(depth should be 1 after ScenarioCalculator opens its {)');
