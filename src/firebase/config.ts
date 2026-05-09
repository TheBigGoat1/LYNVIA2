// Import the functions you need from the SDKs you need
import { initializeApp, getApp, getApps, type FirebaseOptions } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

/**
 * Default Firebase web config (Lynvia). Override any field via NEXT_PUBLIC_FIREBASE_*
 * in `.env.local` so you can point at another project without editing source.
 *
 * @see https://firebase.google.com/docs/web/setup#available-libraries
 */
const defaultWebConfig: FirebaseOptions = {
  apiKey: "AIzaSyCCy4aSr3laJ53eOu25aAljLQ_OfnlvhCw",
  authDomain: "lynviadigital.firebaseapp.com",
  projectId: "lynviadigital",
  storageBucket: "crownscope-73c1e.firebasestorage.app",
  messagingSenderId: "1030475225173",
  appId: "1:1030475225173:web:704c31b5ee7618a3055cdc",
  measurementId: "G-99DKLW2T8F",
};

const firebaseConfig: FirebaseOptions = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || defaultWebConfig.apiKey,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || defaultWebConfig.authDomain,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || defaultWebConfig.projectId,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || defaultWebConfig.storageBucket,
  messagingSenderId:
    process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || defaultWebConfig.messagingSenderId,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || defaultWebConfig.appId,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || defaultWebConfig.measurementId,
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const firestore = getFirestore(app);
const storage = getStorage(app);

export { app, auth, firestore, storage };
