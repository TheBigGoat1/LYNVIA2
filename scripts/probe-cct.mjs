#!/usr/bin/env node
// Probe any CCT PDF by industry id + file name index
import pdfParse from 'pdf-parse/lib/pdf-parse.js';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const catalog = require('../src/data/cla-documents.generated.json');

const industryArg = process.argv[2]; // partial folder name match
const fileIndex = parseInt(process.argv[3] ?? '0', 10);
const maxChars = parseInt(process.argv[4] ?? '5000', 10);

const industry = catalog.industries.find(
  (i) => i.folderName.toLowerCase().includes(industryArg.toLowerCase()),
);
if (!industry) {
  console.error('Industry not found:', industryArg);
  console.log('Available:', catalog.industries.map((i) => i.folderName).join('\n'));
  process.exit(1);
}

const doc = industry.documents[fileIndex];
if (!doc) {
  console.error(`No document at index ${fileIndex}. Available:`);
  industry.documents.forEach((d, i) => console.log(i, d.fileName));
  process.exit(1);
}

const absPath = path.resolve(process.cwd(), '..', doc.relativePath);
console.log('Reading:', absPath);
console.log('File:', doc.fileName);
console.log('---');

const buf = fs.readFileSync(absPath);
const data = await pdfParse(buf);
console.log('Pages:', data.numpages);
console.log(data.text.slice(0, maxChars));
