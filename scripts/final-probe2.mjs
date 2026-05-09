#!/usr/bin/env node
import pdfParse from 'pdf-parse/lib/pdf-parse.js';
import fs from 'node:fs';
import path from 'node:path';

const B = 'c:/Users/ADMIN/Downloads/lynvia/Conventions_Collectives';

const files = [
  ['Industries alimentaires, de boissons et fourragère', 'CCT pour la boucherie-charcuterie Suisse_DE.pdf', 'boucherie DE'],
  ['Industries alimentaires, de boissons et fourragère', 'CCT de la boulangerie-pâtisserie-confiserie artisanale Suisse_DE.pdf', 'boulangerie DE'],
  ['Industries alimentaires, de boissons et fourragère', 'CCT de l_industrie chocolatière suisse_FR.pdf', 'chocolat FR'],
  ['Ménages privés avec personnel domestique', 'Contrat-type de travail de l_économie domestique GE (CTT-EDom)_FR.pdf', 'menages GE'],
  ['Hébergement médico-social et social', 'CCT des Etablissements médico-sociaux (EMS) pour les personnes âgées,', 'medico EMS'],
  ['Hébergement médico-social et social', 'CCT du secteur de la santé du canton de Neuchâtel - version droit priv', 'medico NE'],
  ['Santé humaine', 'CCT dans le secteur sanitaire parapublic vaudois_FR.pdf', 'sante VD'],
  ['Travaux de finition (p.ex. carrelage, menuiserie)', 'GAV für die Schweizerische Bodenbelagsbranche_DE.pdf', 'finition sol DE'],
  ['Travaux d_installation électrique, plomberie et autres travaux d_installation', 'CCT de la branche suisse de l_électricité_FR.pdf', 'elec FR'],
  ['Travaux d_installation électrique, plomberie et autres travaux d_installation', 'CCT dans la branche suisse des techniques du bâtiment_FR.pdf', 'batiment FR'],
  ['Crèches, prise en charge de personnes âgées et_ou en situation de handicap, autres services d_action sociale sans hébergement', 'Contrat-type de travail pour les organisations de soins et d_aide à domicile GE (CTT-OSAD)_FR.pdf', 'OSAD GE'],
];

function extractWages(text) {
  const results = [];
  const patterns = [
    /(?:CHF|Fr\.?)\s*(\d{1,2})['](\d{3})/g,
    /(?:CHF|Fr\.?)\s*(\d{1,2})\.(\d{3})/g,
    /(?:CHF|Fr\.?)\s*(\d{1,2})\s(\d{3})\b/g,
    /\b(\d{1,2})['](\d{3})\.--/g,
    /\b(\d{4,5})\.--/g,
    /(?:CHF|Fr\.?)\s*(\d{4,5})(?=[. \n])/g,
  ];
  for (const pat of patterns) {
    pat.lastIndex = 0; let m;
    while ((m = pat.exec(text)) !== null) {
      let v = 0;
      if (m[2] && m[2].length <= 3) v = parseInt(m[1] + m[2], 10);
      else if (m[1] && m[1].length >= 4) v = parseInt(m[1], 10);
      if (v >= 2200 && v <= 9000) {
        const ctx = text.slice(Math.max(0, m.index - 60), m.index + 100).replace(/\s+/g, ' ').trim();
        results.push({v, raw: m[0].trim(), ctx, pos: m.index});
      }
    }
  }
  return results;
}

for (const [folder, fname, label] of files) {
  // Try exact name first, then prefix match
  let f = path.join(B, folder, fname);
  if (!fs.existsSync(f)) {
    // Try prefix match in folder
    const dir = path.join(B, folder);
    if (!fs.existsSync(dir)) { console.log(`[NO DIR]    ${label}`); continue; }
    const match = fs.readdirSync(dir).find(n => n.startsWith(fname.slice(0, 35)));
    if (!match) { console.log(`[NOT FOUND] ${label}: ${fname.slice(0,50)}`); continue; }
    f = path.join(dir, match);
    console.log(`[PREFIX MATCH] ${label}: ${match.slice(0,60)}`);
  }
  try {
    const parsed = await pdfParse(fs.readFileSync(f));
    const wages = extractWages(parsed.text);
    if (!wages.length) {
      // Show first 500 chars so we know what's there
      console.log(`[NO WAGES]  ${label}  (chars: ${parsed.text.length})`);
      console.log('  SAMPLE: ' + parsed.text.slice(0,200).replace(/\s+/g,' '));
      continue;
    }
    console.log(`\n=== ${label} ===`);
    console.log(`Range: ${Math.min(...wages.map(w=>w.v))} – ${Math.max(...wages.map(w=>w.v))}`);
    const seen = new Set();
    wages.forEach(w => {
      if (!seen.has(w.v)) {
        seen.add(w.v);
        console.log(`  ${w.v} | ${w.ctx.slice(0,120)}`);
      }
    });
  } catch(e) {
    console.log(`[PARSE ERR] ${label}: ${e.message.slice(0,80)}`);
  }
}
