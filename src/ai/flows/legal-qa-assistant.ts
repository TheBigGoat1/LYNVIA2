'use server';

/**
 * @fileOverview Implements the legal Q&A AI assistant flow using Vercel AI SDK + Groq.
 *
 * - legalQAAIAssistant - A function that handles natural language questions about Swiss financial and legal regulations,
 *   providing accurate, cited answers from an AI legal assistant.
 * - LegalQAInput - The input type for the legalQAAIAssistant function.
 * - LegalQAOutput - The return type for the legalQAAIAssistant function.
 */

import { generateObject } from 'ai';
import { z } from 'zod';
import { groq, DEFAULT_MODEL } from '@/ai/groq';

// --- Input and Output Schemas ---

const LegalQAInputSchema = z.object({
  query: z.string().describe('The natural language question about Swiss financial and legal regulations.'),
  context: z.string().describe('The relevant legal text chunks to use for the answer.'),
  outputLanguage: z.string().optional().describe('The desired language for the AI-generated answer (e.g., "English", "German"). Defaults to the language of the query.'),
});
export type LegalQAInput = z.infer<typeof LegalQAInputSchema>;

const LegalQAOutputSchema = z.object({
  answer: z.string().describe('The AI-generated answer to the legal question, including inline citations.'),
  sources: z.array(z.object({
    title: z.string().describe('The title of the legal document source.'),
    documentId: z.string().describe('The ID of the legal document source.'),
  })).describe('A list of legal document sources cited in the answer.'),
  messageType: z.enum(['greeting', 'legal', 'conversational', 'clarification'])
    .describe('The type of message detected, used for UI rendering hints.'),
});
export type LegalQAOutput = z.infer<typeof LegalQAOutputSchema>;


// --- Greeting / Conversational Detection (client-side fast path) ---

const GREETING_PATTERNS = [
  /^(hi|hello|hey|good\s*(morning|afternoon|evening)|bonjour|salut|hallo|ciao|hola)[!?.\s]*$/i,
  /^(how are you|what can you do|who are you|what are you)[!?.\s]*$/i,
  /^(thanks|thank you|merci|danke|gracias)[!?.\s]*$/i,
];

const isGreetingOrConversational = (query: string): boolean => {
  const trimmed = query.trim();
  return GREETING_PATTERNS.some(p => p.test(trimmed));
};

// --- Greeting responses (multi-language) ---
const getGreetingResponse = (query: string): LegalQAOutput => {
  const lower = query.toLowerCase();

  // French
  if (/bonjour|salut|merci|bonsoir/.test(lower)) {
    return {
      answer: `👋 Salut ! Ravie de vous voir ici !\n\nJe suis **LYNVIA**, votre assistante juridique. Pensez à moi comme une amie qui connaît bien le droit suisse 😊\n\nJe peux vous aider avec :\n• 📋 **Questions juridiques** — droit du travail, TVA, contrats\n• 💰 **Questions financières** — salaire, allocations, déductions\n• 📄 **Rédaction de documents** — lettres et documents conformes\n• 🏢 **Infos cantonales** — ce qui change selon votre canton\n\nAllez-y, posez-moi votre question ! Je suis là pour ça 💬`,
      sources: [],
      messageType: 'greeting',
    };
  }

  // German
  if (/hallo|guten\s*(morgen|tag|abend)|danke/.test(lower)) {
    return {
      answer: `👋 Hey, schön dass Sie da sind!\n\nIch bin **LYNVIA**, Ihre Rechtsassistentin. Stellen Sie sich mich als eine Freundin vor, die sich mit Schweizer Recht auskennt 😊\n\nIch kann Ihnen helfen mit:\n• 📋 **Rechtsfragen** — Arbeitsrecht, MwSt., Verträge\n• 💰 **Finanzfragen** — Gehalt, Zulagen, Abzüge\n• 📄 **Dokumente erstellen** — rechtskonforme Briefe und Vorlagen\n• 🏢 **Kantonale Infos** — was in Ihrem Kanton gilt\n\nFragen Sie einfach drauflos! Ich bin für Sie da 💬`,
      sources: [],
      messageType: 'greeting',
    };
  }

  // Default English
  return {
    answer: `👋 Hey there! Great to have you here!\n\nI'm **LYNVIA**, your legal assistant. Think of me as a friend who knows Swiss law really well 😊\n\nHere's what I can help you with:\n• 📋 **Legal questions** — employment law, VAT, contracts, compliance\n• 💰 **Financial stuff** — salary, allowances, deductions, tax impacts\n• 📄 **Document drafting** — legally compliant letters and templates\n• 🏢 **Canton-specific info** — rules that vary by region\n\nGo ahead and ask me anything! I'm here to help 💬`,
    sources: [],
    messageType: 'greeting',
  };
};

const getRateLimitMessage = (outputLanguage?: string): string => {
  if (outputLanguage?.toLowerCase().startsWith('fr')) {
    return `Je suis temporairement limite par le fournisseur IA en raison d'une utilisation élevée. Veuillez réessayer dans environ une minute.`;
  }
  if (outputLanguage?.toLowerCase().startsWith('de')) {
    return `Ich bin aufgrund hoher Auslastung beim KI-Anbieter vorübergehend limitiert. Bitte versuchen Sie es in etwa einer Minute erneut.`;
  }
  if (outputLanguage?.toLowerCase().startsWith('it')) {
    return `Sono temporaneamente limitato dal fornitore IA a causa dell'elevato utilizzo. Riprova tra circa un minuto.`;
  }
  if (outputLanguage?.toLowerCase().startsWith('es')) {
    return `Estoy temporalmente limitado por el proveedor de IA debido al alto uso. Vuelve a intentarlo en aproximadamente un minuto.`;
  }

  return `I'm temporarily rate-limited by the AI provider due to high usage. Please retry in about a minute.`;
};

// --- Main Function ---

export async function legalQAAIAssistant(input: LegalQAInput): Promise<LegalQAOutput> {
  // Fast path: handle greetings and simple conversational inputs without calling the AI
  if (isGreetingOrConversational(input.query)) {
    return getGreetingResponse(input.query);
  }

  const language = input.outputLanguage || 'the same language as the user\'s query';

  try {
    const result = await generateObject({
      model: groq(DEFAULT_MODEL),
      schema: LegalQAOutputSchema,
      system: `You are LYNVIA — a knowledgeable, warm, and conversational Swiss legal and financial assistant. You are like a friendly expert who chats naturally, NOT a robot that outputs structured reports.

CRITICAL TONE REQUIREMENTS:
- Write like Claude or ChatGPT: natural, flowing paragraphs, conversational — NEVER robotic.
- NO section headers like "Overview", "Practical next steps", "When to consult a professional" — these are FORBIDDEN.
- Keep answers concise: 1-3 short paragraphs maximum. No walls of text.
- Start casually: "Sure!", "Great question!", "Absolutely!" — then answer directly.
- End by inviting follow-ups: "Anything else?", "What else can I help with?"
- Use **bold** only for key terms (1-2 per answer max).

SOURCING RULES (NON-NEGOTIABLE):
- You MUST ONLY use the provided "Context" section. ZERO outside knowledge unless explicitly told otherwise.
- When citing the context, quote EXACTLY: "According to [Document Title], 'exact quote here'."
- You MUST include the exact document title in your answer and in the "sources" array.
- NEVER, EVER fabricate a source, document name, law, amount, or date. If you don't have a real source, set sources to [].
- If the context is empty or doesn't contain the answer: say "I don't have specific information on that in my database" and suggest asking about Swiss legal/financial topics. Set sources to [].

HANDLING MIXED QUESTIONS:
- If part of the question is in the context and part isn't: answer the context part with quotes/citations, then briefly answer the rest conversationally (1 sentence).
- Add a short note in ${language}: "*(This part is from outside my knowledge base.)*"
- Only include sources for the context-based part.

BEHAVIOR:
- Legal/financial questions: Answer from context, quote exactly, cite properly, keep it short and natural.
- Conversational follow-ups: Chat naturally! Be warm and human.
- Ambiguous questions: Offer 3-4 concrete suggestions instead of asking "what do you mean?"
- Off-topic: Engage briefly, then gently steer back: "By the way, I'm here if you need any Swiss legal or financial help!"

FINAL REMINDERS:
- Always respond in ${language}.
- Be brief, warm, and conversational — like texting a knowledgeable friend.
- NO structured sections. NO "Overview". NO "Practical next steps". Just natural flow.
- NEVER invent sources. EVER.`,
      prompt: `Context:
${input.context}
---

Question: ${input.query}

---

Return valid JSON only. Schema:
{
  "answer": "string — your formatted answer",
  "sources": [{ "title": "string", "documentId": "string" }],
  "messageType": "legal" | "conversational" | "clarification"
}

CRITICAL: If the question is NOT about Swiss law/finance or you don't have relevant context, set "sources" to [] (empty array). NEVER invent or fabricate sources.`,
    });

    return result.object;
  } catch (error: any) {
    const errorText = `${error?.message || ''}`.toLowerCase();
    const isQuotaError =
      error?.statusCode === 429 ||
      errorText.includes('rate limit') ||
      errorText.includes('quota') ||
      errorText.includes('too many requests');

    if (isQuotaError) {
      return {
        answer: getRateLimitMessage(input.outputLanguage),
        sources: [],
        messageType: 'conversational',
      };
    }

    throw error;
  }
}
