/**
 * When Firestore `legal_documents` / chunks cannot be used, the Legal Assistant
 * still calls Gemini with strict instructions (API-only / no RAG citations).
 */
export type KnowledgeBaseStatus = 'ok' | 'unavailable' | 'empty';

/** User-facing distinction: DB error vs search returned nothing */
export function resolveKnowledgeBaseStatus(
  retrievalFailed: boolean,
  chunkCount: number,
): KnowledgeBaseStatus {
  if (retrievalFailed) return 'unavailable';
  if (chunkCount === 0) return 'empty';
  return 'ok';
}

/**
 * Prepended to `context` so the model sees explicit mode (server-side only).
 * NOTE: Keep this conversational, NOT robotic with sections.
 */
export function buildKnowledgeBasePreamble(status: KnowledgeBaseStatus): string {
  if (status === 'ok') return '';

  return `The indexed legal document library is NOT available right now (${status === 'unavailable' ? 'database error' : 'no matching documents found'}).

Important: Give a brief, friendly, conversational reply (2-3 sentences max). Say you don't have specific info in your database right now, and suggest they ask about Swiss legal or financial topics. Do NOT use section headers like "Overview" or "Practical next steps". Just chat naturally.

Set "sources" to [] (empty array). Set messageType to "conversational".`;
}

/**
 * Final context string passed to legalQAAIAssistant.
 */
export function buildLegalAssistantContext(params: {
  claContext?: string;
  documentChunks: Array<{ title: string; text: string }>;
  kbStatus: KnowledgeBaseStatus;
}): string {
  const { claContext, documentChunks, kbStatus } = params;
  const preamble = buildKnowledgeBasePreamble(kbStatus);

  const docPart = documentChunks
    .map((chunk, idx) => `[Source ${idx + 1}: ${chunk.title}]\n${chunk.text}`)
    .join('\n\n');

  const core = [claContext?.trim(), docPart.trim()].filter(Boolean).join('\n\n');

  if (!preamble) {
    return core;
  }

  return `${preamble}\n\n---\n\n${core || '(No document context; CLA-only or empty.)'}`;
}
