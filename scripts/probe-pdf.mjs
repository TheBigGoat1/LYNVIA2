#!/usr/bin/env node
import pdfParse from 'pdf-parse/lib/pdf-parse.js';
import fs from 'node:fs';
import path from 'node:path';

const repoRoot = process.cwd();
const relPath = process.argv[2];
const absPath = path.resolve(repoRoot, relPath);

const buf = fs.readFileSync(absPath);
const data = await pdfParse(buf);
console.log('=== PAGES:', data.numpages);
console.log(data.text.slice(0, 6000));
