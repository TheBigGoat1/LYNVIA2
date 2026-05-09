#!/usr/bin/env node
import 'dotenv/config';
import admin from 'firebase-admin';

const serviceAccountRaw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
if (!serviceAccountRaw) {
  console.error('Missing FIREBASE_SERVICE_ACCOUNT_JSON in environment.');
  process.exit(1);
}

let serviceAccount;
try {
  serviceAccount = JSON.parse(serviceAccountRaw);
} catch {
  try {
    // Supports env values encoded as escaped JSON, e.g. {\"type\":\"service_account\"}
    const normalized = serviceAccountRaw
      .trim()
      .replace(/^"|"$/g, '')
      .replace(/\\+"/g, '"')
      .replace(/\\\r?\n/g, '\\n');
    serviceAccount = JSON.parse(normalized);
  } catch {
    console.error('FIREBASE_SERVICE_ACCOUNT_JSON is not valid JSON.');
    process.exit(1);
  }
}

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const args = process.argv.slice(2);
const readArg = (name) => {
  const prefix = `--${name}=`;
  const hit = args.find((arg) => arg.startsWith(prefix));
  return hit ? hit.slice(prefix.length) : undefined;
};

const email = readArg('email') || process.env.LYNVIA_ADMIN_EMAIL || 'admin@lynvia.digital';
const password = readArg('password') || process.env.LYNVIA_ADMIN_PASSWORD;
const firstName = readArg('firstName') || process.env.LYNVIA_ADMIN_FIRST_NAME || 'Lynvia';
const lastName = readArg('lastName') || process.env.LYNVIA_ADMIN_LAST_NAME || 'Administrator';
const displayName = `${firstName} ${lastName}`.trim();

const auth = admin.auth();
const db = admin.firestore();

const claims = {
  role: 'admin',
  fullPlatformAccess: true,
  permissions: {
    manageUsers: true,
    manageAccess: true,
    requestClientDocuments: true,
    sendNotifications: true,
    sendDocuments: true,
  },
};

async function upsertAdminUser() {
  let userRecord;

  try {
    userRecord = await auth.getUserByEmail(email);
    await auth.updateUser(userRecord.uid, { displayName });

    if (password) {
      await auth.updateUser(userRecord.uid, { password });
    }

    console.log(`Using existing auth user: ${email}`);
  } catch (error) {
    if (error.code !== 'auth/user-not-found') {
      throw error;
    }

    if (!password) {
      throw new Error('Admin user does not exist yet. Provide --password=... or LYNVIA_ADMIN_PASSWORD to create it.');
    }

    userRecord = await auth.createUser({
      email,
      password,
      displayName,
      emailVerified: true,
    });

    console.log(`Created auth user: ${email}`);
  }

  await auth.setCustomUserClaims(userRecord.uid, claims);

  await db.collection('users').doc(userRecord.uid).set(
    {
      email,
      role: 'admin',
      status: 'active',
      profileCompleted: true,
      profile: {
        firstName,
        lastName,
      },
      company: 'Lynvia Digital',
      access: claims,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  console.log('Admin Firestore profile upserted.');
  console.log(`Admin UID: ${userRecord.uid}`);
}

upsertAdminUser()
  .then(async () => {
    await admin.app().delete();
  })
  .catch(async (error) => {
    console.error('Failed to create Lynvia Administrator:', error.message || error);
    try {
      await admin.app().delete();
    } catch {}
    process.exit(1);
  });
