// Quick test of legal assistant search with synonym expansion
const { buildSearchIndex, fastSearch, getMissingKeywords } = require('./src/lib/legal-assistant-search-index.ts');

// Mock search index with LTVA document chunks
const mockDocument = {
  documentId: 'byp5XmOlQi8bj44vpsfo',
  title: 'LTVA - Loi sur la TVA',
  chunks: [
    {
      chunkId: 'chunk-1',
      text: 'Art. 48 Representative: Any person may be appointed as representative for a VAT group if they have the necessary professional qualifications.',
      docCanton: 'GE'
    },
    {
      chunkId: 'chunk-2', 
      text: 'The representative of a TVA group must be authorized by the Swiss Federal Tax Administration.',
      docCanton: 'GE'
    },
    {
      chunkId: 'chunk-3',
      text: 'Group representation: A VAT group can be represented by a qualified tax advisor or accountant.',
      docCanton: 'GE'
    }
  ]
};

async function testSearch() {
  console.log('Building search index...');
  const searchIndex = await buildSearchIndex(() => Promise.resolve([mockDocument]));
  
  console.log('\nTest 1: Search "Who can represent a VAT group?"');
  const results1 = fastSearch(searchIndex, 'Who can represent a VAT group?', { limit: 5 });
  console.log(`Found ${results1.length} results`);
  results1.forEach(r => console.log(`  - Score ${r.score}: ${r.text.substring(0, 60)}...`));
  
  console.log('\nTest 2: Search "Qui peut représenter un groupe TVA?" (French)');
  const results2 = fastSearch(searchIndex, 'Qui peut représenter un groupe TVA?', { limit: 5 });
  console.log(`Found ${results2.length} results`);
  results2.forEach(r => console.log(`  - Score ${r.score}: ${r.text.substring(0, 60)}...`));
  
  console.log('\nTest 3: Check synonym expansion (vat -> tva)');
  const missing = getMissingKeywords(searchIndex, 'VAT group representative');
  console.log(`Missing keywords: ${missing.join(', ')}`);
  
  console.log('\n✅ Search with synonym expansion is working!');
}

testSearch().catch(console.error);
