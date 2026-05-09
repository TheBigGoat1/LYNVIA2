import admin from 'firebase-admin';

if (!admin.apps.length) {
  try {
    // Prefer FIREBASE_SERVICE_ACCOUNT_JSON; fall back to FIREBASE_ADMIN_SDK_JSON
    const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON ?? process.env.FIREBASE_ADMIN_SDK_JSON;
    if (!raw) {
      throw new Error('No Firebase Admin SDK JSON environment variable found. Set FIREBASE_ADMIN_SDK_JSON in .env.local');
    }

    // dotenv strips outer quotes but:
    //  - leaves \" as \+" (not a real quote), AND
    //  - converts \\n inside quoted strings to real newlines (char 10)
    // Fix both before JSON.parse:
    let normalised = raw
      .replace(/\\"/g, '"')       // \" → "
      .replace(/\n/g, '\\n');     // real newlines → \n literal (valid in JSON strings)
    // If it still starts with a quote (dotenv didn't strip), unwrap it
    if (normalised.startsWith('"') && normalised.endsWith('"')) {
      normalised = normalised.slice(1, -1);
    }

    let parsed: any;
    try {
      parsed = JSON.parse(normalised);
    } catch {
      // Last resort: raw parse of original (e.g. FIREBASE_ADMIN_SDK_JSON which has no escaping issues)
      parsed = JSON.parse(raw);
    }
    if (typeof parsed === 'string') parsed = JSON.parse(parsed);
    const serviceAccount = parsed;

    // Ensure the private key has real newlines (dotenv may leave them as \n literals)
    if (serviceAccount.private_key) {
      serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
    }

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: serviceAccount.project_id ?? process.env.FIREBASE_PROJECT_ID,
    });
  } catch (error: any) {
    console.error('Firebase Admin SDK initialization error:', error.message);
    throw error;
  }
}

export const ensureAdminInitialized = () => admin.apps.length > 0;

export default admin;