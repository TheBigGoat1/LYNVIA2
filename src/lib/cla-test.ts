// Quick CLA smoke test — run with: npx tsx src/lib/cla-test.ts
import {
  resolveClaForIndustry,
  validateSalaryAgainstCla,
  validateNoticePeriodAgainstCla,
  buildClaContextForAI,
} from './cla-rules';

const industries = [
  'hôtellerie',
  'construction',
  'commerce de détail',
  'horlogerie',
  'agriculture',
  'unknown sector xyz',
];

console.log('\n=== CLA AUTO-SELECTION ===');
for (const ind of industries) {
  const r = resolveClaForIndustry(ind);
  const tag =
    r.matchType === 'exact'
      ? '[EXACT]'
      : r.matchType === 'contains'
      ? '[PARTIAL]'
      : '[FALLBACK]';
  console.log(`${tag} "${ind}" → ${r.cla.name} (${r.cla.id})`);
}

console.log('\n=== SALARY VALIDATION ===');
const hotel = resolveClaForIndustry('hôtellerie').cla;
const tests = [
  { salary: 1800, role: 'chef' },
  { salary: 4500, role: 'chef' },
  { salary: 3000, role: 'employé' },
];
for (const t of tests) {
  const r = validateSalaryAgainstCla(hotel, t.salary, t.role);
  console.log(`  ${t.salary} CHF (${t.role}): ${r.isBelowMinimum ? '✗ BELOW MIN' : '✓ OK'} — ${r.message}`);
}

console.log('\n=== NOTICE PERIOD VALIDATION ===');
const constr = resolveClaForIndustry('construction').cla;
const noticeTests = [
  { notice: '7 jours', years: 1 },
  { notice: '1 mois', years: 3 },
  { notice: '2 mois', years: 5 },
];
for (const t of noticeTests) {
  const r = validateNoticePeriodAgainstCla(constr, t.notice, t.years);
  console.log(`  "${t.notice}" (${t.years}yr seniority): ${r.isCompliant ? '✓ OK' : '✗ TOO SHORT'} — ${r.message}`);
}

console.log('\n=== AI CONTEXT SNIPPET ===');
const ai = buildClaContextForAI(hotel);
console.log(ai.substring(0, 400) + '...\n');
