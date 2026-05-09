#!/usr/bin/env node
/**
 * Probe specific CCT PDFs by industry ID + document index.
 * Usage: node scripts/probe-targets.mjs
 */
import pdfParse from 'pdf-parse/lib/pdf-parse.js';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const catalog = require('../src/data/cla-documents.generated.json');

const CCT_BASE = path.resolve(process.cwd(), '..', 'Conventions_Collectives');
const CHARS = parseInt(process.argv[2] ?? '6000', 10);

// Each entry: [industryIdSubstring, docIndex, label]
const TARGETS = [
  ['horlogerie', 4, 'CCT industries horlogère et microtechnique FR'],
  ['jardinerie', 9, 'Salaires Horticultures Galabau 2026'],
  ['jardinerie', 10, 'Salaires minimaux 2024-2025'],
  ['jardinerie', 15, 'CCT Paysagistes Vaud 2024'],
  ['ferblanterie', 5, 'CCT second oeuvre romand FR'],
  ['ferblanterie', 1, 'CCT enveloppe des édifices FR'],
  ['travaux-d-install', 12, 'CCT branche électricité FR'],
  ['travaux-d-install', 6, 'CCT techniques du bâtiment FR'],
  ['travaux-de-finition', 10, 'CCNT carrelage Suisse FR'],
  ['travaux-de-finition', 17, 'CCT second oeuvre romand FR'],
  ['sante-humaine', 2, 'CCT sanitaire parapublic vaudois'],
  ['sante-humaine', 5, 'CCT Hôpitaux et Cliniques Bernois FR'],
  ['industries-alimentaires', 4, 'CCT boulangerie-pâtisserie Suisse FR'],
  ['industries-alimentaires', 1, 'CCT chocolatière Suisse FR'],
  ['entretien-et-reparation', 6, 'CCT garages Canton Vaud'],
  ['entretien-et-reparation', 8, 'CCT garages canton Genève'],
  ['commerce-de-vehic', 10, 'CCT garages Vaud (véhicules folder)'],
  ['menages-prives', 0, 'CTT économie domestique GE'],
  ['menages-prives', 1, 'CTT travailleurs économie domestique'],
  ['hebergement-medico', 1, 'CCT Institutions Personnes Agées Jura'],
  ['hebergement-medico', 2, 'CCT sanitaire parapublic vaudois'],
  ['enquetes-et-securite', 0, 'Sécurité 0'],
  ['enquetes-et-securite', 1, 'Sécurité 1'],
  ['autres-services-a-la-personne', 0, 'Autres services 0'],
  ['autres-services-a-la-personne', 4, 'Autres services 4'],
  ['commerce-de-gros', 0, 'Commerce gros 0'],
  ['commerce-de-gros', 1, 'Commerce gros 1'],
  ['demolition-et-prep', 0, 'Démolition 0'],
  ['demolition-et-prep', 1, 'Démolition 1'],
  ['creches-prise', 0, 'Crèches/action sociale 0'],
  ['creches-prise', 1, 'Crèches/action sociale 1'],
  ['culture-et-prod', 0, 'Agriculture 0'],
  ['culture-et-prod', 2, 'Agriculture 2'],
  ['fabrication-de-textiles', 0, 'Textiles 0'],
  ['fabrication-de-textiles', 2, 'Textiles 2'],
  ['fabrication-de-meubles', 0, 'Meubles 0'],
  ['fabrication-de-meubles', 4, 'Meubles 4'],
  ['fabrication-de-machines', 0, 'Machines/équipements 0'],
  ['fabrication-de-machines', 1, 'Machines/équipements 1'],
  ['fabrication-d-equipements-electriques', 0, 'Équipements électriques 0'],
  ['metallurgie', 0, 'Métallurgie 0'],
  ['metallurgie', 2, 'Métallurgie 2'],
  ['fabrication-de-produits-metalliques', 0, 'Produits métalliques 0'],
  ['fabrication-de-produits-metalliques', 7, 'Produits métalliques 7'],
  ['transports-de-voyageurs', 0, 'Transports voyageurs 0'],
  ['transports-de-voyageurs', 5, 'Transports voyageurs 5'],
];

for (const [idSub, docIdx, label] of TARGETS) {
  const industry = catalog.industries.find(i => i.id.includes(idSub));
  if (!industry) { console.log(`\n[NOT IN CATALOG] ${idSub}`); continue; }
  const doc = industry.documents[docIdx];
  if (!doc) { console.log(`\n[NO DOC ${docIdx}] ${industry.id}`); continue; }

  const absPath = path.join(CCT_BASE, industry.folderName, doc.fileName);
  if (!fs.existsSync(absPath)) { console.log(`\n[FILE NOT FOUND] ${absPath}`); continue; }

  try {
    const buf = fs.readFileSync(absPath);
    const parsed = await pdfParse(buf);
    const text = parsed.text.slice(0, CHARS);
    console.log(`\n${'='.repeat(70)}`);
    console.log(`SECTOR: ${industry.id}`);
    console.log(`LABEL:  ${label}`);
    console.log(`FILE:   ${doc.fileName}`);
    console.log(`PAGES:  ${parsed.numpages}`);
    console.log('-'.repeat(70));
    console.log(text);
  } catch (e) {
    console.log(`\n[PARSE ERROR] ${label}: ${e.message}`);
  }
}
