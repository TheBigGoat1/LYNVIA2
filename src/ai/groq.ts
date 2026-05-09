import { createGroq } from '@ai-sdk/groq';

const groqApiKey = process.env.GROQ_API_KEY || '';

export const groq = createGroq({
  apiKey: groqApiKey,
});

// Using meta-llama/llama-4-scout-17b-16e-instruct which supports json_schema (best-effort mode)
export const DEFAULT_MODEL = 'meta-llama/llama-4-scout-17b-16e-instruct';
