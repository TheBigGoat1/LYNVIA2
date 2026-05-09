'use server';

/**
 * @fileOverview AI Document Generator Flow for Companies using Vercel AI SDK + Groq
 *
 * This flow generates formal Swiss business documents based on pre-defined templates.
 * It takes a template with placeholders and fills them with user-provided data.
 *
 * The generated documents follow Swiss French formal business conventions:
 * - Professional business letterhead
 * - Formal "vous" form
 * - Proper closing formulas
 * - Official Swiss date format (DD.MM.YYYY or "1er janvier 2025")
 * - Swiss business references (IDE, RC, etc.)
 */

import { generateObject } from 'ai';
import { z } from 'zod';
import { groq, DEFAULT_MODEL } from '@/ai/groq';

// ============================================================================
// INPUT/OUTPUT SCHEMAS
// ============================================================================

const aiDocumentGeneratorInputSchema = z.object({
  templateType: z.string().describe('The title/type of the document template'),
  templateText: z.string().describe('The full template text with [placeholder] markers'),
  formData: z.record(z.any()).describe('User-provided field values to fill the template'),
  canton: z.string().optional().describe('Company canton for legal context (e.g., "GE", "VD", "ZH")'),
  legalContext: z.string().optional().describe('Additional legal instructions'),
});
export type AiDocumentGeneratorInput = z.infer<typeof aiDocumentGeneratorInputSchema>;

const aiDocumentGeneratorOutputSchema = z.object({
  documentContent: z.string().describe('The completed, ready-to-send document'),
  summary: z.string().describe('Brief summary of what the document accomplishes'),
  warnings: z.array(z.string()).describe('Any warnings about missing data or legal notes'),
});
export type AiDocumentGeneratorOutput = z.infer<typeof aiDocumentGeneratorOutputSchema>;

// ============================================================================
// MAIN FUNCTION
// ============================================================================

export async function aiDocumentGenerator(input: AiDocumentGeneratorInput): Promise<AiDocumentGeneratorOutput> {
  // Validate input
  if (!input.templateText || input.templateText.trim().length === 0) {
    throw new Error('Template text is required');
  }

  // Pre-process formData to handle undefined/null values
  const cleanedFormData: Record<string, string> = {};
  for (const [key, value] of Object.entries(input.formData)) {
    if (value === null || value === undefined || value === '') continue;
    if (typeof value === 'object') {
      cleanedFormData[key] = JSON.stringify(value);
    } else {
      cleanedFormData[key] = String(value);
    }
  }

  // Detect missing required placeholders
  const placeholderRegex = /\[(.*?)\]/g;
  const templatePlaceholders: string[] = [];
  let match;
  while ((match = placeholderRegex.exec(input.templateText)) !== null) {
    templatePlaceholders.push(match[1]);
  }

  // Build formData text
  const formDataText = Object.entries(cleanedFormData)
    .map(([key, value]) => `- ${key}: ${value}`)
    .join('\n');

  const cantonText = input.canton ? `\nCANTON: ${input.canton}` : '';
  const legalContextText = input.legalContext ? `\nINSTRUCTIONS SUPPLÉMENTAIRES: ${input.legalContext}` : '';

  const result = await generateObject({
    model: groq(DEFAULT_MODEL),
    schema: aiDocumentGeneratorOutputSchema,
    system: `Tu es un assistant juridique suisse expert en rédaction de documents commerciaux et juridiques pour entreprises.

INSTRUCTIONS GÉNÉRALES:
1. Génère le document UNIQUEMENT en français suisse formel
2. Remplace TOUS les placeholders [xxx] par les valeurs fournies dans formData
3. Si une valeur manque dans formData, utilise une formulation appropriée ou [À COMPLÉTER]
4. Le document doit être complet, professionnel et prêt à être utilisé
5. Respecte scrupuleusement la structure du templateText fourni

FORMAT DE DOCUMENT COMMERCIAL SUISSE:
- En-tête: Raison sociale, adresse, numéro IDE/RC
- Destinataire: Nom et adresse de l'entreprise ou du partenaire
- Lieu et date: En haut à droite (ex: "Genève, le 15 janvier 2025")
- Objet/Titre: Clairement identifié
- Corps: Paragraphes avec vouvoiement formel ou articles numérotés pour les contrats
- Formule de politesse: Selon le type de document
- Signatures: Représentants légaux de l'entreprise

TYPES DE DOCUMENTS:
- Contrats: Articles numérotés, clauses précises, signatures des parties
- Correspondance commerciale: Format lettre formelle
- Documents RH: Format structuré, références légales CO/CCT
- Documents fiscaux: Références précises, pièces jointes mentionnées
- Actes Sàrl/SA: Format officiel, mentions légales requises

RÈGLES DE STYLE:
- Utilise le vouvoiement (vous/votre/vos)
- Évite les contractions familières
- Utilise des transitions formelles (Par la présente, En effet, Par conséquent, etc.)
- Cite les références légales de manière précise (CO, LTr, CCT, etc.)
- Les montants doivent être formatés en CHF (ex: CHF 1'500.- ou CHF 85'000.-)
- Les dates en format suisse (ex: 15 janvier 2025 ou 15.01.2025)
- Les pourcentages avec notation suisse (ex: 5,25%)

MAPPING DES CHAMPS formData:
- companyName: Raison sociale de l'entreprise
- companyAddress: Adresse de l'entreprise
- companyCity / companyPostalCode: Ville et code postal
- companyIDE: Numéro d'identification des entreprises (ex: CHE-123.456.789)
- companyRC: Numéro du Registre du Commerce
- companySeat: Siège social
- currentDate: Date du jour formatée
- currentLocation: Lieu pour l'en-tête

Génère UNIQUEMENT le contenu du document, sans commentaires additionnels.`,
    prompt: `TYPE DE DOCUMENT: ${input.templateType}

MODÈLE DE DOCUMENT À COMPLÉTER:
"""
${input.templateText}
"""

DONNÉES FOURNIES:
${formDataText}${cantonText}${legalContextText}

---

Génère maintenant le document complet en remplaçant tous les placeholders par les données fournies.`,
  });

  const output = result.object;

  // Post-process: Clean up any remaining placeholders that weren't filled
  let finalContent = output.documentContent;

  // Check for unfilled placeholders
  const unfilledPlaceholders = finalContent.match(/\[.*?\]/g) || [];
  const warnings: string[] = output.warnings || [];

  if (unfilledPlaceholders.length > 0) {
    const uniqueUnfilled = [...new Set(unfilledPlaceholders)];
    warnings.push(
      `Certains champs n'ont pas été remplis: ${uniqueUnfilled.join(', ')}`
    );
  }

  return {
    documentContent: finalContent,
    summary: output.summary,
    warnings: warnings.length > 0 ? warnings : undefined,
  };
}
