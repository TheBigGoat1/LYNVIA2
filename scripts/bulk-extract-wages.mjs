#!/usr/bin/env node
/**
 * Bulk CCT wage extractor — reads PDFs for all 56 zero-wage sectors
 * and attempts to find minimum monthly wages automatically.
 * Output: scripts/bulk-extract-output.json
 */
import pdfParse from 'pdf-parse/lib/pdf-parse.js';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const catalog = require('../src/data/cla-documents.generated.json');
const generated = require('../src/data/cla-rules.generated.json');
const verified = require('../src/data/cla-verified-wages.json');

const CCT_BASE = path.resolve(process.cwd(), '..', 'Conventions_Collectives');
const SECTOR_ARG = process.argv[2]; // optional: filter to specific sector id substring

// Sectors that already have real wages
const alreadyDone = new Set(Object.keys(verified.sectors));

// Target only zero-wage rules (or filtered by arg)
const targets = generated.rules
  .filter(r => r.minimumMonthlyWage === 0 && !alreadyDone.has(r.id))
  .filter(r => !SECTOR_ARG || r.id.includes(SECTOR_ARG));

console.log(`Extracting wages for ${targets.length} sectors...\n`);

// === Pattern helpers ===
// Swiss wage amounts (exclude years: 2000-2099, exclude <2100, exclude >9000)
// Formats: CHF 3'450 | CHF 3450 | Fr. 3'800 | 3 450 fr.

function extractCandidates(text) {
  const vals = [];

  // 1. Swiss apostrophe format: CHF 3'450 or Fr. 3'450
  const p1 = /(?:CHF|Fr\.?)\s*(\d{1,2})['](\d{3})(?:[.,]\d{2})?/gi;
  let m;
  while ((m = p1.exec(text)) !== null) vals.push(parseInt(m[1] + m[2], 10));

  // 2. Space-separated: CHF 3 450 or Fr. 4 200
  const p2 = /(?:CHF|Fr\.?)\s*(\d{1,2})\s(\d{3})(?:[.,]\d{2})?/gi;
  while ((m = p2.exec(text)) !== null) vals.push(parseInt(m[1] + m[2], 10));

  // 3. Dot-separated German format: CHF 3.450 or 4.200
  const p3 = /(?:CHF|Fr\.?)\s*(\d{1,2})\.(\d{3})(?:[.,]\d{2})?/gi;
  while ((m = p3.exec(text)) !== null) vals.push(parseInt(m[1] + m[2], 10));

  // 4. Context-anchored plain number: "salaire minimum de 3800" etc.
  const wageWords = '(?:salaire|lohn|gehalt|rémunération|wage|salario|stipendi|mindestlohn|mindestsalär|salari)';
  const p4 = new RegExp(wageWords + '[^\\n]{0,120}?\\b(\\d{4,5})\\b', 'gi');
  while ((m = p4.exec(text)) !== null) vals.push(parseInt(m[1], 10));

  // 5. Reverse: "3800 CHF" or "3'800 CHF"
  const p5 = /\b(\d{4,5})\s*(?:CHF|Fr\.?)\b/gi;
  while ((m = p5.exec(text)) !== null) vals.push(parseInt(m[1], 10));
  const p5b = /(\d{1,2})['](\d{3})\s*(?:CHF|Fr\.?)/gi;
  while ((m = p5b.exec(text)) !== null) vals.push(parseInt(m[1] + m[2], 10));

  // Filter: valid monthly wage range, NOT a year
  return vals.filter(v => v >= 2100 && v <= 9000 && (v < 2000 || v > 2099));
}

const NOTICE_PATTERNS = {
  trial: [
    /essai[^\n]{0,80}?(\d+)\s*(?:jours?|Tage?)/gi,
    /Probezeit[^\n]{0,80}?(\d+)\s*(?:Tage?|jours?)/gi,
    /période\s+d['']essai[^\n]{0,80}?(\d+)\s*(?:jours?)/gi,
    /trial[^\n]{0,80}?(\d+)\s*days?/gi,
  ],
  year1: [
    /1[eèr]{0,2}\s+ann[ée]{1,2}[^\n]{0,80}?(\d+)\s*mois/gi,
    /pendant la 1[eèr]{0,2} ann[ée]{1,2}[^\n]{0,80}?(\d+)\s*mois/gi,
    /im 1\.\s+Jahr[^\n]{0,80}?(\d+)\s*Monat/gi,
    /(?:délai|congé)[^\n]{0,60}?1[eèr]{0,2}\s+ann[ée]{1,2}[^\n]{0,60}?(\d+)\s*mois/gi,
  ],
};

function parseCHF(text) {
  const candidates = extractCandidates(text);
  if (!candidates.length) return 0;
  // Return the MINIMUM plausible wage (most conservative)
  return Math.min(...candidates);
}

function parseNotice(text) {
  const notice = {};
  for (const [key, pats] of Object.entries(NOTICE_PATTERNS)) {
    for (const pat of pats) {
      pat.lastIndex = 0;
      const m = pat.exec(text);
      if (m) { notice[key] = parseInt(m[1], 10); break; }
    }
  }
  return notice;
}

// Priority: FR documents first, then DE, then IT, then others
function sortDocs(docs) {
  const prio = (d) => {
    const n = d.fileName.toLowerCase();
    if (n.includes('salaire') || n.includes('wage') || n.includes('lohn')) return 0;
    if (n.endsWith('_fr.pdf')) return 1;
    if (n.endsWith('_de.pdf')) return 2;
    if (n.endsWith('_it.pdf')) return 3;
    return 4;
  };
  return [...docs].sort((a, b) => prio(a) - prio(b));
}

const EXTRACT_CHARS = 20000; // first N chars of each PDF to search

const results = {};

for (const rule of targets) {
  const industry = catalog.industries.find(i => i.id === rule.id);
  if (!industry) {
    results[rule.id] = { error: 'no industry in catalog', wage: 0 };
    continue;
  }

  const sorted = sortDocs(industry.documents);
  let wage = 0;
  let sourceFile = '';
  let rawSnippet = '';
  let noticeHints = {};

  for (const doc of sorted.slice(0, 6)) { // try up to 6 PDFs
    const absPath = path.resolve(CCT_BASE, '..', 'Conventions_Collectives', industry.folderName, doc.fileName);
    if (!fs.existsSync(absPath)) continue;
    try {
      const buf = fs.readFileSync(absPath);
      const parsed = await pdfParse(buf);
      const text = parsed.text.slice(0, EXTRACT_CHARS);
      const candidate = parseCHF(text);
      if (candidate > 0 && (wage === 0 || candidate < wage)) {
        wage = candidate;
        sourceFile = doc.fileName;
        rawSnippet = text.slice(0, 300).replace(/\n+/g, ' ').trim();
        noticeHints = parseNotice(text);
      }
      if (wage > 0) break; // found one, move on
    } catch (e) {
      // skip unreadable PDFs
    }
  }

  results[rule.id] = {
    wage,
    source: sourceFile,
    noticeHints,
    snippet: rawSnippet.slice(0, 200),
    folderName: industry.folderName,
    docCount: industry.documents.length,
  };

  const status = wage > 0 ? `CHF ${wage}` : 'NOT FOUND';
  console.log(`[${status}] ${rule.id}`);
  if (wage > 0) console.log(`  source: ${sourceFile}`);
}

const outPath = path.resolve(process.cwd(), 'scripts', 'bulk-extract-output.json');
fs.writeFileSync(outPath, JSON.stringify(results, null, 2));
console.log(`\nResults saved to: ${outPath}`);
console.log(`Found: ${Object.values(results).filter(r => r.wage > 0).length}/${targets.length}`);
