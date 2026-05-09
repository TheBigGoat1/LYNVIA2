#!/usr/bin/env node
import { initializeApp, cert } from 'firebase/admin';
import { getFirestore, collection, getDocs, query, where, doc, updateDoc } from 'firebase/firestore';

// Initialize Firebase Admin with service account from env
const serviceAccount = JSON.parse(process.env.FIREBASE_ADMIN_SDK_JSON || process.env.FIREBASE_SERVICE_ACCOUNT_JSON || '{}');

if (!serviceAccount.project_id) {
  console.error('Missing Firebase service account. Set FIREBASE_ADMIN_SDK_JSON env variable.');
  process.exit(1);
}

const app = initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore(app);

// Text cleaning function (same as in document-indexer-flow.ts)
const cleanText = (text) => {
  if (!text) return text;
  return text
    .replace(/https?:\/\/\S+/g, ' ')
    .replace(/Page\s+\d+\s+sur\s+\d+/gi, ' ')
    .replace(/RS\s+\d+\.\d+/gi, ' ')
    .replace(/fedlex\.admin\.ch\/[^\s]+/gi, ' ')
    .replace(/\d{2}\.\d{2}\.\d{2}\s+\d{2}:\d{2}/g, ' ')
    .replace(/Art\.?\s*\d+/gi, ' ')
    .replace(/[a-z]\.\s*/g, ' ')
    .replace(/\([^)]*\)/g, ' ')
    .replace(/[^\w\s\u00C0-\u024F\u1E00-\u1EFF'-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

async function main() {
  console.log('=== MIGRATION: Clean all legal document chunks ===\n');
  
  const docsSnap = await getDocs(collection(db, 'legal_documents'));
  console.log(`Found ${docsSnap.size} legal documents`);
  
  let totalChunks = 0;
  let cleanedChunks = 0;
  
  for (const docSnap of docsSnap.docs) {
    const docData = docSnap.data();
    const chunksSnap = await getDocs(collection(db, 'legal_documents', docSnap.id, 'chunks'));
    
    for (const chunkSnap of chunksSnap.docs) {
      totalChunks++;
      const chunkData = chunkSnap.data();
      const originalText = chunkData.text || '';
      const cleaned = cleanText(originalText);
      
      if (cleaned !== originalText) {
        await updateDoc(doc(db, 'legal_documents', docSnap.id, 'chunks', chunkSnap.id), {
          text: cleaned
        });
        cleanedChunks++;
        
        if (cleanedChunks <= 3) {
          console.log(`Sample cleaned chunk ${chunkSnap.id}:`);
          console.log('Before:', originalText.substring(0, 100));
          console.log('After:', cleaned.substring(0, 100));
          console.log('---');
        }
      }
    }
    
    // Update document status to force re-indexing maybe
    // Not needed; search index rebuilds from fresh data
  }
  
  console.log(`\n=== MIGRATION COMPLETE ===`);
  console.log(`Total chunks processed: ${totalChunks}`);
  console.log(`Chunks cleaned: ${cleanedChunks}`);
  console.log('Please rebuild the search index in the app (admin search index page)');
  
  process.exit(0);
}

main().catch(e => {
  console.error('Migration failed:', e.message);
  process.exit(1);
});
