#!/usr/bin/env node
// Search for specific patterns across all pages of a CCT PDF
import pdfParse from 'pdf-parse/lib/pdf-parse.js';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const catalog = require('../src/data/cla-documents.generated.json');

const industryArg = process.argv[2];
const fileIndex = parseInt(process.argv[3] ?? '0', 10);
const searchTerm = process.argv[4] ?? '';

const industry = catalog.industries.find(
  (i) => i.folderName.toLowerCase().includes(industryArg.toLowerCase()),
);
if (!industry) { console.error('Not found'); process.exit(1); }

const doc = industry.documents[fileIndex];
const absPath = path.resolve(process.cwd(), '..', doc.relativePath);
console.log('File:', doc.fileName);
const buf = fs.readFileSync(absPath);
const data = await pdfParse(buf);
const text = data.text;

if (searchTerm) {
  // Find all lines containing the search term
  const lines = text.split('\n');
  lines.forEach((line, i) => {
    if (line.toLowerCase().includes(searchTerm.toLowerCase())) {
      const ctx = lines.slice(Math.max(0, i - 1), i + 3).join('\n');
      console.log(`[line ${i}]`, ctx);
      console.log('---');
    }
  });
} else {
  console.log(text);
}
