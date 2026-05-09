import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const catalog = JSON.parse(readFileSync(path.resolve(__dirname, '../src/data/cla-documents.generated.json'), 'utf8'));

const industries = catalog.industries;
const keys = Object.keys(industries);
keys.forEach((k, i) => {
  const docs = industries[k].documents;
  console.log(i, JSON.stringify(k), '-', docs.length, 'docs');
  docs.forEach((d, j) => console.log('  ', j, d.name));
});
