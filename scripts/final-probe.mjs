#!/usr/bin/env node
import pdfParse from 'pdf-parse/lib/pdf-parse.js';
import fs from 'node:fs';
import path from 'node:path';

const CCT = 'c:/Users/ADMIN/Downloads/lynvia/Conventions_Collectives';

const files = [
  ['Industries alimentaires de boissons et fourragere', 'CCT pour la boucherie-charcuterie Suisse_DE.pdf', 'boucherie DE'],
  ['Industries alimentaires de boissons et fourragere', 'CCT de la boulangerie-pâtisserie-confiserie artisanale Suisse_FR.pdf', 'boulangerie FR'],
  ['Industries alimentaires de boissons et fourragere', 'CCT de la boulangerie-pâtisserie-confiserie artisanale Suisse_DE.pdf', 'boulangerie DE'],
  ['Ménages privés avec personnel domestique', 'Contrat-type de travail de l_économie domestique GE (CTT-EDom)_FR.pdf', 'menages GE'],
  ['Ménages privés avec personnel domestique', 'Contrat-type de travail pour les travailleurs de l_économie domestique (CTT-Edom) VD_FR.pdf', 'menages VD'],
  ['Hébergement médico-social et social', 'CCT Association Jurassienne des Institutions pour Personnes Agées et Fondation pour l_Aide et les Soins à Domicile_FR.pdf', 'medico Jura'],
  ['Hébergement médico-social et social', 'CCT dans le secteur sanitaire parapublic vaudois_FR.pdf', 'medico Vaud'],
  ['Santé humaine', 'CCT dans le secteur sanitaire parapublic vaudois_FR.pdf', 'sante Vaud'],
  ['Horlogerie', 'CCT des industries horlogère et microtechnique suisses_FR.pdf', 'horlogerie FR'],
  ['Horlogerie', 'CCT des industries horlogère et microtechnique suisses_DE.pdf', 'horlogerie DE'],
  ['Travaux d_installation électrique, plomberie et autres travaux d_installation', 'CCT de la branche suisse de l_électricité_FR.pdf', 'electrique FR'],
  ['Travaux d_installation électrique, plomberie et autres travaux d_installation', 'CCT dans la branche suisse des techniques du bâtiment_FR.pdf', 'batiment FR'],
  ['Transports de voyageurs en bus, trams, remontées mécaniques, taxis ; transport de marchandises par la route', 'CCT CarPostal_FR.pdf', 'carpostal FR'],
  ['Enquêtes et sécurité', 'CCT pour la branche privée de la sécurité_DE.pdf', 'securite DE'],
  ['Enquêtes et sécurité', 'CCT pour la branche privée de la sécurité_FR.pdf', 'securite FR'],
  ['Autres services à la personne (p. ex. coiffure, esthétique, blanchisserie, spas, services funéraires)', 'CCT nationale des coiffeurs_DE.pdf', 'coiffeurs DE'],
  ['Fabrication de meubles', 'GAV für das Schreinergewerbe Deutschschweiz und Tessin_DE.pdf', 'meubles Schreiner DE'],
  ['Travaux de finition (p.ex. carrelage, menuiserie)', 'CCNT pour le carrelage pour toute la Suisse à l_exception de FR, BS, BL, VD, VS, NE, GE, TI, JU_FR.pdf', 'carrelage CCNT FR'],
  ['Crèches, prise en charge de personnes âgées et_ou en situation de handicap, autres services d_action sociale sans hébergement', 'Contrat-type de travail pour les organisations de soins et d_aide à domicile GE (CTT-OSAD)_FR.pdf', 'creches CTT-OSAD GE'],
];

// Find all wage-range CHF values with context  
function extractWages(text) {
  const results = [];
  // All CHF/Fr patterns including plain 4-digit
  const patterns = [
    /(?:CHF|Fr\.?)\s*(\d{1,2})['](\d{3})(?:[.,]\d{2})?/g,
    /(?:CHF|Fr\.?)\s*(\d{1,2})\.(\d{3})(?:[.,]\d{2})?/g,
    /(?:CHF|Fr\.?)\s*(\d{1,2})\s(\d{3})(?:[.,]\d{2})?/g,
    /\b(\d{1,2})['](\d{3})\.--/g,
    /\b(\d{4,5})\.--/g,
    /(?:CHF|Fr\.?)\s*(\d{4,5})(?=\s|$|\.|\,)/g,
  ];
  for (const pat of patterns) {
    pat.lastIndex = 0; let m;
    while ((m = pat.exec(text)) !== null) {
      let v;
      if (m[2] && m[2].length <= 3) v = parseInt(m[1] + m[2], 10);
      else if (m[1] && m[1].length === 4) v = parseInt(m[1], 10);
      else if (m[1] && m[1].length === 5) v = parseInt(m[1], 10);
      else continue;
      if (v >= 2200 && v <= 9000) {
        const ctx = text.slice(Math.max(0, m.index - 60), m.index + 90).replace(/\s+/g, ' ').trim();
        results.push({v, raw: m[0].trim(), ctx, pos: m.index});
      }
    }
  }
  return results;
}

for (const [folder, fname, label] of files) {
  const f = path.join(CCT, folder, fname);
  if (!fs.existsSync(f)) {
    console.log(`[NOT FOUND] ${label}: ${fname.slice(0,60)}`);
    continue;
  }
  try {
    const buf = fs.readFileSync(f);
    const parsed = await pdfParse(buf);
    const wages = extractWages(parsed.text);
    if (!wages.length) {
      console.log(`[NO WAGES]  ${label}: ${fname.slice(0,60)}`);
      continue;
    }
    console.log(`\n=== ${label} ===`);
    console.log(`File: ${fname.slice(0,70)}`);
    console.log(`Range: ${Math.min(...wages.map(w=>w.v))} – ${Math.max(...wages.map(w=>w.v))}`);
    const seen = new Set();
    wages.forEach(w => {
      if (!seen.has(w.v)) {
        seen.add(w.v);
        console.log(`  ${w.v} | ${w.ctx.slice(0,110)}`);
      }
    });
  } catch(e) {
    console.log(`[PARSE ERR] ${label}: ${e.message.slice(0,60)}`);
  }
}
