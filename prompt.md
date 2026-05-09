Prompt.md - Error Log

LAST ERROR (FIXED):
POST /en/individual/legal-assistant 500 in 704ms
⨯ AI_APICallError: This model does not support response format `json_schema`.
    at async legalQAAIAssistant (./src/ai/flows/legal-qa-assistant.ts:102:24)

ROOT CAUSE:
- Model `llama-3.3-70b-versatile` does not support `json_schema` structured outputs

FIX APPLIED:
- Changed DEFAULT_MODEL in `src/ai/groq.ts` from `llama-3.3-70b-versatile` to `meta-llama/llama-4-scout-17b-16e-instruct`
- This model supports `json_schema` in best-effort mode (strict: false)
- See: https://console.groq.com/docs/structured-outputs#supported-models

STATUS: ✅ Fixed - Build passes
