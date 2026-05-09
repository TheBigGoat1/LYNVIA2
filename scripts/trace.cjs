const fs = require('fs');
const txt = fs.readFileSync('./messages/de.json', 'utf8');
const lines = txt.split('\n');
const byteOffset = (n) => lines.slice(0, n - 1).join('\n').length + 1;
const startByte = byteOffset(1803);
const endByte = byteOffset(1912);
const region = txt.slice(startByte, endByte);
let depth = 2; // file depth when we enter line 1803
let inStr = false, esc = false;
for (let i = 0; i < region.length; i++) {
  const c = region[i];
  if (esc) { esc = false; continue; }
  if (c === '\\') { esc = true; continue; }
  if (c === '"') { inStr = !inStr; continue; }
  if (inStr) continue;
  if (c === '{') {
    depth++;
    const ln = 1803 + region.slice(0, i).split('\n').length - 1;
    if (depth <= 3) console.log('OPEN depth→' + depth + ' at line ' + ln + ': ' + JSON.stringify(region.slice(Math.max(0,i-30), i+20)));
  }
  if (c === '}') {
    const ln = 1803 + region.slice(0, i).split('\n').length - 1;
    depth--;
    if (depth <= 2) console.log('CLOSE depth→' + depth + ' at line ' + ln + ': ' + JSON.stringify(region.slice(Math.max(0,i-50), i+20)));
  }
}
console.log('Final depth:', depth);
