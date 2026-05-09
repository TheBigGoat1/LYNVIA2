import { buildSearchIndex, fastSearch, getMissingKeywords, normalizeText } from './src/lib/legal-assistant-search-index.ts';

// Mock Firestore data (simulating LTVA document chunks)
const mockDocuments = [
  {
    documentId: 'byp5XmOlQi8bj44vpsfo',
    title: 'LTVA - Loi sur la TVA',
    chunks: [
      {
        chunkId: 'chunk-1',
        text: 'Art. 48 Representative: Any person may be appointed as representative for a VAT group if they have professional qualifications.',
        docCanton: 'GE'
      },
      {
        chunkId: 'chunk-2',
        text: 'The representative of a TVA group must be authorized by the Federal Tax Administration.',
        docCanton: 'GE'
      },
      {
        chunkId: 'chunk-3',
        text: 'Group representation: A VAT group can be represented by a qualified tax advisor or accountant.',
        docCanton: 'GE'
      },
      {
        chunkId: 'chunk-4',
        text: 'Les groupes TVA doivent être représentés par une personne autorisée selon l\'art. 49 LTVA.',
        docCanton: 'GE'
      }
    ]
  }
];

async function testLegalAssistant() {
  console.log('=== Testing Legal Assistant Search ===\n');
  
  // Build search index
  console.log('1. Building search index...');
  const searchIndex = await buildSearchIndex(() => Promise.resolve(mockDocuments));
  console.log(`   ✓ Index built with ${Object.keys(searchIndex).length} terms\n`);
  
  // Test 1: English query with "VAT"
  console.log('2. Test: "Who can represent a VAT group?"');
  const results1 = fastSearch(searchIndex, 'Who can represent a VAT group?', { limit: 5 });
  console.log(`   Results: ${results1.length}`);
  results1.forEach(r => console.log(`   - [${r.score}] ${r.text.substring(0, 60)}...`));
  
  // Test 2: French query with "TVA" 
  console.log('\n3. Test: "Qui peut représenter un groupe TVA?"');
  const results2 = fastSearch(searchIndex, 'Qui peut représenter un groupe TVA?', { limit: 5 });
  console.log(`   Results: ${results2.length}`);
  results2.forEach(r => console.log(`   - [${r.score}] ${r.text.substring(0, 60)}...`));
  
  // Test 3: Synonym expansion check
  console.log('\n4. Test synonym expansion: "vat" should match "tva"');
  const normalizedVat = normalizeText('vat');
  const normalizedTva = normalizeText('tva');
  console.log(`   "vat" normalized: ${normalizedVat}`);
  console.log(`   "tva" normalized: ${normalizedTva}`);
  console.log(`   Match: ${normalizedVat === normalizedTva || searchIndex[normalizedVat] !== undefined}`);
  
  // Test 4: Check if "representative" matches "representant" (French)
  console.log('\n5. Test: "Who may act as representative of VAT group?"');
  const results3 = fastSearch(searchIndex, 'Who may act as representative of VAT group?', { limit: 5 });
  console.log(`   Results: ${results3.length}`);
  results3.forEach(r => console.log(`   - [${r.score}] ${r.text.substring(0, 60)}...`));
  
  console.log('\n=== Test Summary ===');
  const allPassed = results1.length > 0 && results2.length > 0 && results3.length > 0;
  console.log(allPassed ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED');
  
  return allPassed;
}

testLegalAssistant().catch(console.error);
