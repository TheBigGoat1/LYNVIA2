/**
 * Document-in-Chat Helpers
 *
 * Detects when a user wants to generate a document via the AI chat,
 * resolves the matching template, and provides field-collection utilities.
 */

import { templateCategories, type Template } from '@/data/company-document-templates';

// ─── Intent Detection ────────────────────────────────────────────────────────

const DOC_INTENT_PATTERNS: RegExp[] = [
  // English
  /\b(generate|draft|create|write|prepare|make)\b.{0,30}\b(document|contract|letter|notice|termination|certificate|agreement|attestation|warning|reminder|invoice)\b/i,
  /\b(document|contract|letter|notice|termination|certificate|agreement|attestation|warning|reminder)\b.{0,30}\b(for me|please|now)\b/i,
  /\b(employment contract|work contract|termination letter|notice letter|warning letter|work certificate|reference letter|debt collection|share transfer|commercial contract|rental agreement|tax letter)\b/i,

  // French
  /\b(génère|genere|rédige|redige|crée|cree|écris|ecris|prépare|prepare|fais)\b.{0,30}\b(document|contrat|lettre|courrier|attestation|certificat|avertissement|rappel|facture|mise en demeure|résiliation|resiliation)\b/i,
  /\b(contrat de travail|lettre de licenciement|certificat de travail|avertissement|mise en demeure|cession de parts|lettre de résiliation|lettre de resiliation|rappel de paiement|contrat commercial|bail|contrat de bail)\b/i,
  /\b(licenciement|congé|conge|résiliation|resiliation)\b.{0,15}\b(lettre|courrier|document)\b/i,

  // German
  /\b(erstelle|schreibe|generiere|verfasse)\b.{0,30}\b(dokument|vertrag|brief|kündigung|kundigung|zeugnis|mahnung|abmahnung|vereinbarung)\b/i,
  /\b(arbeitsvertrag|kündigungsschreiben|kundigungsschreiben|arbeitszeugnis|abmahnung|mahnschreiben|handelsvertrag|mietvertrag)\b/i,
];

export type DocumentIntent = {
  detected: boolean;
  matchedTemplate: Template | null;
  allTemplates: Template[];
  confidence: 'high' | 'medium' | 'low';
};

/**
 * Detect whether a user message is requesting document generation.
 */
export function detectDocumentIntent(userMessage: string): DocumentIntent {
  const allTemplates = templateCategories.flatMap(cat => cat.templates);
  const lower = userMessage.toLowerCase();

  // Check patterns
  const patternMatch = DOC_INTENT_PATTERNS.some(p => p.test(userMessage));

  if (!patternMatch) {
    return { detected: false, matchedTemplate: null, allTemplates, confidence: 'low' };
  }

  // Try to match a specific template
  const matchedTemplate = findBestTemplate(lower, allTemplates);

  return {
    detected: true,
    matchedTemplate,
    allTemplates,
    confidence: matchedTemplate ? 'high' : 'medium',
  };
}

// ─── Template Matching ───────────────────────────────────────────────────────

const TEMPLATE_KEYWORDS: Record<string, string[]> = {
  // Category 1: Contrats de travail
  'ENT-1.1': ['contrat de travail', 'employment contract', 'work contract', 'arbeitsvertrag'],
  'ENT-1.2': ['annexe au contrat', 'avenant', 'amendment', 'contract amendment', 'vertragsänderung', 'modification contrat'],
  'ENT-1.3': ['confidentialité', 'non-débauchage', 'non-sollicitation', 'confidentiality', 'non-compete', 'non-solicitation', 'geheimhaltung'],
  // Category 2: Gestion RH
  'ENT-2.1': ['lettre de licenciement', 'termination letter', 'kündigungsschreiben', 'licenciement', 'termination', 'kündigung'],
  'ENT-2.2': ['certificat de travail', 'work certificate', 'arbeitszeugnis', 'employment certificate', 'reference letter'],
  'ENT-2.3': ['avertissement', 'warning letter', 'abmahnung', 'written warning', 'blâme'],
  // Category 3: Correspondance commerciale
  'ENT-3.1': ['procuration', 'power of attorney', 'vollmacht', 'proxy', 'mandataire'],
  'ENT-3.2': ['lettre information', 'courrier général', 'general letter', 'information letter', 'allgemeiner brief'],
  'ENT-3.3': ['trust mandate', 'mandat fiduciaire', 'fiduciary', 'treuhandmandat'],
  // Category 4: Fiscalité
  'ENT-4.1': ['courrier fiscal', 'autorités fiscales', 'tax authority', 'steuerbehörde', 'administration fiscale', 'lettre fiscale'],
  'ENT-4.2': ['réclamation taxation', 'tax objection', 'steuereinsprache', 'contestation impôt', 'tax appeal'],
  // Category 5: Contrats commerciaux
  'ENT-5.1': ['vente biens mobiliers', 'sale of goods', 'kaufvertrag', 'contrat de vente'],
  'ENT-5.2': ['contrat entreprise', 'contrat d\'entreprise', 'werkvertrag', 'construction contract', 'travaux'],
  'ENT-5.3': ['contrat de prêt', 'loan agreement', 'darlehensvertrag', 'prêt'],
  'ENT-5.4': ['prêt actionnaire', 'shareholder loan', 'aktionärsdarlehen'],
  'ENT-5.5': ['cession de créance', 'assignment of claim', 'forderungsabtretung', 'zession'],
  'ENT-5.6': ['reconnaissance de dette', 'promissory note', 'schuldanerkennung'],
  'ENT-5.7': ['convention accord', 'transaction', 'settlement agreement', 'vergleich'],
  'ENT-5.8': ['société nom collectif', 'snc', 'general partnership', 'kollektivgesellschaft'],
  // Category 6: Recouvrement
  'ENT-6.1': ['sommation', 'mise en demeure', 'formal demand', 'mahnung', 'rappel de paiement', 'payment reminder'],
  // Category 7: Sàrl - Cession de parts
  'ENT-7.1': ['cession de parts', 'share transfer', 'anteilsübertragung', 'parts sociales', 'cession sàrl'],
  'ENT-7.2': ['procès-verbal assemblée', 'pv assemblée', 'assembly minutes', 'gesellschafterversammlung'],
  'ENT-7.3': ['réquisition transfert', 'registre du commerce', 'rc inscription', 'handelsregister'],
};

function findBestTemplate(lowerMessage: string, templates: Template[]): Template | null {
  let bestScore = 0;
  let bestTemplate: Template | null = null;

  for (const template of templates) {
    const keywords = TEMPLATE_KEYWORDS[template.id] || [];
    let score = 0;

    for (const kw of keywords) {
      if (lowerMessage.includes(kw)) {
        score += kw.split(' ').length; // longer match = higher score
      }
    }

    // Also match on template title
    const titleWords = template.title.toLowerCase().split(/\s+/);
    for (const w of titleWords) {
      if (w.length > 3 && lowerMessage.includes(w)) score += 0.5;
    }

    if (score > bestScore) {
      bestScore = score;
      bestTemplate = template;
    }
  }

  return bestScore >= 1 ? bestTemplate : null;
}

// ─── Template Field Extraction ───────────────────────────────────────────────

export type FieldInfo = {
  name: string;
  label: string;
  required: boolean;
};

/**
 * Extract human-readable field info from a template's Zod schema.
 */
export function getTemplateFields(template: Template): FieldInfo[] {
  const shape = template.fields.shape;
  return Object.keys(shape).map(key => ({
    name: key,
    label: key
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, s => s.toUpperCase())
      .trim(),
    required: !shape[key].isOptional?.(),
  }));
}

/**
 * Build a summary of available templates for the AI to present to the user.
 */
export function buildTemplateListForAI(): string {
  return templateCategories.map(cat =>
    `**${cat.title}**\n${cat.templates.map(t => `- ${t.id}: ${t.title} — ${t.description}`).join('\n')}`
  ).join('\n\n');
}

/**
 * Build a prompt for the AI to collect missing fields conversationally.
 */
export function buildFieldCollectionPrompt(template: Template, collectedFields: Record<string, string>): string {
  const fields = getTemplateFields(template);
  const missing = fields.filter(f => f.required && !collectedFields[f.name]);
  const filled = fields.filter(f => collectedFields[f.name]);

  let prompt = `The user wants to generate: **${template.title}**\n`;
  prompt += `Template ID: ${template.id}\n\n`;

  if (filled.length > 0) {
    prompt += `Already collected:\n`;
    prompt += filled.map(f => `- ${f.label}: ${collectedFields[f.name]}`).join('\n');
    prompt += '\n\n';
  }

  if (missing.length > 0) {
    prompt += `Still needed:\n`;
    prompt += missing.map(f => `- ${f.label}`).join('\n');
    prompt += '\n\nAsk the user for the NEXT missing field in a friendly, conversational way. Ask for ONE field at a time. ';
    prompt += 'When you ask, be specific about what format is expected (dates, amounts in CHF, etc.).';
  } else {
    prompt += `All required fields are collected. Tell the user you have everything and are generating the document now.`;
  }

  return prompt;
}

/**
 * Try to extract field values from a user's conversational response.
 * Returns fields that could be inferred from the message.
 */
export function extractFieldsFromMessage(
  message: string,
  template: Template,
  currentFields: Record<string, string>,
  lastAskedField?: string
): Record<string, string> {
  const extracted: Record<string, string> = {};

  // If we know which field was last asked, the whole message is likely the answer
  if (lastAskedField && !currentFields[lastAskedField]) {
    extracted[lastAskedField] = message.trim();
  }

  return extracted;
}

// ─── Auto-fill company fields ────────────────────────────────────────────────

export function autoFillCompanyFields(
  companyProfile: {
    companyName?: string;
    companyAddress?: string;
    companyPostalCode?: string;
    companyCity?: string;
    companyIDE?: string;
    canton?: string;
  }
): Record<string, string> {
  const fields: Record<string, string> = {};
  if (companyProfile.companyName) fields.companyName = companyProfile.companyName;
  if (companyProfile.companyAddress) fields.companyAddress = companyProfile.companyAddress;
  if (companyProfile.companyPostalCode) fields.companyPostalCode = companyProfile.companyPostalCode;
  if (companyProfile.companyCity) fields.companyCity = companyProfile.companyCity;
  if (companyProfile.companyIDE) fields.companyIDE = companyProfile.companyIDE;
  if (companyProfile.canton) fields.canton = companyProfile.canton;

  // Auto-fill current date
  const now = new Date();
  fields.currentDate = now.toLocaleDateString('fr-CH', { day: 'numeric', month: 'long', year: 'numeric' });
  if (companyProfile.companyCity) fields.currentLocation = companyProfile.companyCity;

  return fields;
}
