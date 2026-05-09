
/**
 * LYNVIA DIGITAL - Company Document Templates Registry
 * 
 * Complete registry of Swiss business document templates for companies.
 * Each template contains:
 * - Zod schema for form validation
 * - Full template text with [placeholder] markers
 * - AI will fill placeholders with user-provided data
 * 
 * Categories:
 * 1. Contrats de travail (Employment contracts & HR)
 * 2. Gestion RH (HR Management - warnings, certificates)
 * 3. Correspondance commerciale (Business correspondence)
 * 4. Fiscalité (Tax-related documents)
 * 5. Contrats commerciaux (Commercial contracts)
 * 6. Recouvrement (Debt collection)
 * 7. Sàrl - Cession de parts (LLC share transfers)
 */

import { z } from 'zod';
import * as Icons from 'lucide-react';

// ============================================================================
// TYPES
// ============================================================================
export type Template = {
  id: string;
  title: string;
  description: string;
  fields: z.ZodObject<any>;
  templateText: string;
};

export type TemplateCategory = {
  id: string;
  title: string;
  description: string;
  icon: keyof typeof Icons;
  templates: Template[];
};

// ============================================================================
// ICON MAP
// ============================================================================
export const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Briefcase: Icons.Briefcase,
  Users: Icons.Users,
  Mail: Icons.Mail,
  Receipt: Icons.Receipt,
  FileText: Icons.FileText,
  Gavel: Icons.Gavel,
  Building: Icons.Building,
  Landmark: Icons.Landmark,
  Scale: Icons.Scale,
  FileSignature: Icons.FileSignature,
  HandCoins: Icons.HandCoins,
  Shield: Icons.Shield,
};

// ============================================================================
// LETTER COMPONENTS
// ============================================================================
const companyHeader = `[companyName]
[companyAddress]
[companyPostalCode] [companyCity]

`;

const recipientBlock = `[recipientName]
[recipientAddress]
[recipientPostalCode] [recipientCity]

`;

const dateLocation = `[companyCity], le [currentDate]

`;

const letterClosing = `

Nous vous prions d'agréer, Madame, Monsieur, l'expression de nos salutations distinguées.

[companyName]

________________________
Signature(s) autorisée(s)`;

// ============================================================================
// CATEGORY 1: CONTRATS DE TRAVAIL (Employment Contracts)
// ============================================================================
const emploiTemplates: Template[] = [
  {
    id: 'ENT-1.1',
    title: 'Contrat de travail',
    description: "Contrat de travail standard conforme au droit suisse (CO art. 319 ss).",
    fields: z.object({
      companyName: z.string().min(1, "Raison sociale requise."),
      companyAddress: z.string().min(1, "Adresse de l'entreprise requise."),
      companyPostalCode: z.string().min(4, "Code postal requis."),
      companyCity: z.string().min(1, "Ville requise."),
      employeeName: z.string().min(1, "Nom de l'employé requis."),
      employeeAddress: z.string().min(1, "Adresse de l'employé requise."),
      employeeDateOfBirth: z.string().min(1, "Date de naissance requise."),
      employeeNationality: z.string().min(1, "Nationalité requise."),
      employeeAVS: z.string().min(1, "Numéro AVS requis."),
      jobTitle: z.string().min(1, "Titre du poste requis."),
      workDescription: z.string().min(10, "Description du travail requise."),
      startDate: z.string().min(1, "Date d'entrée en fonction requise."),
      contractType: z.string().min(1, "Type de contrat requis (CDI/CDD)."),
      endDate: z.string().optional(),
      workPlace: z.string().min(1, "Lieu de travail requis."),
      workHoursPerWeek: z.string().min(1, "Heures de travail par semaine requises."),
      grossMonthlySalary: z.string().min(1, "Salaire mensuel brut requis."),
      salaryPayments: z.string().min(1, "Nombre de versements annuels requis (12 ou 13)."),
      probationPeriod: z.string().min(1, "Durée de la période d'essai requise."),
      vacationDays: z.string().min(1, "Nombre de jours de vacances requis."),
      noticePeriod: z.string().min(1, "Délai de congé requis."),
    }),
    templateText: `CONTRAT DE TRAVAIL

Entre

[companyName]
[companyAddress], [companyPostalCode] [companyCity]
(ci-après "l'Employeur")

et

[employeeName]
[employeeAddress]
Date de naissance: [employeeDateOfBirth]
Nationalité: [employeeNationality]
N° AVS: [employeeAVS]
(ci-après "l'Employé")

il est convenu ce qui suit:

Article 1 - Engagement
L'Employeur engage l'Employé en qualité de [jobTitle].

Article 2 - Description du poste
Les principales tâches et responsabilités sont:
[workDescription]

Article 3 - Début et durée du contrat
Le contrat prend effet le [startDate].
Type de contrat: [contractType]
Date de fin (si CDD): [endDate]

Article 4 - Lieu de travail
Le lieu de travail principal est: [workPlace]

Article 5 - Durée du travail
La durée hebdomadaire de travail est de [workHoursPerWeek] heures.

Article 6 - Rémunération
Le salaire mensuel brut est de CHF [grossMonthlySalary].
Le salaire est versé en [salaryPayments] mensualités par année.
Les déductions légales (AVS, AI, APG, AC, LPP, LAA) sont effectuées conformément à la loi.

Article 7 - Période d'essai
La période d'essai est de [probationPeriod].
Durant cette période, le délai de résiliation est de 7 jours.

Article 8 - Vacances
L'Employé a droit à [vacationDays] jours ouvrables de vacances par année.

Article 9 - Délai de congé
Après la période d'essai, le délai de résiliation est de [noticePeriod] pour la fin d'un mois.

Article 10 - Droit applicable
Le présent contrat est soumis au droit suisse, notamment aux articles 319 et suivants du Code des obligations.

Fait en deux exemplaires à [companyCity], le [currentDate].

L'Employeur:                              L'Employé:

________________________               ________________________
[companyName]                            [employeeName]`,
  },
  {
    id: 'ENT-1.2',
    title: 'Annexe au contrat de travail',
    description: "Avenant ou annexe pour modifier un contrat de travail existant.",
    fields: z.object({
      companyName: z.string().min(1, "Raison sociale requise."),
      companyAddress: z.string().min(1, "Adresse requise."),
      companyPostalCode: z.string().min(4, "Code postal requis."),
      companyCity: z.string().min(1, "Ville requise."),
      employeeName: z.string().min(1, "Nom de l'employé requis."),
      originalContractDate: z.string().min(1, "Date du contrat original requise."),
      effectiveDate: z.string().min(1, "Date d'entrée en vigueur de l'annexe requise."),
      modifications: z.string().min(10, "Description des modifications requise."),
    }),
    templateText: `ANNEXE AU CONTRAT DE TRAVAIL

Entre

[companyName]
[companyAddress], [companyPostalCode] [companyCity]
(ci-après "l'Employeur")

et

[employeeName]
(ci-après "l'Employé")

Référence: Contrat de travail du [originalContractDate]

Les parties conviennent de modifier le contrat de travail comme suit, avec effet au [effectiveDate]:

MODIFICATIONS:

[modifications]

Toutes les autres dispositions du contrat de travail du [originalContractDate] restent inchangées et en vigueur.

Fait en deux exemplaires à [companyCity], le [currentDate].

L'Employeur:                              L'Employé:

________________________               ________________________
[companyName]                            [employeeName]`,
  },
  {
    id: 'ENT-1.3',
    title: 'Accord de confidentialité et non-débauchage',
    description: "Clause de confidentialité et de non-sollicitation pour les employés.",
    fields: z.object({
      companyName: z.string().min(1, "Raison sociale requise."),
      companyAddress: z.string().min(1, "Adresse requise."),
      companyPostalCode: z.string().min(4, "Code postal requis."),
      companyCity: z.string().min(1, "Ville requise."),
      employeeName: z.string().min(1, "Nom de l'employé requis."),
      jobTitle: z.string().min(1, "Titre du poste requis."),
      confidentialityDuration: z.string().min(1, "Durée de confidentialité après départ requise."),
      nonSolicitationDuration: z.string().min(1, "Durée de non-débauchage après départ requise."),
      geographicScope: z.string().min(1, "Périmètre géographique requis."),
      penaltyAmount: z.string().min(1, "Montant de la pénalité requise."),
    }),
    templateText: `ACCORD DE CONFIDENTIALITÉ ET DE NON-DÉBAUCHAGE

Entre

[companyName]
[companyAddress], [companyPostalCode] [companyCity]
(ci-après "l'Employeur")

et

[employeeName], [jobTitle]
(ci-après "l'Employé")

Article 1 - Obligation de confidentialité
L'Employé s'engage à garder strictement confidentielles toutes les informations de nature commerciale, technique, financière ou stratégique dont il aura connaissance dans le cadre de son activité.

Cette obligation perdure pendant [confidentialityDuration] après la fin des rapports de travail.

Article 2 - Non-débauchage
L'Employé s'engage à ne pas solliciter, directement ou indirectement, les employés, clients ou fournisseurs de l'Employeur pendant une durée de [nonSolicitationDuration] après la fin du contrat de travail.

Cette interdiction s'applique dans le périmètre géographique suivant: [geographicScope].

Article 3 - Clause pénale
En cas de violation du présent accord, l'Employé sera redevable d'une pénalité conventionnelle de CHF [penaltyAmount], sans préjudice de dommages-intérêts supplémentaires.

Article 4 - Droit applicable
Le présent accord est soumis au droit suisse, pour les clauses autorisées par l'article 321a CO.

Fait en deux exemplaires à [companyCity], le [currentDate].

L'Employeur:                              L'Employé:

________________________               ________________________
[companyName]                            [employeeName]`,
  },
];

// ============================================================================
// CATEGORY 2: GESTION RH (HR Management)
// ============================================================================
const rhTemplates: Template[] = [
  {
    id: 'ENT-2.1',
    title: 'Lettre de licenciement',
    description: "Lettre de résiliation du contrat de travail par l'employeur.",
    fields: z.object({
      companyName: z.string().min(1, "Raison sociale requise."),
      companyAddress: z.string().min(1, "Adresse requise."),
      companyPostalCode: z.string().min(4, "Code postal requis."),
      companyCity: z.string().min(1, "Ville requise."),
      employeeName: z.string().min(1, "Nom de l'employé requis."),
      employeeAddress: z.string().min(1, "Adresse de l'employé requise."),
      jobTitle: z.string().min(1, "Titre du poste requis."),
      contractDate: z.string().min(1, "Date du contrat de travail requise."),
      terminationDate: z.string().min(1, "Date de fin du contrat requise."),
      noticePeriod: z.string().min(1, "Délai de congé requis."),
      reason: z.string().optional(),
    }),
    templateText: `${companyHeader}Recommandé

[employeeName]
[employeeAddress]

${dateLocation}
Objet: Résiliation de votre contrat de travail

Madame, Monsieur,

Par la présente, nous vous informons de notre décision de mettre fin à votre contrat de travail du [contractDate] en qualité de [jobTitle].

Conformément aux dispositions contractuelles et légales, nous respectons le délai de congé de [noticePeriod]. Votre contrat prendra donc fin le [terminationDate].

Motif: [reason]

D'ici là, nous vous prions de remettre l'ensemble du matériel de l'entreprise et de procéder à la passation de vos dossiers.

Votre certificat de travail et votre décompte final vous seront remis à la fin des rapports de travail.
${letterClosing}`,
  },
  {
    id: 'ENT-2.2',
    title: 'Certificat de travail',
    description: "Certificat de travail complet conforme à l'art. 330a CO.",
    fields: z.object({
      companyName: z.string().min(1, "Raison sociale requise."),
      companyAddress: z.string().min(1, "Adresse requise."),
      companyPostalCode: z.string().min(4, "Code postal requis."),
      companyCity: z.string().min(1, "Ville requise."),
      employeeName: z.string().min(1, "Nom de l'employé requis."),
      employeeDateOfBirth: z.string().min(1, "Date de naissance requise."),
      jobTitle: z.string().min(1, "Titre du poste requis."),
      startDate: z.string().min(1, "Date d'entrée requise."),
      endDate: z.string().min(1, "Date de départ requise."),
      workDescription: z.string().min(10, "Description des tâches requise."),
      performanceEvaluation: z.string().min(10, "Évaluation des performances requise."),
      behaviorEvaluation: z.string().min(10, "Évaluation du comportement requise."),
      departureReason: z.string().min(1, "Motif du départ requis."),
    }),
    templateText: `CERTIFICAT DE TRAVAIL

Nous, soussignés,

[companyName]
[companyAddress], [companyPostalCode] [companyCity]

attestons que

Madame/Monsieur [employeeName]
né(e) le [employeeDateOfBirth]

a été employé(e) dans notre entreprise du [startDate] au [endDate] en qualité de [jobTitle].

DESCRIPTION DES ACTIVITÉS:

[workDescription]

ÉVALUATION DES PERFORMANCES:

[performanceEvaluation]

COMPORTEMENT:

[behaviorEvaluation]

MOTIF DU DÉPART:

[departureReason]

Nous remercions Madame/Monsieur [employeeName] pour sa collaboration et lui souhaitons plein succès pour la suite de sa carrière.

[companyCity], le [currentDate]

[companyName]

________________________
Signature(s) autorisée(s)`,
  },
  {
    id: 'ENT-2.3',
    title: 'Avertissement employé',
    description: "Avertissement formel pour manquement professionnel.",
    fields: z.object({
      companyName: z.string().min(1, "Raison sociale requise."),
      companyAddress: z.string().min(1, "Adresse requise."),
      companyPostalCode: z.string().min(4, "Code postal requis."),
      companyCity: z.string().min(1, "Ville requise."),
      employeeName: z.string().min(1, "Nom de l'employé requis."),
      employeeAddress: z.string().min(1, "Adresse de l'employé requise."),
      jobTitle: z.string().min(1, "Titre du poste requis."),
      incidentDate: z.string().min(1, "Date de l'incident requise."),
      incidentDescription: z.string().min(10, "Description de l'incident requise."),
      expectedBehavior: z.string().min(10, "Comportement attendu requis."),
      consequences: z.string().min(10, "Conséquences en cas de récidive requises."),
    }),
    templateText: `${companyHeader}Recommandé

[employeeName]
[employeeAddress]

${dateLocation}
Objet: AVERTISSEMENT

Madame, Monsieur,

Par la présente, nous vous adressons un avertissement formel concernant votre comportement professionnel.

FAITS REPROCHÉS:
En date du [incidentDate], nous avons constaté les faits suivants:
[incidentDescription]

Ce comportement est contraire à vos obligations contractuelles et/ou au règlement de l'entreprise.

COMPORTEMENT ATTENDU:
Nous attendons de vous désormais:
[expectedBehavior]

CONSÉQUENCES:
En cas de récidive ou de nouveau manquement, nous serons contraints de prendre les mesures suivantes:
[consequences]

Nous vous demandons de prendre acte du présent avertissement et de nous confirmer votre engagement à respecter vos obligations professionnelles.
${letterClosing}

Copie: Dossier personnel`,
  },
];

// ============================================================================
// CATEGORY 3: CORRESPONDANCE COMMERCIALE
// ============================================================================
const correspondanceTemplates: Template[] = [
  {
    id: 'ENT-3.1',
    title: 'Procuration générale',
    description: "Procuration générale pour représenter l'entreprise.",
    fields: z.object({
      companyName: z.string().min(1, "Raison sociale requise."),
      companyAddress: z.string().min(1, "Adresse requise."),
      companyPostalCode: z.string().min(4, "Code postal requis."),
      companyCity: z.string().min(1, "Ville requise."),
      companyRegistration: z.string().min(1, "Numéro IDE/RC requis."),
      representativeName: z.string().min(1, "Nom du représentant légal requis."),
      representativeFunction: z.string().min(1, "Fonction du représentant requis."),
      mandataryName: z.string().min(1, "Nom du mandataire requis."),
      mandataryAddress: z.string().min(1, "Adresse du mandataire requise."),
      mandataryDateOfBirth: z.string().min(1, "Date de naissance du mandataire requise."),
      powersDescription: z.string().min(10, "Description des pouvoirs requise."),
      validityStart: z.string().min(1, "Date de début de validité requise."),
      validityEnd: z.string().optional(),
    }),
    templateText: `PROCURATION

La société

[companyName]
[companyAddress], [companyPostalCode] [companyCity]
IDE/RC: [companyRegistration]

représentée par [representativeName], [representativeFunction]

confère par la présente tous pouvoirs à:

[mandataryName]
[mandataryAddress]
Né(e) le: [mandataryDateOfBirth]

(ci-après "le Mandataire")

ÉTENDUE DES POUVOIRS:

Le Mandataire est autorisé à:
[powersDescription]

DURÉE:

La présente procuration prend effet le [validityStart] et reste valable jusqu'à sa révocation. Si une date de fin est spécifiée, elle prendra fin le [validityEnd].

Cette procuration peut être révoquée à tout moment par écrit.

Fait à [companyCity], le [currentDate]

[companyName]

________________________
[representativeName]
[representativeFunction]`,
  },
  {
    id: 'ENT-3.2',
    title: 'Lettre d\'information générale',
    description: "Courrier d'information général aux clients, partenaires ou autorités.",
    fields: z.object({
      companyName: z.string().min(1, "Raison sociale requise."),
      companyAddress: z.string().min(1, "Adresse requise."),
      companyPostalCode: z.string().min(4, "Code postal requis."),
      companyCity: z.string().min(1, "Ville requise."),
      recipientName: z.string().min(1, "Nom du destinataire requis."),
      recipientAddress: z.string().min(1, "Adresse du destinataire requise."),
      recipientPostalCode: z.string().min(4, "Code postal requis."),
      recipientCity: z.string().min(1, "Ville requise."),
      subject: z.string().min(1, "Objet du courrier requis."),
      content: z.string().min(10, "Contenu du courrier requis."),
    }),
    templateText: `${companyHeader}${recipientBlock}${dateLocation}
Objet: [subject]

Madame, Monsieur,

[content]
${letterClosing}`,
  },
  {
    id: 'ENT-3.3',
    title: 'Trust Mandate Agreement',
    description: "Contrat de mandat fiduciaire (bilingue FR/EN).",
    fields: z.object({
      companyName: z.string().min(1, "Company name required."),
      companyAddress: z.string().min(1, "Company address required."),
      companyPostalCode: z.string().min(4, "Postal code required."),
      companyCity: z.string().min(1, "City required."),
      companyRegistration: z.string().min(1, "IDE/RC number required."),
      clientName: z.string().min(1, "Client name required."),
      clientAddress: z.string().min(1, "Client address required."),
      mandateScope: z.string().min(10, "Scope of mandate required."),
      feesAmount: z.string().min(1, "Fees amount required."),
      startDate: z.string().min(1, "Start date required."),
    }),
    templateText: `TRUST MANDATE AGREEMENT / CONTRAT DE MANDAT FIDUCIAIRE

Between / Entre:

[companyName]
[companyAddress], [companyPostalCode] [companyCity]
IDE/RC: [companyRegistration]
(hereinafter "the Trustee" / ci-après "le Fiduciaire")

And / Et:

[clientName]
[clientAddress]
(hereinafter "the Principal" / ci-après "le Mandant")

1. SCOPE OF MANDATE / ÉTENDUE DU MANDAT:

The Trustee agrees to provide the following services:
Le Fiduciaire s'engage à fournir les services suivants:

[mandateScope]

2. FEES / HONORAIRES:

The fees for the services are: CHF [feesAmount]
Les honoraires pour les services s'élèvent à: CHF [feesAmount]

3. COMMENCEMENT / ENTRÉE EN VIGUEUR:

This agreement takes effect on [startDate].
Le présent contrat entre en vigueur le [startDate].

4. CONFIDENTIALITY / CONFIDENTIALITÉ:

The Trustee undertakes to treat all information as strictly confidential.
Le Fiduciaire s'engage à traiter toute information de manière strictement confidentielle.

5. GOVERNING LAW / DROIT APPLICABLE:

This agreement is governed by Swiss law.
Le présent contrat est soumis au droit suisse.

Done in two copies at [companyCity], on [currentDate].
Fait en deux exemplaires à [companyCity], le [currentDate].

The Trustee / Le Fiduciaire:           The Principal / Le Mandant:

________________________               ________________________`,
  },
];

// ============================================================================
// CATEGORY 4: FISCALITÉ (Tax Documents)
// ============================================================================
const fiscaliteTemplates: Template[] = [
  {
    id: 'ENT-4.1',
    title: 'Courrier aux autorités fiscales',
    description: "Correspondance générale avec l'administration fiscale.",
    fields: z.object({
      companyName: z.string().min(1, "Raison sociale requise."),
      companyAddress: z.string().min(1, "Adresse requise."),
      companyPostalCode: z.string().min(4, "Code postal requis."),
      companyCity: z.string().min(1, "Ville requise."),
      companyIDE: z.string().min(1, "Numéro IDE requis."),
      taxAuthorityName: z.string().min(1, "Nom de l'administration fiscale requis."),
      taxAuthorityAddress: z.string().min(1, "Adresse de l'administration fiscale requise."),
      taxAuthorityPostalCode: z.string().min(4, "Code postal requis."),
      taxAuthorityCity: z.string().min(1, "Ville requise."),
      referenceNumber: z.string().optional(),
      subject: z.string().min(1, "Objet requis."),
      content: z.string().min(10, "Contenu du courrier requis."),
    }),
    templateText: `${companyHeader}IDE: [companyIDE]

[taxAuthorityName]
[taxAuthorityAddress]
[taxAuthorityPostalCode] [taxAuthorityCity]

${dateLocation}
Votre référence: [referenceNumber]
Objet: [subject]

Madame, Monsieur,

[content]

Nous restons à votre disposition pour tout renseignement complémentaire.
${letterClosing}

Annexes: [mentionner les pièces jointes]`,
  },
  {
    id: 'ENT-4.2',
    title: 'Réclamation taxation',
    description: "Réclamation contre une décision de taxation.",
    fields: z.object({
      companyName: z.string().min(1, "Raison sociale requise."),
      companyAddress: z.string().min(1, "Adresse requise."),
      companyPostalCode: z.string().min(4, "Code postal requis."),
      companyCity: z.string().min(1, "Ville requise."),
      companyIDE: z.string().min(1, "Numéro IDE requis."),
      taxAuthorityName: z.string().min(1, "Nom de l'administration fiscale requis."),
      taxAuthorityAddress: z.string().min(1, "Adresse requise."),
      taxAuthorityPostalCode: z.string().min(4, "Code postal requis."),
      taxAuthorityCity: z.string().min(1, "Ville requise."),
      decisionDate: z.string().min(1, "Date de la décision requise."),
      taxYear: z.string().min(1, "Année fiscale concernée requise."),
      decisionReference: z.string().min(1, "Référence de la décision requise."),
      contestedAmount: z.string().min(1, "Montant contesté requis."),
      contestationReasons: z.string().min(10, "Motifs de contestation requis."),
      requestedCorrection: z.string().min(10, "Correction demandée requise."),
    }),
    templateText: `${companyHeader}IDE: [companyIDE]

Recommandé

[taxAuthorityName]
[taxAuthorityAddress]
[taxAuthorityPostalCode] [taxAuthorityCity]

${dateLocation}
Objet: RÉCLAMATION contre la décision de taxation du [decisionDate]
Référence: [decisionReference]
Année fiscale: [taxYear]

Madame, Monsieur,

Par la présente, nous formons réclamation contre votre décision de taxation du [decisionDate], référence [decisionReference], concernant l'année fiscale [taxYear].

MONTANT CONTESTÉ: CHF [contestedAmount]

MOTIFS DE LA RÉCLAMATION:

[contestationReasons]

CORRECTION DEMANDÉE:

[requestedCorrection]

Nous vous prions de bien vouloir réexaminer notre dossier et de rectifier la taxation en conséquence.

Nous restons à votre disposition pour fournir tout document complémentaire.
${letterClosing}

Annexes: 
- Copie de la décision contestée
- Pièces justificatives`,
  },
];

// ============================================================================
// CATEGORY 5: CONTRATS COMMERCIAUX
// ============================================================================
const contratsTemplates: Template[] = [
  {
    id: 'ENT-5.1',
    title: 'Contrat de vente de biens mobiliers',
    description: "Contrat de vente de biens meubles entre entreprises.",
    fields: z.object({
      sellerCompanyName: z.string().min(1, "Raison sociale du vendeur requise."),
      sellerAddress: z.string().min(1, "Adresse du vendeur requise."),
      sellerPostalCode: z.string().min(4, "Code postal du vendeur requis."),
      sellerCity: z.string().min(1, "Ville du vendeur requise."),
      sellerIDE: z.string().min(1, "Numéro IDE du vendeur requis."),
      buyerCompanyName: z.string().min(1, "Raison sociale de l'acheteur requise."),
      buyerAddress: z.string().min(1, "Adresse de l'acheteur requise."),
      buyerPostalCode: z.string().min(4, "Code postal de l'acheteur requis."),
      buyerCity: z.string().min(1, "Ville de l'acheteur requise."),
      buyerIDE: z.string().min(1, "Numéro IDE de l'acheteur requis."),
      goodsDescription: z.string().min(10, "Description des biens requise."),
      salePrice: z.string().min(1, "Prix de vente requis."),
      paymentTerms: z.string().min(1, "Modalités de paiement requises."),
      deliveryDate: z.string().min(1, "Date de livraison requise."),
      deliveryPlace: z.string().min(1, "Lieu de livraison requis."),
      warrantyPeriod: z.string().min(1, "Durée de garantie requise."),
    }),
    templateText: `CONTRAT DE VENTE DE BIENS MOBILIERS

Entre

[sellerCompanyName]
[sellerAddress], [sellerPostalCode] [sellerCity]
IDE: [sellerIDE]
(ci-après "le Vendeur")

et

[buyerCompanyName]
[buyerAddress], [buyerPostalCode] [buyerCity]
IDE: [buyerIDE]
(ci-après "l'Acheteur")

Article 1 - Objet
Le Vendeur vend à l'Acheteur, qui accepte, les biens suivants:
[goodsDescription]

Article 2 - Prix
Le prix de vente est fixé à CHF [salePrice] (hors TVA / TVA incluse).

Article 3 - Modalités de paiement
[paymentTerms]

Article 4 - Livraison
Les biens seront livrés le [deliveryDate] à l'adresse suivante: [deliveryPlace].
Le transfert des risques s'opère à la livraison.

Article 5 - Garantie
Le Vendeur garantit les biens pendant une durée de [warrantyPeriod] à compter de la livraison.

Article 6 - Réserve de propriété
Le Vendeur se réserve la propriété des biens jusqu'au paiement intégral du prix.

Article 7 - Droit applicable et for
Le présent contrat est soumis au droit suisse. Le for est au siège du Vendeur.

Fait en deux exemplaires, le [currentDate].

Le Vendeur:                              L'Acheteur:

________________________               ________________________
[sellerCompanyName]                     [buyerCompanyName]`,
  },
  {
    id: 'ENT-5.2',
    title: 'Contrat d\'entreprise',
    description: "Contrat d'entreprise pour travaux ou prestations (art. 363 ss CO).",
    fields: z.object({
      contractorName: z.string().min(1, "Raison sociale de l'entrepreneur requise."),
      contractorAddress: z.string().min(1, "Adresse de l'entrepreneur requise."),
      contractorPostalCode: z.string().min(4, "Code postal requis."),
      contractorCity: z.string().min(1, "Ville requise."),
      contractorIDE: z.string().min(1, "Numéro IDE requis."),
      clientName: z.string().min(1, "Nom du maître de l'ouvrage requis."),
      clientAddress: z.string().min(1, "Adresse du maître de l'ouvrage requise."),
      clientPostalCode: z.string().min(4, "Code postal requis."),
      clientCity: z.string().min(1, "Ville requise."),
      workDescription: z.string().min(10, "Description des travaux requise."),
      workLocation: z.string().min(1, "Lieu d'exécution requis."),
      totalPrice: z.string().min(1, "Prix total requis."),
      paymentSchedule: z.string().min(10, "Échéancier de paiement requis."),
      startDate: z.string().min(1, "Date de début des travaux requise."),
      completionDate: z.string().min(1, "Date d'achèvement requise."),
      warrantyPeriod: z.string().min(1, "Durée de garantie requise."),
    }),
    templateText: `CONTRAT D'ENTREPRISE

Entre

[contractorName]
[contractorAddress], [contractorPostalCode] [contractorCity]
IDE: [contractorIDE]
(ci-après "l'Entrepreneur")

et

[clientName]
[clientAddress], [clientPostalCode] [clientCity]
(ci-après "le Maître de l'ouvrage")

Article 1 - Objet du contrat
L'Entrepreneur s'engage à exécuter les travaux suivants:
[workDescription]

Article 2 - Lieu d'exécution
Les travaux seront réalisés à l'adresse: [workLocation]

Article 3 - Prix
Le prix forfaitaire convenu est de CHF [totalPrice] (hors TVA).

Article 4 - Conditions de paiement
[paymentSchedule]

Article 5 - Délais d'exécution
Début des travaux: [startDate]
Achèvement prévu: [completionDate]

Article 6 - Garantie
L'Entrepreneur garantit l'ouvrage pendant [warrantyPeriod] conformément aux dispositions légales (art. 371 CO).

Article 7 - Réception des travaux
La réception sera constatée par un procès-verbal signé des deux parties.

Article 8 - Droit applicable
Le présent contrat est régi par les articles 363 et suivants du Code des obligations suisse.

Fait en deux exemplaires, le [currentDate].

L'Entrepreneur:                         Le Maître de l'ouvrage:

________________________               ________________________
[contractorName]                        [clientName]`,
  },
  {
    id: 'ENT-5.3',
    title: 'Contrat de prêt',
    description: "Contrat de prêt entre sociétés ou avec actionnaire.",
    fields: z.object({
      lenderName: z.string().min(1, "Nom du prêteur requis."),
      lenderAddress: z.string().min(1, "Adresse du prêteur requise."),
      lenderPostalCode: z.string().min(4, "Code postal requis."),
      lenderCity: z.string().min(1, "Ville requise."),
      borrowerName: z.string().min(1, "Nom de l'emprunteur requis."),
      borrowerAddress: z.string().min(1, "Adresse de l'emprunteur requise."),
      borrowerPostalCode: z.string().min(4, "Code postal requis."),
      borrowerCity: z.string().min(1, "Ville requise."),
      loanAmount: z.string().min(1, "Montant du prêt requis."),
      interestRate: z.string().min(1, "Taux d'intérêt requis."),
      repaymentTerms: z.string().min(10, "Modalités de remboursement requises."),
      loanPurpose: z.string().min(1, "But du prêt requis."),
      startDate: z.string().min(1, "Date de mise à disposition requise."),
      endDate: z.string().min(1, "Date d'échéance requise."),
    }),
    templateText: `CONTRAT DE PRÊT

Entre

[lenderName]
[lenderAddress], [lenderPostalCode] [lenderCity]
(ci-après "le Prêteur")

et

[borrowerName]
[borrowerAddress], [borrowerPostalCode] [borrowerCity]
(ci-après "l'Emprunteur")

Article 1 - Objet du prêt
Le Prêteur met à disposition de l'Emprunteur la somme de CHF [loanAmount] (en chiffres et en lettres).

Article 2 - But du prêt
Le prêt est accordé pour le but suivant: [loanPurpose]

Article 3 - Mise à disposition
Le montant sera mis à disposition le [startDate].

Article 4 - Intérêts
Le prêt porte intérêts au taux annuel de [interestRate]%.
Les intérêts sont payables [annuellement/semestriellement/mensuellement].

Article 5 - Remboursement
[repaymentTerms]
L'échéance finale est fixée au [endDate].

Article 6 - Remboursement anticipé
L'Emprunteur peut rembourser tout ou partie du prêt par anticipation, moyennant un préavis de 30 jours.

Article 7 - Exigibilité anticipée
Le prêt devient immédiatement exigible en cas de:
- Défaut de paiement d'une échéance
- Faillite ou concordat de l'Emprunteur
- Fausses déclarations

Article 8 - Droit applicable
Le présent contrat est soumis au droit suisse.

Fait en deux exemplaires, le [currentDate].

Le Prêteur:                              L'Emprunteur:

________________________               ________________________
[lenderName]                            [borrowerName]`,
  },
  {
    id: 'ENT-5.4',
    title: 'Prêt actionnaire',
    description: "Contrat de prêt entre actionnaire et société.",
    fields: z.object({
      companyName: z.string().min(1, "Raison sociale requise."),
      companyAddress: z.string().min(1, "Adresse requise."),
      companyPostalCode: z.string().min(4, "Code postal requis."),
      companyCity: z.string().min(1, "Ville requise."),
      companyIDE: z.string().min(1, "Numéro IDE requis."),
      shareholderName: z.string().min(1, "Nom de l'actionnaire requis."),
      shareholderAddress: z.string().min(1, "Adresse de l'actionnaire requise."),
      shareholderPostalCode: z.string().min(4, "Code postal requis."),
      shareholderCity: z.string().min(1, "Ville requise."),
      shareholderOwnership: z.string().min(1, "Part de l'actionnaire requise (%)."),
      loanAmount: z.string().min(1, "Montant du prêt requis."),
      interestRate: z.string().min(1, "Taux d'intérêt requis."),
      subordination: z.string().min(1, "Clause de subordination requise (oui/non)."),
      repaymentTerms: z.string().min(10, "Modalités de remboursement requises."),
    }),
    templateText: `CONTRAT DE PRÊT ACTIONNAIRE

Entre

[shareholderName]
[shareholderAddress], [shareholderPostalCode] [shareholderCity]
Détenteur de [shareholderOwnership]% du capital-actions
(ci-après "l'Actionnaire Prêteur")

et

[companyName]
[companyAddress], [companyPostalCode] [companyCity]
IDE: [companyIDE]
(ci-après "la Société")

Article 1 - Prêt
L'Actionnaire accorde à la Société un prêt de CHF [loanAmount].

Article 2 - Intérêts
Le prêt porte intérêts au taux annuel de [interestRate]%.
Ce taux est conforme aux directives de l'AFC sur les taux d'intérêts licites.

Article 3 - Subordination
(Instruction: Si [subordination] est 'oui', insérer la clause suivante, sinon insérer 'Ce prêt n'est pas subordonné.')
L'Actionnaire accepte de subordonner sa créance à toutes les autres créances de la Société. En cas de faillite ou de surendettement, l'Actionnaire ne pourra faire valoir sa créance qu'après désintéressement complet de tous les autres créanciers.

Article 4 - Remboursement
[repaymentTerms]

Article 5 - Imputation
Les intérêts versés sont soumis à l'impôt anticipé de 35% que la Société retiendra et versera à l'AFC.

Article 6 - Droit applicable
Le présent contrat est soumis au droit suisse.

Fait en deux exemplaires, le [currentDate].

L'Actionnaire Prêteur:                   La Société:

________________________               ________________________
[shareholderName]                       [companyName]`,
  },
  {
    id: 'ENT-5.5',
    title: 'Cession de créance',
    description: "Contrat de cession de créance (art. 164 ss CO).",
    fields: z.object({
      cedantName: z.string().min(1, "Nom du cédant requis."),
      cedantAddress: z.string().min(1, "Adresse du cédant requise."),
      cedantPostalCode: z.string().min(4, "Code postal requis."),
      cedantCity: z.string().min(1, "Ville requise."),
      cessionaireName: z.string().min(1, "Nom du cessionnaire requis."),
      cessionaireAddress: z.string().min(1, "Adresse du cessionnaire requise."),
      cessionairePostalCode: z.string().min(4, "Code postal requis."),
      cessionaireCity: z.string().min(1, "Ville requise."),
      debtorName: z.string().min(1, "Nom du débiteur cédé requis."),
      debtorAddress: z.string().min(1, "Adresse du débiteur requise."),
      claimDescription: z.string().min(10, "Description de la créance requise."),
      claimAmount: z.string().min(1, "Montant de la créance requis."),
      cessionPrice: z.string().min(1, "Prix de la cession requis."),
    }),
    templateText: `CONTRAT DE CESSION DE CRÉANCE

Entre

[cedantName]
[cedantAddress], [cedantPostalCode] [cedantCity]
(ci-après "le Cédant")

et

[cessionaireName]
[cessionaireAddress], [cessionairePostalCode] [cessionaireCity]
(ci-après "le Cessionnaire")

Article 1 - Objet de la cession
Le Cédant cède au Cessionnaire, qui accepte, la créance suivante:
[claimDescription]

Article 2 - Montant de la créance
La créance cédée s'élève à CHF [claimAmount] (capital).

Article 3 - Débiteur cédé
Le débiteur de la créance cédée est:
[debtorName]
[debtorAddress]

Article 4 - Prix de la cession
La présente cession est consentie moyennant le prix de CHF [cessionPrice], payable à la signature.

Article 5 - Garantie
Le Cédant garantit l'existence de la créance (veritas) mais non la solvabilité du débiteur (bonitas).

Article 6 - Notification au débiteur
Le Cessionnaire notifiera la cession au débiteur conformément à l'art. 167 CO.

Article 7 - Documents
Le Cédant remet au Cessionnaire tous les documents relatifs à la créance.

Article 8 - Droit applicable
Le présent contrat est régi par les articles 164 et suivants du Code des obligations.

Fait en deux exemplaires, le [currentDate].

Le Cédant:                              Le Cessionnaire:

________________________               ________________________
[cedantName]                            [cessionaireName]`,
  },
  {
    id: 'ENT-5.6',
    title: 'Reconnaissance de dette',
    description: "Reconnaissance de dette formelle.",
    fields: z.object({
      debtorName: z.string().min(1, "Nom du débiteur requis."),
      debtorAddress: z.string().min(1, "Adresse du débiteur requise."),
      debtorPostalCode: z.string().min(4, "Code postal requis."),
      debtorCity: z.string().min(1, "Ville requise."),
      creditorName: z.string().min(1, "Nom du créancier requis."),
      creditorAddress: z.string().min(1, "Adresse du créancier requise."),
      debtAmount: z.string().min(1, "Montant de la dette requis."),
      debtOrigin: z.string().min(10, "Origine de la dette requise."),
      repaymentTerms: z.string().min(10, "Modalités de remboursement requises."),
      interestRate: z.string().optional(),
    }),
    templateText: `RECONNAISSANCE DE DETTE

Je soussigné(e),

[debtorName]
[debtorAddress], [debtorPostalCode] [debtorCity]

reconnais devoir à:

[creditorName]
[creditorAddress]

la somme de CHF [debtAmount] (en chiffres et en lettres: ________________________________).

ORIGINE DE LA DETTE:
[debtOrigin]

INTÉRÊTS:
La dette porte intérêts au taux annuel de [interestRate]%.

MODALITÉS DE REMBOURSEMENT:
[repaymentTerms]

La présente reconnaissance de dette constitue un titre exécutoire au sens de l'article 82 de la Loi sur la poursuite pour dettes et la faillite (LP).

Fait à [debtorCity], le [currentDate].

Le Débiteur:

________________________
[debtorName]
(Signature manuscrite)`,
  },
  {
    id: 'ENT-5.7',
    title: 'Convention d\'accord (transaction)',
    description: "Convention transactionnelle pour régler un litige.",
    fields: z.object({
      party1Name: z.string().min(1, "Nom de la première partie requis."),
      party1Address: z.string().min(1, "Adresse requise."),
      party1PostalCode: z.string().min(4, "Code postal requis."),
      party1City: z.string().min(1, "Ville requise."),
      party2Name: z.string().min(1, "Nom de la deuxième partie requis."),
      party2Address: z.string().min(1, "Adresse requise."),
      party2PostalCode: z.string().min(4, "Code postal requis."),
      party2City: z.string().min(1, "Ville requise."),
      disputeDescription: z.string().min(10, "Description du litige requise."),
      settlementTerms: z.string().min(10, "Termes de l'accord requis."),
      paymentAmount: z.string().optional(),
      paymentDeadline: z.string().optional(),
    }),
    templateText: `CONVENTION D'ACCORD (Transaction)

Entre

[party1Name]
[party1Address], [party1PostalCode] [party1City]
(ci-après "Partie 1")

et

[party2Name]
[party2Address], [party2PostalCode] [party2City]
(ci-après "Partie 2")

PRÉAMBULE:
Les parties sont en litige concernant:
[disputeDescription]

Souhaitant régler ce différend à l'amiable, les parties conviennent ce qui suit:

Article 1 - Objet de la transaction
Les parties mettent fin au litige susmentionné dans les conditions définies ci-après.

Article 2 - Termes de l'accord
[settlementTerms]

Article 3 - Paiement
La Partie [X] versera à la Partie [Y] la somme de CHF [paymentAmount] d'ici le [paymentDeadline].

Article 4 - Quittance et décharge
Sous réserve de la bonne exécution des engagements ci-dessus, les parties se donnent mutuellement quittance de toute créance relative au litige mentionné au préambule.

Article 5 - Confidentialité
Les parties s'engagent à garder confidentiels les termes de la présente convention.

Article 6 - Non-recours
Les parties renoncent à toute action judiciaire relative au présent litige.

Article 7 - Frais
Chaque partie supporte ses propres frais.

Article 8 - Droit applicable
La présente convention est soumise au droit suisse.

Fait en deux exemplaires, le [currentDate].

Partie 1:                                Partie 2:

________________________               ________________________
[party1Name]                            [party2Name]`,
  },
  {
    id: 'ENT-5.8',
    title: 'Contrat SNC (Société en nom collectif)',
    description: "Contrat de société en nom collectif (art. 552 ss CO).",
    fields: z.object({
      companyName: z.string().min(1, "Raison sociale requise."),
      companySeat: z.string().min(1, "Siège de la société requis."),
      companyPurpose: z.string().min(10, "But de la société requis."),
      partner1Name: z.string().min(1, "Nom du premier associé requis."),
      partner1Address: z.string().min(1, "Adresse requise."),
      partner1Contribution: z.string().min(1, "Apport du premier associé requis."),
      partner2Name: z.string().min(1, "Nom du deuxième associé requis."),
      partner2Address: z.string().min(1, "Adresse requise."),
      partner2Contribution: z.string().min(1, "Apport du deuxième associé requis."),
      profitDistribution: z.string().min(1, "Répartition des bénéfices requise."),
      managementRules: z.string().min(10, "Règles de gestion requises."),
      startDate: z.string().min(1, "Date de début requise."),
      duration: z.string().min(1, "Durée de la société requise."),
    }),
    templateText: `CONTRAT DE SOCIÉTÉ EN NOM COLLECTIF

Les soussignés:

1. [partner1Name]
   [partner1Address]

2. [partner2Name]
   [partner2Address]

conviennent de constituer une société en nom collectif aux conditions suivantes:

Article 1 - Raison sociale
La société porte la raison sociale: [companyName]

Article 2 - Siège
Le siège de la société est à: [companySeat]

Article 3 - But
La société a pour but: [companyPurpose]

Article 4 - Apports
Les associés apportent:
- [partner1Name]: [partner1Contribution]
- [partner2Name]: [partner2Contribution]

Article 5 - Durée
La société commence le [startDate] et est constituée pour une durée de [duration].

Article 6 - Gestion et représentation
[managementRules]

Chaque associé a le droit de représenter la société pour les affaires courantes.

Article 7 - Répartition des bénéfices et pertes
Les bénéfices et pertes sont répartis comme suit: [profitDistribution]

Article 8 - Responsabilité
Conformément à l'art. 568 CO, les associés répondent personnellement et solidairement des engagements de la société.

Article 9 - Dissolution
La société peut être dissoute par décision unanime des associés ou selon les cas prévus par la loi.

Article 10 - Droit applicable
Le présent contrat est soumis aux articles 552 et suivants du Code des obligations.

Fait en deux exemplaires, le [currentDate].

Associé 1:                              Associé 2:

________________________               ________________________
[partner1Name]                          [partner2Name]`,
  },
];

// ============================================================================
// CATEGORY 6: RECOUVREMENT (Debt Collection)
// ============================================================================
const recouvrementTemplates: Template[] = [
  {
    id: 'ENT-6.1',
    title: 'Sommation avant poursuite',
    description: "Mise en demeure formelle avant introduction d'une poursuite.",
    fields: z.object({
      companyName: z.string().min(1, "Raison sociale requise."),
      companyAddress: z.string().min(1, "Adresse requise."),
      companyPostalCode: z.string().min(4, "Code postal requis."),
      companyCity: z.string().min(1, "Ville requise."),
      companyIDE: z.string().min(1, "Numéro IDE requis."),
      debtorName: z.string().min(1, "Nom du débiteur requis."),
      debtorAddress: z.string().min(1, "Adresse du débiteur requise."),
      debtorPostalCode: z.string().min(4, "Code postal requis."),
      debtorCity: z.string().min(1, "Ville requise."),
      invoiceNumber: z.string().min(1, "Numéro de facture requis."),
      invoiceDate: z.string().min(1, "Date de facture requise."),
      invoiceAmount: z.string().min(1, "Montant de la facture requis."),
      paymentDeadline: z.string().min(1, "Délai de paiement requis."),
      bankDetails: z.string().min(1, "Coordonnées bancaires requises."),
    }),
    templateText: `${companyHeader}IDE: [companyIDE]

Recommandé

[debtorName]
[debtorAddress]
[debtorPostalCode] [debtorCity]

${dateLocation}
Objet: SOMMATION DE PAYER - Dernière mise en demeure avant poursuite
Facture n° [invoiceNumber] du [invoiceDate]

Madame, Monsieur,

Malgré nos rappels, nous constatons que notre facture n° [invoiceNumber] du [invoiceDate] reste impayée à ce jour.

MONTANT DÛ: CHF [invoiceAmount]

Nous vous mettons en demeure pour la dernière fois de régler cette somme dans un délai de [paymentDeadline] dès réception de la présente.

Coordonnées bancaires:
[bankDetails]

À défaut de paiement dans le délai imparti, nous nous verrons contraints d'introduire une POURSUITE auprès de l'Office des poursuites compétent, conformément à la Loi fédérale sur la poursuite pour dettes et la faillite (LP).

Les frais de poursuite seront entièrement à votre charge.

Nous vous invitons à prendre cette sommation au sérieux et à régulariser votre situation sans délai.
${letterClosing}`,
  },
];

// ============================================================================
// CATEGORY 7: SÀRL - CESSION DE PARTS
// ============================================================================
const sarlTemplates: Template[] = [
  {
    id: 'ENT-7.1',
    title: 'Cession de parts sociales Sàrl - Contrat',
    description: "Contrat de cession de parts sociales d'une Sàrl.",
    fields: z.object({
      companyName: z.string().min(1, "Raison sociale de la Sàrl requise."),
      companySeat: z.string().min(1, "Siège de la Sàrl requis."),
      companyRC: z.string().min(1, "Numéro RC requis."),
      cedantName: z.string().min(1, "Nom du cédant requis."),
      cedantAddress: z.string().min(1, "Adresse du cédant requise."),
      cessionaireName: z.string().min(1, "Nom du cessionnaire requis."),
      cessionaireAddress: z.string().min(1, "Adresse du cessionnaire requise."),
      numberOfShares: z.string().min(1, "Nombre de parts cédées requis."),
      nominalValue: z.string().min(1, "Valeur nominale requise."),
      totalPrice: z.string().min(1, "Prix de cession requis."),
      paymentTerms: z.string().min(10, "Modalités de paiement requises."),
      effectiveDate: z.string().min(1, "Date d'effet requise."),
    }),
    templateText: `CONTRAT DE CESSION DE PARTS SOCIALES

Entre

[cedantName]
[cedantAddress]
(ci-après "le Cédant")

et

[cessionaireName]
[cessionaireAddress]
(ci-après "le Cessionnaire")

PRÉAMBULE:
Le Cédant est associé de la société [companyName], Sàrl, avec siège à [companySeat], inscrite au Registre du commerce sous le numéro [companyRC].

Il est convenu ce qui suit:

Article 1 - Objet de la cession
Le Cédant cède au Cessionnaire, qui accepte:
- Nombre de parts sociales: [numberOfShares]
- Valeur nominale par part: CHF [nominalValue]

Article 2 - Prix de cession
Le prix de cession est fixé à CHF [totalPrice].

Article 3 - Conditions de paiement
[paymentTerms]

Article 4 - Date d'effet
La cession prend effet le [effectiveDate], sous réserve de l'approbation de l'assemblée des associés conformément à l'art. 786 CO.

Article 5 - Déclarations du Cédant
Le Cédant déclare:
- Être le seul propriétaire des parts cédées
- Les parts sont libres de tout gage ou droit de tiers
- Les parts sont entièrement libérées

Article 6 - Assemblée des associés
Le Cessionnaire sera convoqué à la prochaine assemblée des associés pour approbation de la cession.

Article 7 - Obligations des parties
- Le Cédant s'engage à faire radier son inscription au RC
- Le Cessionnaire s'engage à faire inscrire la cession au RC

Article 8 - Droit applicable
La présente cession est soumise au droit suisse, notamment aux art. 785 et suivants CO.

Fait en deux exemplaires, le [currentDate].

Le Cédant:                              Le Cessionnaire:

________________________               ________________________
[cedantName]                            [cessionaireName]

(Signatures à légaliser selon les statuts de la société)`,
  },
  {
    id: 'ENT-7.2',
    title: 'Cession de parts sociales Sàrl - PV assemblée',
    description: "Procès-verbal de l'assemblée des associés approuvant la cession.",
    fields: z.object({
      companyName: z.string().min(1, "Raison sociale de la Sàrl requise."),
      companySeat: z.string().min(1, "Siège de la Sàrl requis."),
      companyRC: z.string().min(1, "Numéro RC requis."),
      meetingDate: z.string().min(1, "Date de l'assemblée requise."),
      meetingPlace: z.string().min(1, "Lieu de l'assemblée requis."),
      chairmanName: z.string().min(1, "Nom du président de l'assemblée requis."),
      secretaryName: z.string().min(1, "Nom du secrétaire requis."),
      cedantName: z.string().min(1, "Nom du cédant requis."),
      cessionaireName: z.string().min(1, "Nom du cessionnaire requis."),
      numberOfShares: z.string().min(1, "Nombre de parts cédées requis."),
      totalVotes: z.string().min(1, "Nombre total de voix requis."),
      votesFor: z.string().min(1, "Nombre de voix pour requis."),
      votesAgainst: z.string().min(1, "Nombre de voix contre requis."),
    }),
    templateText: `PROCÈS-VERBAL DE L'ASSEMBLÉE DES ASSOCIÉS

[companyName]
Sàrl avec siège à [companySeat]
RC: [companyRC]

Date: [meetingDate]
Lieu: [meetingPlace]

PRÉSENCES:
L'assemblée réunit les associés représentant [totalVotes] voix sur [totalVotes].
Le quorum est atteint.

BUREAU:
Président: [chairmanName]
Secrétaire: [secretaryName]

ORDRE DU JOUR:
1. Approbation de la cession de parts sociales

DÉLIBÉRATIONS:

1. CESSION DE PARTS SOCIALES

Le président expose que Monsieur/Madame [cedantName] souhaite céder [numberOfShares] part(s) sociale(s) à Monsieur/Madame [cessionaireName].

Conformément à l'article 786 CO et aux statuts de la société, la cession de parts sociales nécessite l'approbation de l'assemblée des associés.

Après délibération, l'assemblée vote:
- Voix pour: [votesFor]
- Voix contre: [votesAgainst]

RÉSOLUTION:
L'assemblée approuve la cession de [numberOfShares] part(s) sociale(s) de [cedantName] à [cessionaireName].

L'assemblée mandate le gérant de procéder aux formalités d'inscription au Registre du commerce.

L'ordre du jour étant épuisé, la séance est levée.

[meetingPlace], le [meetingDate]

Le Président:                           Le Secrétaire:

________________________               ________________________
[chairmanName]                          [secretaryName]`,
  },
  {
    id: 'ENT-7.3',
    title: 'Réquisition de transfert Sàrl',
    description: "Réquisition au Registre du commerce pour le transfert de parts.",
    fields: z.object({
      companyName: z.string().min(1, "Raison sociale requise."),
      companyRC: z.string().min(1, "Numéro RC requis."),
      companySeat: z.string().min(1, "Siège requis."),
      rcOffice: z.string().min(1, "Office du RC requis."),
      rcAddress: z.string().min(1, "Adresse du RC requise."),
      cedantName: z.string().min(1, "Nom du cédant requis."),
      cedantDateOfBirth: z.string().min(1, "Date de naissance du cédant requise."),
      cedantNationality: z.string().min(1, "Nationalité du cédant requise."),
      cedantAddress: z.string().min(1, "Adresse du cédant requise."),
      cessionaireName: z.string().min(1, "Nom du cessionnaire requis."),
      cessionaireDateOfBirth: z.string().min(1, "Date de naissance du cessionnaire requise."),
      cessionaireNationality: z.string().min(1, "Nationalité du cessionnaire requise."),
      cessionaireAddress: z.string().min(1, "Adresse du cessionnaire requise."),
      numberOfShares: z.string().min(1, "Nombre de parts transférées requis."),
      nominalValue: z.string().min(1, "Valeur nominale requise."),
    }),
    templateText: `RÉQUISITION D'INSCRIPTION AU REGISTRE DU COMMERCE

Destinataire:
[rcOffice]
[rcAddress]

Société: [companyName]
N° RC: [companyRC]
Siège: [companySeat]

${dateLocation}
Objet: Réquisition de transfert de parts sociales

Monsieur le Préposé,

Au nom de la société [companyName], nous vous prions de bien vouloir inscrire le transfert de parts sociales suivant:

CÉDANT (à radier):
Nom: [cedantName]
Date de naissance: [cedantDateOfBirth]
Nationalité: [cedantNationality]
Domicile: [cedantAddress]
Parts cédées: [numberOfShares] parts de CHF [nominalValue] nominales

CESSIONNAIRE (à inscrire):
Nom: [cessionaireName]
Date de naissance: [cessionaireDateOfBirth]
Nationalité: [cessionaireNationality]
Domicile: [cessionaireAddress]
Parts acquises: [numberOfShares] parts de CHF [nominalValue] nominales

PIÈCES JOINTES:
□ Contrat de cession de parts (original)
□ PV de l'assemblée des associés approuvant la cession
□ Attestation de libération des parts (si applicable)
□ Justificatif d'identité du cessionnaire

Nous vous remercions de procéder à cette inscription et de nous adresser l'extrait RC mis à jour.

Veuillez agréer, Monsieur le Préposé, l'expression de nos salutations distinguées.

[companyName]

________________________
Signature(s) autorisée(s)`,
  },
];

// ============================================================================
// ALL CATEGORIES
// ============================================================================
export const templateCategories: TemplateCategory[] = [
  {
    id: 'emploi',
    title: 'Contrats de travail',
    description: 'Contrats de travail, annexes et accords de confidentialité',
    icon: 'Briefcase',
    templates: emploiTemplates,
  },
  {
    id: 'rh',
    title: 'Gestion RH',
    description: 'Licenciements, certificats de travail, avertissements',
    icon: 'Users',
    templates: rhTemplates,
  },
  {
    id: 'correspondance',
    title: 'Correspondance commerciale',
    description: 'Procurations, lettres d\'information, mandats',
    icon: 'Mail',
    templates: correspondanceTemplates,
  },
  {
    id: 'fiscalite',
    title: 'Fiscalité',
    description: 'Courriers aux autorités fiscales et réclamations',
    icon: 'Receipt',
    templates: fiscaliteTemplates,
  },
  {
    id: 'contrats',
    title: 'Contrats commerciaux',
    description: 'Vente, entreprise, prêts, cessions, SNC',
    icon: 'FileSignature',
    templates: contratsTemplates,
  },
  {
    id: 'recouvrement',
    title: 'Recouvrement',
    description: 'Sommations et mises en demeure',
    icon: 'Gavel',
    templates: recouvrementTemplates,
  },
  {
    id: 'sarl',
    title: 'Sàrl - Cession de parts',
    description: 'Transfert de parts sociales et formalités RC',
    icon: 'Building',
    templates: sarlTemplates,
  },
];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================
export function getTotalTemplateCount(): number {
  return templateCategories.reduce((acc, cat) => acc + cat.templates.length, 0);
}

export function getTemplateById(id: string): Template | undefined {
  for (const category of templateCategories) {
    const template = category.templates.find((t) => t.id === id);
    if (template) return template;
  }
  return undefined;
}

export function getCategoryByTemplateId(templateId: string): TemplateCategory | undefined {
  return templateCategories.find((cat) =>
    cat.templates.some((t) => t.id === templateId)
  );
}

    