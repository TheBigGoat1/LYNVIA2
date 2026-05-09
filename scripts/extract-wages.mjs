import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Search for wage data in a CCT file
const inputFile = process.argv[2] || '../../results/construction-infra.txt';
const keyword = process.argv[3] || 'Kündigungsfrist';
const text = readFileSync(path.resolve(__dirname, inputFile), 'utf8');
const lines = text.split('\n');
console.log('Total lines:', lines.length);

const idx = lines.findIndex(l => l.toLowerCase().includes(keyword.toLowerCase()));
console.log(`Keyword "${keyword}" found at line:`, idx);
if (idx >= 0) {
  console.log(lines.slice(idx, idx + 30).join('\n'));
}
