#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';

const repoRoot = process.cwd();
const defaultSourceDir = path.resolve(repoRoot, '..', 'Conventions_Collectives');
const sourceDirArg = process.argv[2];
const sourceDir = sourceDirArg ? path.resolve(repoRoot, sourceDirArg) : defaultSourceDir;
const outputPath = path.resolve(repoRoot, 'src', 'data', 'cla-documents.generated.json');
const rulesOutputPath = path.resolve(repoRoot, 'src', 'data', 'cla-rules.generated.json');

function normalizeForAlias(value) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[_()]/g, ' ')
    .replace(/[^a-zA-Z0-9\s'\-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function slugify(value) {
  return normalizeForAlias(value)
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

function buildAliases(folderName) {
  const aliases = new Set();
  const normalized = normalizeForAlias(folderName);
  if (normalized) aliases.add(normalized);

  const withoutExamples = normalized.replace(/\bp\.?\s*ex\.?[^)]*/g, '').trim();
  if (withoutExamples) aliases.add(withoutExamples);

  for (const part of withoutExamples.split(/[;,/]/)) {
    const p = part.trim();
    if (p.length >= 3) aliases.add(p);
  }

  return Array.from(aliases).sort((a, b) => a.localeCompare(b));
}

function getPdfFilesInDir(absoluteDir) {
  const entries = fs.readdirSync(absoluteDir, { withFileTypes: true });
  const out = [];
  for (const entry of entries) {
    if (!entry.isFile()) continue;
    if (!entry.name.toLowerCase().endsWith('.pdf')) continue;
    out.push(entry.name);
  }
  return out.sort((a, b) => a.localeCompare(b));
}

if (!fs.existsSync(sourceDir)) {
  console.error(`CLA source folder not found: ${sourceDir}`);
  process.exit(1);
}

const industryDirs = fs
  .readdirSync(sourceDir, { withFileTypes: true })
  .filter((e) => e.isDirectory())
  .map((e) => e.name)
  .sort((a, b) => a.localeCompare(b));

const industries = industryDirs.map((industryFolder) => {
  const absoluteDir = path.join(sourceDir, industryFolder);
  const pdfFiles = getPdfFilesInDir(absoluteDir);
  const aliases = buildAliases(industryFolder);
  const id = slugify(industryFolder);

  return {
    id,
    folderName: industryFolder,
    aliases,
    documentCount: pdfFiles.length,
    documents: pdfFiles.map((fileName) => ({
      fileName,
      relativePath: path.posix.join('Conventions_Collectives', industryFolder, fileName).replace(/\\/g, '/'),
    })),
  };
});

const payload = {
  generatedAt: new Date().toISOString(),
  sourceDirectory: sourceDir,
  totalIndustryFolders: industries.length,
  totalDocuments: industries.reduce((sum, i) => sum + i.documentCount, 0),
  industries,
};

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');

console.log(`Generated ${outputPath}`);
console.log(`Industries: ${payload.totalIndustryFolders}`);
console.log(`Documents: ${payload.totalDocuments}`);

// --- Generate slim pre-computed rules (for client-side use) ---

function normalizeForMatch(value) {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[_()]/g, ' ')
    .replace(/[^a-z0-9\s'\-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function deriveRuleAliases(folderName, aliases, fileNames) {
  const out = new Set();
  for (const alias of aliases) {
    const n = normalizeForMatch(alias);
    if (n.length >= 2) out.add(n);
  }
  const nFolder = normalizeForMatch(folderName);
  if (nFolder.length >= 2) out.add(nFolder);
  for (const token of nFolder.split(/\s+/)) {
    if (token.length >= 4) out.add(token);
  }
  for (const fileName of fileNames) {
    const base = fileName.replace(/\.pdf$/i, '');
    const n = normalizeForMatch(base);
    if (!n.includes('cct') && !n.includes('ccnt') && !n.includes('ctt')) continue;
    out.add(n);
  }
  return Array.from(out).sort((a, b) => a.localeCompare(b));
}

const CO_DEFAULT_NOTICE = {
  trialPeriodDays: 7,
  year1Months: 1,
  year2to9Months: 2,
  year10PlusMonths: 3,
};

// Load manually-verified wage data (extracted from CCT PDFs)
const verifiedWagesPath = path.resolve(repoRoot, 'src', 'data', 'cla-verified-wages.json');
let verifiedWages = {};
if (fs.existsSync(verifiedWagesPath)) {
  const vw = JSON.parse(fs.readFileSync(verifiedWagesPath, 'utf8'));
  verifiedWages = vw.sectors ?? {};
  console.log(`Loaded verified wages for ${Object.keys(verifiedWages).length} sectors`);
}

const slimRules = industries.map((industry) => {
  const firstDoc = industry.documents[0];
  const ruleAliases = deriveRuleAliases(
    industry.folderName,
    industry.aliases,
    industry.documents.map((d) => d.fileName),
  );
  const verified = verifiedWages[industry.id];
  const noticePeriods = verified?.noticePeriods
    ? {
        trialPeriodDays: verified.noticePeriods.trialPeriodDays ?? CO_DEFAULT_NOTICE.trialPeriodDays,
        year1Months: verified.noticePeriods.year1Months ?? CO_DEFAULT_NOTICE.year1Months,
        year2to9Months: verified.noticePeriods.year2to9Months ?? CO_DEFAULT_NOTICE.year2to9Months,
        year10PlusMonths: verified.noticePeriods.year10PlusMonths ?? CO_DEFAULT_NOTICE.year10PlusMonths,
      }
    : CO_DEFAULT_NOTICE;

  return {
    id: industry.id,
    name: `CCT Documents - ${industry.folderName}`,
    nameFr: `Conventions collectives - ${industry.folderName}`,
    industries: ruleAliases,
    minimumMonthlyWage: verified?.minimumMonthlyWage ?? 0,
    minimumHourlyWage: verified?.minimumHourlyWage ?? 0,
    noticePeriods,
    wagesByRole: verified?.wagesByRole ?? [],
    cctUrl: firstDoc ? `local://${firstDoc.relativePath}` : 'local://Conventions_Collectives',
    legalBasis: `Source documents: Conventions_Collectives/${industry.folderName}`,
  };
});

slimRules.push({
  id: 'default-co',
  name: 'CO - Code des Obligations (no specific CLA)',
  nameFr: 'Code des Obligations - Pas de CCT applicable',
  industries: [
    'services', 'administration', 'office', 'fiduciaire', 'accounting',
    'it', 'technology', 'informatique', 'software', 'consulting', 'conseil',
    'marketing', 'communication', 'finance', 'banque', 'assurance', 'insurance',
    'immobilier', 'real estate', 'architecture', 'juridique', 'legal',
    'education', 'formation', 'transport', 'logistique', 'logistics',
  ],
  minimumMonthlyWage: 0,
  minimumHourlyWage: 0,
  noticePeriods: CO_DEFAULT_NOTICE,
  wagesByRole: [],
  cctUrl: 'https://www.fedlex.admin.ch/eli/cc/27/317_321_377/fr',
  legalBasis: 'CO art. 319-362 (pas de CCT etendue applicable)',
});

const rulesPayload = {
  generatedAt: new Date().toISOString(),
  rules: slimRules,
};

fs.writeFileSync(rulesOutputPath, `${JSON.stringify(rulesPayload, null, 2)}\n`, 'utf8');
console.log(`Generated ${rulesOutputPath}`);
console.log(`Rules: ${slimRules.length}`);
