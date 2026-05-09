#!/usr/bin/env node
/**
 * Extract all CHF amounts with context from critical PDFs.
 * Helps identify wage tables quickly.
 */
import pdfParse from 'pdf-parse/lib/pdf-parse.js';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const catalog = require('../src/data/cla-documents.generated.json');
const CCT_BASE = path.resolve(process.cwd(), '..', 'Conventions_Collectives');

// [industryIdSub, docIndex]
const TARGETS = [
  ['horlogerie', 4],                         // CCT horlogère et microtechnique FR
  ['ferblanterie', 1],                       // CCT enveloppe des édifices FR  
  ['ferblanterie', 3],                       // CCT ferblanterie couverture installation
  ['travaux-d-install', 12],                 // CCT électricité FR
  ['travaux-d-install', 6],                  // CCT techniques du bâtiment FR
  ['travaux-de-finition', 17],               // CCT second oeuvre romand
  ['travaux-de-finition', 9],                // CCNT carrelage Suisse FR
  ['travaux-de-finition', 41],               // GAV Bodenbelag DE
  ['sante-humaine', 2],                      // CCT sanitaire parapublic vaudois
  ['entretien-et-reparation', 6],            // CCT garages Vaud
  ['entretien-et-reparation', 2],            // CCT carrosserie FR
  ['menages-prives', 0],                     // CTT économie domestique GE
  ['hebergement-medico', 2],                 // EMS/parapublic vaudois
  ['industries-alimentaires', 7],            // CCT boucherie DE
  ['industries-alimentaires', 1],            // CCT chocolatière FR
  ['fabrication-de-meubles', 5],             // CCT meubles FR/DE
  ['fabrication-de-machines', 0],            // MEM CCT DE
  ['metallurgie', 0],                        // MEM CCT DE
  ['fabrication-de-produits-metalliques', 0], // MEM CCT DE
  ['fabrication-d-equipements-electriques', 0],// équipements électriques 0
  ['transports-de-voyageurs', 1],            // CarPostal FR
  ['transports-de-voyageurs', 4],            // Transport 4
  ['sylviculture', 0],                       // Forestière 0
  ['sylviculture', 4],                       // Forestière 4
  ['enquetes-et-securite', 0],               // Sécurité 0
  ['enquetes-et-securite', 2],               // Sécurité 2
  ['creches-prise', 1],                      // CTT aide à domicile GE
  ['autres-services', 0],                    // Coiffeurs
  ['autres-services', 5],                    // Autres services 5
  ['industrie-chimique', 2],                 // Chimie 2
  ['industrie-pharmaceutique', 1],           // Pharma 1
  ['horlogerie', 0],                         // MEM CCT horlogerie
  ['fabrication-de-textiles', 1],            // Textiles 1
  ['demolition', 0],                         // Démolition 0
  ['culture-et-prod', 1],                    // Agriculture 1
  ['activites-liees-a-l-emploi', 2],         // Agences emploi/location services
  ['commerce-de-vehic', 8],                  // Automobile Valais FR
];

// Find all CHF amounts 2100-9000 with context
function extractWageAmounts(text) {
  const results = [];
  // Pattern: Swiss format numbers near typical wage range
  const patterns = [
    /(?:CHF|Fr\.?)\s*(\d{1,2})['](\d{3})(?:[.,]\d{2})?/g,
    /(?:CHF|Fr\.?)\s*(\d{1,2})\s(\d{3})(?:[.,]\d{2})?/g,
    /(?:CHF|Fr\.?)\s*(\d{1,2})\.(\d{3})(?:[.,]\d{2})?/g,
    /\b(\d{1,2})['](\d{3})\s*(?:CHF|Fr\.?|\.--)/g,
    /\b(\d{4,5})\s*\.--\b/g,   // German format: 4500.--
  ];
  
  for (const pat of patterns) {
    pat.lastIndex = 0;
    let m;
    while ((m = pat.exec(text)) !== null) {
      let val;
      if (pat.source.includes('4,5}')) {
        val = parseInt(m[1], 10);
      } else if (m[2]) {
        val = parseInt(m[1] + m[2], 10);
      } else {
        continue;
      }
      if (val >= 2100 && val <= 9000) {
        const ctx = text.slice(Math.max(0, m.index - 60), m.index + 80)
          .replace(/\s+/g, ' ').trim();
        results.push({ val, raw: m[0], ctx });
      }
    }
  }
  return results;
}

for (const [idSub, docIdx] of TARGETS) {
  const industry = catalog.industries.find(i => i.id.includes(idSub));
  if (!industry) continue;
  const doc = industry.documents[docIdx];
  if (!doc) continue;
  const absPath = path.join(CCT_BASE, industry.folderName, doc.fileName);
  if (!fs.existsSync(absPath)) continue;

  try {
    const buf = fs.readFileSync(absPath);
    const parsed = await pdfParse(buf);
    const amounts = extractWageAmounts(parsed.text);
    
    if (amounts.length === 0) {
      console.log(`\n[NO WAGES] ${industry.id.slice(0, 55)} | ${doc.fileName.slice(0, 55)}`);
      continue;
    }

    console.log(`\n${'='.repeat(70)}`);
    console.log(`SECTOR: ${industry.id}`);
    console.log(`FILE:   ${doc.fileName.slice(0, 70)}`);
    console.log(`FOUND:  ${amounts.length} wage-range CHF values`);
    console.log(`RANGE:  ${Math.min(...amounts.map(a => a.val))} – ${Math.max(...amounts.map(a => a.val))}`);
    console.log('-'.repeat(70));
    // Show unique values with first occurrence context
    const seen = new Set();
    for (const { val, raw, ctx } of amounts) {
      if (!seen.has(val)) {
        seen.add(val);
        console.log(`  ${val} (${raw}) | ${ctx.slice(0, 100)}`);
      }
    }
  } catch (e) {
    // skip
  }
}
