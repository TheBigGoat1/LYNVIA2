#!/usr/bin/env node
import pdfParse from 'pdf-parse/lib/pdf-parse.js';
import fs from 'node:fs';
import path from 'node:path';

const B = 'c:/Users/ADMIN/Downloads/lynvia/Conventions_Collectives';

// Use exact file listing to handle apostrophes in path
function getFile(folder, prefix) {
  const dir = path.join(B, folder);
  if (!fs.existsSync(dir)) return null;
  const f = fs.readdirSync(dir).find(n => n.startsWith(prefix));
  return f ? path.join(dir, f) : null;
}

function extractWages(text) {
  const results = [];
  const patterns = [
    /(?:CHF|Fr\.?)\s*(\d{1,2})['](\d{3})/g,
    /(?:CHF|Fr\.?)\s*(\d{1,2})\.(\d{3})/g,
    /(?:CHF|Fr\.?)\s*(\d{1,2})\s(\d{3})\b/g,
    /\b(\d{1,2})['](\d{3})\.--/g,
    /\b(\d{4,5})\.--/g,
    /(?:CHF|Fr\.?)\s*(\d{4,5})(?=[. \n,\r])/g,
  ];
  for (const pat of patterns) {
    pat.lastIndex = 0; let m;
    while ((m = pat.exec(text)) !== null) {
      let v = 0;
      if (m[2] && m[2].length <= 3) v = parseInt(m[1] + m[2], 10);
      else if (m[1] && m[1].length >= 4) v = parseInt(m[1], 10);
      if (v >= 2200 && v <= 9000) {
        const ctx = text.slice(Math.max(0, m.index - 60), m.index + 110).replace(/\s+/g, ' ').trim();
        results.push({v, raw: m[0].trim(), ctx, pos: m.index});
      }
    }
  }
  return results;
}

async function probe(folder, prefix, label) {
  const f = getFile(folder, prefix);
  if (!f) { console.log(`[NOT FOUND] ${label}`); return; }
  console.log(`[FILE] ${label}: ${path.basename(f).slice(0,70)}`);
  try {
    const parsed = await pdfParse(fs.readFileSync(f));
    const wages = extractWages(parsed.text);
    if (!wages.length) {
      console.log(`  [NO WAGES] (${parsed.text.length} chars)`);
      // Show sections related to wages/salary
      const text = parsed.text;
      const idx = text.search(/salaire|lohn|wage|minimal|categorie|catégorie|classe|grille|annex/i);
      if (idx >= 0) console.log('  SALARY CONTEXT: ' + text.slice(idx, idx + 400).replace(/\s+/g,' '));
    } else {
      console.log(`  Range: ${Math.min(...wages.map(w=>w.v))} – ${Math.max(...wages.map(w=>w.v))}`);
      const seen = new Set();
      wages.forEach(w => {
        if (!seen.has(w.v)) {
          seen.add(w.v);
          console.log(`    ${w.v} | ${w.ctx.slice(0,110)}`);
        }
      });
    }
  } catch(e) {
    console.log(`  [PARSE ERR] ${e.message.slice(0,80)}`);
  }
}

// Ménages privés
await probe('Ménages privés avec personnel domestique', "Contrat-type de travail de l'", "menages GE (CTT-EDom)");
await probe('Ménages privés avec personnel domestique', "Contrat-type de travail pour les travailleurs de l'économie domestique CH (CTT é", "menages CH FR");
await probe('Ménages privés avec personnel domestique', "Contrat-type de travail pour les travailleurs de l'économie domestique CH (CTT é", "menages CH DE");

// Santé humaine - all files
const santeFolder = 'Santé humaine';
const santeDir = path.join(B, santeFolder);
for (const f of fs.readdirSync(santeDir)) {
  const label = `sante: ${f.slice(0,50)}`;
  const fp = path.join(santeDir, f);
  try {
    const parsed = await pdfParse(fs.readFileSync(fp));
    const wages = extractWages(parsed.text);
    if (wages.length) {
      console.log(`\n=== ${label} ===`);
      const seen = new Set();
      wages.filter(w => w.v >= 3000).forEach(w => {
        if (!seen.has(w.v)) { seen.add(w.v); console.log(`  ${w.v} | ${w.ctx.slice(0,110)}`); }
      });
    } else {
      console.log(`[NO WAGES] ${label} (${parsed.text.length} chars)`);
    }
  } catch(e) {
    console.log(`[ERR] ${label}: ${e.message.slice(0,60)}`);
  }
}

// Hébergement médico-social - EMS file
await probe('Hébergement médico-social et social', 'CCT des Etablissements', "medico EMS Geneva");
await probe('Hébergement médico-social et social', 'GAV Bernischer', "medico Bern DE");
