#!/usr/bin/env node
/**
 * Backfill `prenom`, `nom`, and `fonction` on `companies/{companyId}/employees/*`
 * from `firstName`, `lastName`, and `position` when the French payroll fields are missing.
 *
 * Usage (from repo root, with service account in env):
 *   node scripts/backfill-employee-payroll-fields.mjs
 *   node scripts/backfill-employee-payroll-fields.mjs --dry-run
 *
 * Env: FIREBASE_SERVICE_ACCOUNT_JSON or FIREBASE_ADMIN_SDK_JSON (same as other scripts).
 */
import 'dotenv/config';
import admin from 'firebase-admin';

const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON ?? process.env.FIREBASE_ADMIN_SDK_JSON;
if (!raw) {
  console.error('Set FIREBASE_SERVICE_ACCOUNT_JSON or FIREBASE_ADMIN_SDK_JSON.');
  process.exit(1);
}

let serviceAccount;
try {
  serviceAccount = JSON.parse(raw);
} catch {
  try {
    const normalized = raw
      .trim()
      .replace(/^"|"$/g, '')
      .replace(/\\+"/g, '"')
      .replace(/\\\r?\n/g, '\\n');
    serviceAccount = JSON.parse(normalized);
  } catch {
    console.error('Service account JSON is invalid.');
    process.exit(1);
  }
}

if (serviceAccount.private_key) {
  serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
}

if (!admin.apps.length) {
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
}

const db = admin.firestore();
const dryRun = process.argv.includes('--dry-run');

let companies = 0;
let employees = 0;
let updated = 0;

async function main() {
  const companySnap = await db.collection('companies').get();
  for (const companyDoc of companySnap.docs) {
    companies += 1;
    const empSnap = await companyDoc.ref.collection('employees').get();
    for (const empDoc of empSnap.docs) {
      employees += 1;
      const d = empDoc.data();
      const firstName = (d.firstName ?? '').toString().trim();
      const lastName = (d.lastName ?? '').toString().trim();
      const position = (d.position ?? '').toString().trim();
      const prenom = (d.prenom ?? '').toString().trim();
      const nom = (d.nom ?? '').toString().trim();
      const fonction = (d.fonction ?? '').toString().trim();

      const patch = {};
      if (firstName && !prenom) patch.prenom = firstName;
      if (lastName && !nom) patch.nom = lastName;
      if (position && !fonction) patch.fonction = position;

      if (Object.keys(patch).length === 0) continue;

      updated += 1;
      if (dryRun) {
        console.log(`[dry-run] ${companyDoc.id}/${empDoc.id}`, patch);
      } else {
        await empDoc.ref.update(patch);
        console.log(`updated ${companyDoc.id}/${empDoc.id}`, patch);
      }
    }
  }

  console.log(
    dryRun ? 'Dry run complete.' : 'Backfill complete.',
    { companiesScanned: companies, employeeDocsScanned: employees, employeesPatched: updated, dryRun },
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
