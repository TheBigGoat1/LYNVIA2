import { readFileSync } from 'fs';
const txt = readFileSync('./messages/de.json', 'utf8');
const lines = txt.split('\n');
// Get byte offset of line 1724 (ScenarioCalculator) and line 1803 (forms)
const byteOffset = (lineNum) => lines.slice(0, lineNum - 1).join('\n').length + 1;
const scStart = byteOffset(1724);
const formsLine = byteOffset(1803);
console.log('ScenarioCalculator byte offset:', scStart, 'forms byte offset:', formsLine);
const region = txt.slice(scStart, formsLine);
let opens = 0, closes = 0, inStr2 = false, esc2 = false;
let depth = 0;
const events = [];
for (let i = 0; i < region.length; i++) {
  const c = region[i];
  if (esc2) { esc2 = false; continue; }
  if (c === '\\') { esc2 = true; continue; }
  if (c === '"') { inStr2 = !inStr2; continue; }
  if (inStr2) continue;
  if (c === '{') { opens++; depth++; }
  if (c === '}') {
    closes++; depth--;
    const lineNum = 1724 + region.slice(0, i).split('\n').length - 1;
    events.push({ depth, lineNum, context: JSON.stringify(region.slice(Math.max(0,i-30), i+10)) });
  }
}
console.log('opens=', opens, 'closes=', closes, 'final depth=', depth);
// Show all depth drops
events.filter(e => e.depth === 0).forEach(e => console.log('Drops to 0 at line', e.lineNum, e.context));
events.filter(e => e.depth < 0).forEach(e => console.log('Goes NEGATIVE to', e.depth,'at line', e.lineNum, e.context));

// Find ScenarioCalculator section start
const scStart = txt.indexOf('"ScenarioCalculator"');
const scFormsStart = txt.indexOf('"forms"', scStart);
console.log('ScenarioCalculator section starts at line:', txt.slice(0, scStart).split('\n').length);
// Count braces between ScenarioCalculator start and forms key
const region = txt.slice(scStart, scFormsStart);
let opens = 0, closes = 0, inStr2 = false, esc2 = false;
for (const c of region) {
  if (esc2) { esc2 = false; continue; }
  if (c === '\\') { esc2 = true; continue; }
  if (c === '"') { inStr2 = !inStr2; continue; }
  if (inStr2) continue;
  if (c === '{') opens++;
  if (c === '}') closes++;
}
console.log('In region ScenarioCalculator→forms: opens=', opens, 'closes=', closes);
console.log('Net depth change:', opens - closes, '(should be 2 = root+section)');
console.log('Last 200 chars before forms:', JSON.stringify(txt.slice(scFormsStart - 200, scFormsStart)));

let depth = 0;
let inStr = false;
let esc = false;
for (let i = 0; i < txt.length; i++) {
  const c = txt[i];
  if (esc) { esc = false; continue; }
  if (c === '\\') { esc = true; continue; }
  if (c === '"') { inStr = !inStr; continue; }
  if (inStr) continue;
  if (c === '{' || c === '[') depth++;
  if (c === '}' || c === ']') {
    depth--;
    if (depth === 1) {
      const line = txt.slice(0, i).split('\n').length;
      console.log('depth→1 at line', line, 'context:', JSON.stringify(txt.slice(i-30, i+10)));
    }
    if (depth === 0) {
      const line = txt.slice(0, i).split('\n').length;
      console.log('ROOT CLOSE at pos', i, 'line', line);
      console.log('Context:', JSON.stringify(txt.slice(i - 60, i + 60)));
      break;
    }
  }
}
