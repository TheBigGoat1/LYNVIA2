#!/usr/bin/env node
// Deep probe: search for wage section in a PDF by keyword
import pdfParse from 'pdf-parse/lib/pdf-parse.js';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const catalog = require('../src/data/cla-documents.generated.json');

const CCT_BASE = path.resolve(process.cwd(), '..', 'Conventions_Collectives');

// [industryIdSub, docIndex, keyword, contextChars]
const SEARCHES = [
  ['ferblanterie', 1, 'Mindestlohnkategorien', 2000],    // enveloppe des édifices
  ['ferblanterie', 3, 'salaire', 2000],                   // ferblanterie, couverture, installation sanitaire
  ['travaux-d-install', 12, 'Mindestlohn', 2000],         // électricité FR
  ['travaux-d-install', 6, 'Mindestlohn', 2000],          // techniques du bâtiment FR
  ['travaux-de-finition', 10, 'Monatslohn', 2000],        // carrelage CCNT FR  
  ['horlogerie', 4, 'Mindestlohn', 3000],                 // horlogerie microtechnique FR
  ['entretien-et-reparation', 6, 'Salaires', 3000],       // garages Vaud FR
  ['entretien-et-reparation', 8, 'salaire', 3000],        // garages Genève FR
  ['sante-humaine', 2, 'Salaire', 4000],                  // sanitaire vaudois
  ['sante-humaine', 5, 'Mindestlohn', 3000],              // Bernois FR (but it's DE)
  ['industries-alimentaires', 4, 'salaire', 3000],        // boulangerie
  ['industries-alimentaires', 7, 'salaire', 3000],        // boucherie FR
  ['menages-prives', 0, 'salaire', 3000],                 // économie domestique GE
  ['menages-prives', 1, 'salaire', 3000],                 // CTT travailleurs domestiques
  ['hebergement-medico', 2, 'salaire', 3000],             // parapublic vaudois
  ['enquetes-et-securite', 0, 'salaire', 3000],           // sécurité 0
  ['autres-services', 0, 'salaire', 3000],                // autres services 0
  ['autres-services', 3, 'salaire', 3000],                // autres services 3
  ['commerce-de-gros', 1, 'salaire', 3000],               // commerce gros 1
  ['commerce-de-vehic', 10, 'salaire', 3000],             // garages dans vehicules folder
  ['demolition-et-prep', 1, 'salaire', 3000],             // démolition 1
  ['creches-prise', 1, 'salaire', 3000],                  // crèches 1
  ['fabrication-de-textiles', 0, 'salaire', 2000],        // textiles 0
  ['fabrication-de-meubles', 3, 'salaire', 2000],         // meubles 3
  ['fabrication-de-machines', 2, 'salaire', 2000],        // machines 2
  ['metallurgie', 1, 'salaire', 2000],                    // métallurgie 1
  ['jardinerie', 17, 'salaire', 4000],                    // CCT nationale full doc
  ['transports-de-voyageurs', 3, 'salaire', 3000],        // transports 3
  ['transports-de-voyageurs', 7, 'salaire', 3000],        // transports 7
  ['sylviculture', 0, 'salaire', 3000],                   // forestière 0
  ['services-d-amenagement', 0, 'salaire', 3000],         // aménagement paysager 0
];

for (const [idSub, docIdx, keyword, ctxChars] of SEARCHES) {
  const industry = catalog.industries.find(i => i.id.includes(idSub));
  if (!industry) { console.log(`[!] No industry: ${idSub}`); continue; }
  const doc = industry.documents[docIdx];
  if (!doc) { console.log(`[!] No doc ${docIdx} in ${idSub}`); continue; }
  const absPath = path.join(CCT_BASE, industry.folderName, doc.fileName);
  if (!fs.existsSync(absPath)) { console.log(`[!] File missing: ${absPath}`); continue; }

  try {
    const buf = fs.readFileSync(absPath);
    const parsed = await pdfParse(buf);
    const text = parsed.text;
    // Find keyword (case insensitive)
    const idx = text.toLowerCase().indexOf(keyword.toLowerCase());
    if (idx < 0) {
      console.log(`\n[NO "${keyword}"] ${industry.id.slice(0, 50)} | ${doc.fileName.slice(0, 50)}`);
      // Try nearby numeric patterns
      const nums = [...text.matchAll(/(?:CHF|Fr\.?)\s*(\d{1,2}['.]?\d{3})/gi)];
      if (nums.length > 0) {
        console.log(`  First 3 CHF values in doc: ${nums.slice(0, 3).map(m => m[0]).join(' | ')}`);
      }
      continue;
    }
    console.log(`\n${'='.repeat(60)}`);
    console.log(`${industry.id.slice(0, 60)}`);
    console.log(`${doc.fileName.slice(0, 70)}`);
    console.log(`keyword: "${keyword}" at pos ${idx}`);
    console.log('-'.repeat(60));
    console.log(text.slice(Math.max(0, idx - 200), idx + ctxChars));
  } catch (e) {
    console.log(`[PARSE ERR] ${doc.fileName}: ${e.message.slice(0, 80)}`);
  }
}
