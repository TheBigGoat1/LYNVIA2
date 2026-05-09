'use client';

const normalizeText = (text: string): string => {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
};

export const normalizeTextExport = normalizeText;

// Synonym map for cross-language search (English -> French/Swiss terms)
const SYNONYMS: Record<string, string[]> = {
  'vat': ['tva', 'taxe', 'valeur', 'ajoutee'],
  'tva': ['vat', 'tax'],
  'group': ['groupe', 'groupement'],
  'groupe': ['group', 'groupement'],
  'groupement': ['group', 'groupe'],
  'representative': ['representant', 'mandataire'],
  'representant': ['representative', 'mandataire'],
  'mandataire': ['representative', 'representant'],
  'authorized': ['autorise', 'habilitation'],
  'autorise': ['authorized', 'habilitation'],
  'fiscal': ['fiscale'],
  'power': ['procuration', 'pouvoir'],
  'procuration': ['power', 'pouvoir'],
};

// Expand a keyword with its synonyms
const expandWithSynonyms = (keyword: string): string[] => {
  const expanded = new Set<string>([keyword]);
  const synonyms = SYNONYMS[keyword];
  if (synonyms) {
    synonyms.forEach(s => expanded.add(s));
  }
  return [...expanded];
};

export type IndexedChunk = {
  documentId: string;
  title: string;
  chunkId: string;
  text: string;
  docCanton: string;
  keywords: string[];
  lastUpdated: number;
};

export type SearchIndex = {
  keywordToChunks: Record<string, string[]>;
  chunks: Record<string, IndexedChunk>;
  lastFullRebuild: number;
};

const MAX_KEYWORDS_PER_CHUNK = 50;
const KEYWORD_MIN_LENGTH = 2;

const extractKeywordsFromText = (text: string): string[] => {
  // Clean the text first: remove URLs, page numbers, special patterns from PDF parsing
  const cleaned = text
    .replace(/https?:\/\/\S+/g, ' ') // Remove URLs
    .replace(/page\s+\d+\s+sur\s+\d+/gi, ' ') // Remove "Page X sur Y"
    .replace(/rs\s+\d+\.\d+/gi, ' ') // Remove "RS 641.20" patterns
    .replace(/fedlex\.admin\.ch\/[^\s]+/gi, ' ') // Remove Fedlex URLs
    .replace(/09\.02\.26\s+12:23/g, ' ') // Remove timestamps
    .replace(/art\.?\s*\d+/gi, ' ') // Remove "Art. 66" patterns
    .replace(/[a-z]\.\s*/g, ' ') // Remove "a.", "b.", etc. list markers
    .replace(/\([^)]*\)/g, ' ') // Remove parenthetical content like "(LTVA)"
    .replace(/[^\w\s'-]/g, ' ') // Remove special chars except apostrophes and hyphens
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();
  
  const normalized = normalizeText(cleaned);
  // Extract words and also common phrases (2-word combos)
  const words = normalized.split(/\s+/).filter(w => w.length >= KEYWORD_MIN_LENGTH);
  const phrases: string[] = [];
  for (let i = 0; i < words.length - 1; i++) {
    phrases.push(`${words[i]} ${words[i + 1]}`);
  }
  const allTerms = [...words, ...phrases];
  const uniqueWords = [...new Set(allTerms)];
  return uniqueWords.slice(0, MAX_KEYWORDS_PER_CHUNK);
};

export const buildSearchIndex = async (
  getDocuments: () => Promise<Array<{ documentId: string; title: string; chunks: Array<{ chunkId: string; text: string; docCanton: string }> }>>
): Promise<SearchIndex> => {
  const documents = await getDocuments();
  
  const keywordToChunks: Record<string, string[]> = {};
  const chunks: Record<string, IndexedChunk> = {};
  
  for (const doc of documents) {
    for (const chunk of doc.chunks) {
      const chunkId = `${doc.documentId}_${chunk.chunkId}`;
      const keywords = extractKeywordsFromText(`${doc.title} ${chunk.text}`);
      
      const indexedChunk: IndexedChunk = {
        documentId: doc.documentId,
        title: doc.title,
        chunkId: chunk.chunkId,
        text: chunk.text,
        docCanton: chunk.docCanton,
        keywords,
        lastUpdated: Date.now(),
      };
      
      chunks[chunkId] = indexedChunk;
      
      for (const kw of keywords) {
        if (!keywordToChunks[kw]) {
          keywordToChunks[kw] = [];
        }
        if (!keywordToChunks[kw].includes(chunkId)) {
          keywordToChunks[kw].push(chunkId);
        }
      }
    }
  }
  
  return {
    keywordToChunks,
    chunks,
    lastFullRebuild: Date.now(),
  };
};

export const fastSearch = (
  searchIndex: SearchIndex,
  searchText: string,
  options: { limit?: number } = {}
): Array<{ documentId: string; title: string; chunkId: string; text: string; score: number }> => {
  const normalizedQuery = normalizeText(searchText);
  const queryKeywords = normalizedQuery.split(/\s+/).filter(k => k.length >= KEYWORD_MIN_LENGTH);

  if (queryKeywords.length === 0) {
    return [];
  }

  const chunkScores: Record<string, number> = {};

  // Expand keywords with synonyms for cross-language search
  const expandedKeywords: string[] = [];
  for (const kw of queryKeywords) {
    expandedKeywords.push(...expandWithSynonyms(kw));
  }
  const uniqueKeywords = [...new Set(expandedKeywords)];

  // Score chunks based on keyword matches
  for (const queryKw of uniqueKeywords) {
    // Keyword index match (fast path)
    const matchingChunkIds = searchIndex.keywordToChunks[queryKw];
    if (matchingChunkIds) {
      for (const chunkId of matchingChunkIds) {
        chunkScores[chunkId] = (chunkScores[chunkId] || 0) + 3;
      }
    }

    // Direct text search fallback for all chunks (catches more)
    for (const chunkId of Object.keys(searchIndex.chunks)) {
      const chunk = searchIndex.chunks[chunkId];
      const chunkTextNormalized = normalizeText(chunk.text);
      const titleNormalized = normalizeText(chunk.title);
      if (chunkTextNormalized.includes(queryKw) || titleNormalized.includes(queryKw)) {
        chunkScores[chunkId] = (chunkScores[chunkId] || 0) + 1;
      }
    }
  }

  // Bonus: if query is a phrase (2+ words), check for phrase match
  if (queryKeywords.length > 1) {
    const phrase = queryKeywords.join(' ');
    for (const chunkId of Object.keys(searchIndex.chunks)) {
      const chunk = searchIndex.chunks[chunkId];
      const chunkTextNormalized = normalizeText(chunk.text);
      if (chunkTextNormalized.includes(phrase)) {
        chunkScores[chunkId] = (chunkScores[chunkId] || 0) + 5; // Big bonus for phrase match
      }
    }
  }

  const results = Object.entries(chunkScores)
    .filter(([_, score]) => score > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, options.limit || 10) // Increased from 5 to 10
    .map(([chunkId, score]) => {
      const chunk = searchIndex.chunks[chunkId];
      return {
        documentId: chunk.documentId,
        title: chunk.title,
        chunkId: chunk.chunkId,
        text: chunk.text,
        score,
      };
    });

  return results;
};

export const getMissingKeywords = (
  searchIndex: SearchIndex,
  searchText: string
): string[] => {
  const normalizedQuery = normalizeText(searchText);
  const queryKeywords = normalizedQuery.split(/\s+/).filter(k => k.length >= KEYWORD_MIN_LENGTH);
  
  // Expand with synonyms to check if any synonym exists in index
  const expandedKeywords: string[] = [];
  for (const kw of queryKeywords) {
    expandedKeywords.push(...expandWithSynonyms(kw));
  }
  const uniqueExpanded = [...new Set(expandedKeywords)];
  
  // Return original keywords that have no match (even via synonyms)
  const missing: string[] = [];
  for (const kw of queryKeywords) {
    const synonyms = expandWithSynonyms(kw);
    const hasMatch = synonyms.some(s => searchIndex.keywordToChunks[s]);
    if (!hasMatch) {
      missing.push(kw);
    }
  }
  return missing;
};

export const updateSearchIndex = (
  searchIndex: SearchIndex,
  newChunks: IndexedChunk[]
): SearchIndex => {
  const updatedIndex = { ...searchIndex, keywordToChunks: { ...searchIndex.keywordToChunks }, chunks: { ...searchIndex.chunks } };
  
  for (const chunk of newChunks) {
    const chunkId = `${chunk.documentId}_${chunk.chunkId}`;
    
    updatedIndex.chunks[chunkId] = chunk;
    
    for (const kw of chunk.keywords) {
      if (!updatedIndex.keywordToChunks[kw]) {
        updatedIndex.keywordToChunks[kw] = [];
      }
      if (!updatedIndex.keywordToChunks[kw].includes(chunkId)) {
        updatedIndex.keywordToChunks[kw].push(chunkId);
      }
    }
  }
  
  return updatedIndex;
};