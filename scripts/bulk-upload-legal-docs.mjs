#!/usr/bin/env node
/**
 * bulk-upload-legal-docs.mjs
 *
 * Bulk-uploads PDFs from a local folder to the Lynvia Legal Database in Firebase.
 * Replicates the exact logic used by the admin panel + document-indexer-flow.ts:
 *   1. Upload file to Firebase Storage (legal_uploads/)
 *   2. Create Firestore record in `legal_documents` (status: Processing)
 *   3. Extract text via pdf-parse
 *   4. Chunk text by double-newlines (identical to document-indexer-flow.ts)
 *   5. Write chunks to `legal_documents/{id}/chunks` subcollection
 *   6. Set status to "Pending Approval"
 *
 * You then approve documents in the admin panel as usual.
 *
 * Usage (run from lynviadigital-main/ folder):
 *
 *   # Preview what will be uploaded (no writes):
 *   node scripts/bulk-upload-legal-docs.mjs --folder "../Work law" --dry-run
 *
 *   # Upload Work law PDFs:
 *   node scripts/bulk-upload-legal-docs.mjs --folder "../Work law" --type "Federal Law"
 *
 *   # Upload Text laws PDFs:
 *   node scripts/bulk-upload-legal-docs.mjs --folder "../Text laws" --type "Federal Law"
 *
 *   # Upload Conventions Collectives (all subfolders):
 *   node scripts/bulk-upload-legal-docs.mjs --folder "../Conventions_Collectives" --type "CCT / CLA"
 *
 *   # Custom canton (e.g. only upload Vaud canton laws):
 *   node scripts/bulk-upload-legal-docs.mjs --folder "../some-folder" --type "Cantonal Law" --canton "VD"
 *
 * Options:
 *   --folder    Path to folder containing PDFs, relative to cwd (required)
 *   --type      Document type tag shown in admin panel  (default: "Federal Law")
 *   --canton    Canton tag                              (default: "federal")
 *   --email     Admin email                             (default: admin@gmail.com)
 *   --password  Admin password                          (default: 12345678)
 *   --delay     Milliseconds to wait between uploads    (default: 1500)
 *   --dry-run   List files without uploading
 */

import { initializeApp } from 'firebase/app';
import {
  getAuth,
  signInWithEmailAndPassword,
  setPersistence,
  inMemoryPersistence,
} from 'firebase/auth';
import {
  getFirestore,
  collection,
  addDoc,
  doc,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { readFileSync, readdirSync, statSync, existsSync } from 'fs';
import { join, basename, extname, resolve, relative } from 'path';
import { createRequire } from 'module';
import { parseArgs } from 'util';

const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse');

// ── Firebase config (matches src/firebase/config.ts) ────────────────────────
const firebaseConfig = {
  apiKey: 'AIzaSyCCy4aSr3laJ53eOu25aAljLQ_OfnlvhCw',
  authDomain: 'lynviadigital.firebaseapp.com',
  projectId: 'lynviadigital',
  storageBucket: 'crownscope-73c1e.firebasestorage.app',
  messagingSenderId: '1030475225173',
  appId: '1:1030475225173:web:704c31b5ee7618a3055cdc',
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// ── CLI argument parsing ─────────────────────────────────────────────────────
const { values: args } = parseArgs({
  strict: false,
  options: {
    folder:    { type: 'string' },
    type:      { type: 'string',  default: 'Federal Law' },
    canton:    { type: 'string',  default: 'federal' },
    email:     { type: 'string',  default: 'admin@gmail.com' },
    password:  { type: 'string',  default: '12345678' },
    delay:     { type: 'string',  default: '1500' },
    'dry-run': { type: 'boolean', default: false },
  },
});

if (!args.folder) {
  console.error('\nError: --folder is required.\n');
  console.error('Example: node scripts/bulk-upload-legal-docs.mjs --folder "../Work law"\n');
  process.exit(1);
}

// ── Helpers ──────────────────────────────────────────────────────────────────
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Walk a directory recursively and collect all .pdf files. */
function collectPDFs(dir) {
  const results = [];
  if (!existsSync(dir)) {
    console.error(`\nFolder not found: ${dir}\n`);
    process.exit(1);
  }
  const walk = (current) => {
    for (const entry of readdirSync(current)) {
      const full = join(current, entry);
      try {
        const st = statSync(full);
        if (st.isDirectory()) {
          walk(full);
        } else if (extname(entry).toLowerCase() === '.pdf') {
          results.push(full);
        }
      } catch {
        // Skip unreadable entries
      }
    }
  };
  walk(dir);
  return results;
}

/**
 * Build a clean document title from the file path.
 * - Strips leading "RS 123.456 – " style prefixes.
 * - For files inside a subfolder, prepends the subfolder name as sector context.
 */
function buildTitle(filePath, baseFolder) {
  const rel = relative(baseFolder, filePath);           // e.g. "Activités de nettoyage/CCT 2024.pdf"
  const parts = rel.split(/[/\\]/);
  const rawName = basename(filePath, '.pdf');
  const cleanName = rawName
    .replace(/^RS\s+[\d.]+\s*[-–—]?\s*/i, '')          // strip RS number prefix
    .trim() || rawName;

  if (parts.length > 1) {
    // Include the immediate parent folder name (sector) in the title
    const sector = parts[parts.length - 2];
    const combined = `${sector} — ${cleanName}`;
    return combined.substring(0, 120);                  // Firestore field cap
  }
  return cleanName.substring(0, 120);
}

/**
 * Chunk extracted text — exact replica of document-indexer-flow.ts logic:
 * split by double newlines, keep chunks with >50 characters.
 */
function chunkText(text) {
  return text.split(/\n\s*\n/).filter((c) => c.trim().length > 50);
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  const folderPath = resolve(args.folder);
  const docType    = args.type;
  const canton     = args.canton;
  const isDryRun   = args['dry-run'];
  const delay      = Math.max(500, parseInt(args.delay, 10) || 1500);

  console.log('\n╔══════════════════════════════════════════════════╗');
  console.log('║      Lynvia Legal DB — Bulk Upload Script        ║');
  console.log('╚══════════════════════════════════════════════════╝');
  console.log(`  Folder  : ${folderPath}`);
  console.log(`  Type    : ${docType}`);
  console.log(`  Canton  : ${canton}`);
  console.log(`  Dry run : ${isDryRun}`);
  console.log(`  Delay   : ${delay}ms between uploads`);
  console.log('');

  // Collect PDFs
  const pdfs = collectPDFs(folderPath);
  console.log(`  Found ${pdfs.length} PDF(s)\n`);

  if (pdfs.length === 0) {
    console.log('No PDFs found. Exiting.');
    return;
  }

  // Dry-run: just list files and exit
  if (isDryRun) {
    pdfs.forEach((p, i) => {
      const title = buildTitle(p, folderPath);
      console.log(`  ${String(i + 1).padStart(3)}. [${title}]`);
      console.log(`       ${p}`);
    });
    console.log(`\nDry run complete. ${pdfs.length} files would be uploaded.`);
    return;
  }

  // Sign in to Firebase
  console.log(`  Signing in as ${args.email}...`);
  try {
    await setPersistence(auth, inMemoryPersistence);
    await signInWithEmailAndPassword(auth, args.email, args.password);
    console.log('  Signed in successfully.\n');
  } catch (authErr) {
    console.error(`\nAuthentication failed: ${authErr.message}`);
    console.error('Check your --email and --password arguments.\n');
    process.exit(1);
  }

  let success = 0;
  let failed  = 0;
  const errors = [];

  for (let i = 0; i < pdfs.length; i++) {
    const filePath = pdfs[i];
    const fileName = basename(filePath);
    const title    = buildTitle(filePath, folderPath);
    const prefix   = `[${String(i + 1).padStart(3)}/${pdfs.length}]`;

    process.stdout.write(`${prefix} ${title.substring(0, 55).padEnd(55)} ... `);

    try {
      // ── Step 1: Read file from disk ──────────────────────────────────────
      const fileBuffer = readFileSync(filePath);

      // ── Step 2: Upload to Firebase Storage ──────────────────────────────
      const storagePath = `legal_uploads/${Date.now()}_${fileName}`;
      const storageRef  = ref(storage, storagePath);
      await uploadBytes(storageRef, fileBuffer, { contentType: 'application/pdf' });
      const downloadURL = await getDownloadURL(storageRef);

      // ── Step 3: Create Firestore document (status: Processing) ──────────
      const docRef = await addDoc(collection(db, 'legal_documents'), {
        title,
        type:             docType,
        canton,
        status:           'Processing',
        chunks:           0,
        lastUpdated:      serverTimestamp(),
        storagePath,
        downloadURL,
        originalFileName: fileName,
      });

      // ── Step 4: Extract text from PDF ───────────────────────────────────
      let textContent = '';
      try {
        const data = await pdfParse(fileBuffer);
        textContent = data.text || '';
      } catch (parseErr) {
        throw new Error(`PDF text extraction failed: ${parseErr.message}`);
      }

      if (!textContent.trim()) {
        throw new Error('No text extracted — file may be a scanned image PDF');
      }

      // ── Step 5: Chunk the text (identical to document-indexer-flow.ts) ──
      const chunks = chunkText(textContent);
      if (chunks.length === 0) {
        throw new Error('No meaningful text chunks produced');
      }

      // ── Step 6: Write chunks to Firestore subcollection ─────────────────
      const chunksRef = collection(doc(db, 'legal_documents', docRef.id), 'chunks');
      for (let j = 0; j < chunks.length; j++) {
        await addDoc(chunksRef, {
          chunkNumber: j + 1,
          text:        chunks[j],
          charCount:   chunks[j].length,
          indexedAt:   serverTimestamp(),
        });
      }

      // ── Step 7: Mark as "Pending Approval" ──────────────────────────────
      await updateDoc(doc(db, 'legal_documents', docRef.id), {
        status:      'Pending Approval',
        chunks:      chunks.length,
        lastUpdated: serverTimestamp(),
      });

      process.stdout.write(`✓  (${chunks.length} chunks)\n`);
      success++;

    } catch (err) {
      process.stdout.write(`✗  FAILED\n`);
      const msg = `[${i + 1}] ${fileName}: ${err.message}`;
      errors.push(msg);
      console.error(`       → ${err.message}`);
      failed++;
    }

    // Throttle between uploads to respect Firebase rate limits
    if (i < pdfs.length - 1) {
      await sleep(delay);
    }
  }

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log('\n╔══════════════════════════════════════════════════╗');
  console.log(`║  Done!  ✓ ${String(success).padEnd(5)} uploaded   ✗ ${String(failed).padEnd(5)} failed       ║`);
  console.log('╚══════════════════════════════════════════════════╝');

  if (errors.length > 0) {
    console.log('\nFailed files:');
    errors.forEach((e) => console.log(`  - ${e}`));
  }

  console.log('\nNext step: open the admin panel → Legal Database');
  console.log('           and approve each "Pending Approval" document.\n');

  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error('\nFatal error:', err);
  process.exit(1);
});
