 'use client';
import { z } from 'zod';
import * as Icons from 'lucide-react';

// Icon mapping for categories
export const iconMap: { [key: string]: React.ElementType } = {
  Heart: Icons.Heart,
  Shield: Icons.Shield,
  FileText: Icons.FileText,
  XCircle: Icons.XCircle,
  Plane: Icons.Plane,
  Handshake: Icons.Handshake,
  Gavel: Icons.Gavel,
  Megaphone: Icons.Megaphone,
  PackageX: Icons.PackageX,
  AlertTriangle: Icons.AlertTriangle,
  Database: Icons.Database,
  Home: Icons.Home,
  FileWarning: Icons.FileWarning,
  BookUser: Icons.BookUser,
};

export type Template = {
  id: string;
  titleKey: string;
  descriptionKey: string;
  fields: z.ZodObject<any>;
  templateText: string;
};

export type TemplateCategory = {
  id: string;
  titleKey: string;
  descriptionKey: string;
  icon: keyof typeof iconMap;
  templates: Template[];
};

// ============================================================================
// TEMPLATE TEXT HELPERS - Standard Swiss Letter Format
// ============================================================================
const letterHeader = `[userFirstName] [userLastName]
[userAddress]
[userPostalCode] [userCity]





                                             [destinataire_nom]
                                             [destinataire_adresse]
                                             [destinataire_code_postal_ville]

                                             [lieu_redaction], le [date_redaction]

`;

const letterClosing = `

Vous souhaitant bonne réception de la présente, je vous prie d'agréer, Madame, Monsieur, l'expression de mes salutations distinguées.

[Signature]`;

// ============================================================================
// CATEGORY 1: ASSURANCE MALADIE (8 templates)
// ============================================================================
const assuranceMaladieTemplates: Template[] = [
  {
    id: 'LM-1.1',
    titleKey: 'AssuranceMaladie.affiliation.title',
    descriptionKey: 'AssuranceMaladie.affiliation.description',
    fields: z.object({
      // Personal Information
      personalName: z.string().min(1, "Votre nom complet requis."),
      dateOfBirth: z.string().min(1, "Date de naissance requise."),
      personalAddress: z.string().min(1, "Votre adresse requise."),
      personalPostalCode: z.string().min(1, "Code postal requis."),
      personalCity: z.string().min(1, "Ville requise."),
      // Insurance details
      newInsurer: z.string().min(1, "Nom de la nouvelle caisse-maladie requis."),
      insurerAddress: z.string().min(1, "Adresse de la caisse-maladie requise."),
      startDate: z.string().min(1, "Date de début d'affiliation requise."),
      familyMembers: z
        .array(
          z.object({
            name: z.string().min(1, 'Nom requis pour chaque personne assurée.'),
            dateOfBirth: z.string().optional().default(''),
            policyNumber: z.string().optional().default(''),
          })
        )
        .max(20)
        .default([]),
    }),
    templateText: `${letterHeader}Objet : Demande d'affiliation à l'assurance obligatoire des soins

Madame, Monsieur,

Par la présente, je vous prie de bien vouloir m'affilier à votre caisse-maladie pour l'assurance obligatoire des soins (LAMal) à compter du [startDate].

Personnes concernées par la présente demande (le cas échéant) : [familyMembersList]

Je vous remercie de m'envoyer les documents nécessaires à mon affiliation ainsi que la confirmation de celle-ci.

Je reste à votre disposition pour tout renseignement complémentaire.${letterClosing}`,
  },
  {
    id: 'LM-1.2',
    titleKey: 'AssuranceMaladie.resiliationObligatoire.title',
    descriptionKey: 'AssuranceMaladie.resiliationObligatoire.description',
    fields: z.object({
      // Personal info (auto-populated from profile)
      personalName: z.string().min(1, "Votre nom complet requis."),
      dateOfBirth: z.string().min(1, "Date de naissance requise."),
      personalAddress: z.string().min(1, "Votre adresse requise."),
      personalPostalCode: z.string().min(1, "Code postal requis."),
      personalCity: z.string().min(1, "Ville requise."),
      // Insurer info
      currentInsurer: z
        .string()
        .min(1, "Nom de l'assureur actuel requis.")
        .regex(/[A-Za-zÀ-ÿ0-9]/, "Le nom de l'assureur doit contenir du texte ou des chiffres."),
      insurerAddress: z.string().min(1, "Adresse de l'assureur requise."),
      policyNumber: z.string().min(1, "Numéro de police requis."),
      terminationDate: z.string().min(1, "Date de résiliation requise."),
      familyMembers: z
        .array(
          z.object({
            name: z.string().min(1, 'Nom requis pour chaque personne assurée.'),
            dateOfBirth: z.string().optional().default(''),
            policyNumber: z.string().optional().default(''),
          })
        )
        .max(20)
        .default([]),
    }),
    templateText: `${letterHeader}Objet : Résiliation de mon assurance obligatoire des soins

Madame, Monsieur,

Par la présente, je résilie mon assurance obligatoire des soins (police n° [policyNumber]) avec effet au [terminationDate].

Personnes assurées avec moi (si applicable) : [familyMembersList]

Je vous remercie de bien vouloir m'envoyer une confirmation de la résiliation de mon contrat.${letterClosing}`,
  },
  {
    id: 'LM-1.3',
    titleKey: 'AssuranceMaladie.changementModele.title',
    descriptionKey: 'AssuranceMaladie.changementModele.description',
    fields: z.object({
      // Personal info (auto-populated from profile)
      personalName: z.string().min(1, "Votre nom complet requis."),
      dateOfBirth: z.string().min(1, "Date de naissance requise."),
      personalAddress: z.string().min(1, "Votre adresse requise."),
      personalPostalCode: z.string().min(1, "Code postal requis."),
      personalCity: z.string().min(1, "Ville requise."),
      // Insurer info
      insurer: z.string().min(1, "Nom de l'assureur requis."),
      insurerAddress: z.string().min(1, "Adresse de l'assureur requise."),
      policyNumber: z.string().min(1, "Numéro de police requis."),
      currentModel: z.string().min(1, "Modèle actuel requis."),
      newModel: z.string().min(1, "Nouveau modèle souhaité requis."),
      effectiveDate: z.string().min(1, "Date d'effet requise."),
      familyMembers: z
        .array(
          z.object({
            name: z.string().min(1, 'Nom requis pour chaque personne assurée.'),
            dateOfBirth: z.string().optional().default(''),
            policyNumber: z.string().optional().default(''),
          })
        )
        .max(20)
        .default([]),
    }),
    templateText: `${letterHeader}Objet : Changement de modèle d'assurance

Madame, Monsieur,

Je suis actuellement assuré(e) auprès de votre caisse sous le n° de police [policyNumber] avec le modèle [currentModel].

Par la présente, je souhaite changer de modèle d'assurance et passer au modèle [newModel] avec effet au [effectiveDate].

Personnes concernées par la présente demande (le cas échéant) : [familyMembersList]

Je vous remercie de bien vouloir confirmer ce changement et de m'informer des éventuelles modifications de prime.${letterClosing}`,
  },
  {
    id: 'LM-1.4',
    titleKey: 'AssuranceMaladie.modificationFranchise.title',
    descriptionKey: 'AssuranceMaladie.modificationFranchise.description',
    fields: z.object({
      // Personal info (auto-populated from profile)
      personalName: z.string().min(1, "Votre nom complet requis."),
      dateOfBirth: z.string().min(1, "Date de naissance requise."),
      personalAddress: z.string().min(1, "Votre adresse requise."),
      personalPostalCode: z.string().min(1, "Code postal requis."),
      personalCity: z.string().min(1, "Ville requise."),
      // Insurer info
      insurer: z.string().min(1, "Nom de l'assureur requis."),
      insurerAddress: z.string().min(1, "Adresse de l'assureur requise."),
      policyNumber: z.string().min(1, "Numéro de police requis."),
      currentFranchise: z.coerce.number().min(300, "Franchise actuelle requise."),
      newFranchise: z.coerce.number().min(300, "Nouvelle franchise requise (min. 300 CHF)."),
      effectiveDate: z.string().min(1, "Date d'effet requise."),
      familyMembers: z
        .array(
          z.object({
            name: z.string().min(1, 'Nom requis pour chaque personne assurée.'),
            dateOfBirth: z.string().optional().default(''),
            policyNumber: z.string().optional().default(''),
          })
        )
        .max(20)
        .default([]),
    }),
    templateText: `${letterHeader}Objet : Modification de ma franchise

Madame, Monsieur,

Je suis actuellement assuré(e) auprès de votre caisse sous le n° de police [policyNumber] avec une franchise de CHF [currentFranchise].

Par la présente, je souhaite modifier ma franchise à CHF [newFranchise] avec effet au [effectiveDate].

Personnes concernées par la présente demande (le cas échéant) : [familyMembersList]

Je vous remercie de bien vouloir confirmer cette modification et de m'informer du nouveau montant de ma prime.${letterClosing}`,
  },
  {
    id: 'LM-1.5',
    titleKey: 'AssuranceMaladie.exclusionAccidents.title',
    descriptionKey: 'AssuranceMaladie.exclusionAccidents.description',
    fields: z.object({
      // Personal info (auto-populated from profile)
      personalName: z.string().min(1, "Votre nom complet requis."),
      dateOfBirth: z.string().min(1, "Date de naissance requise."),
      personalAddress: z.string().min(1, "Votre adresse requise."),
      personalPostalCode: z.string().min(1, "Code postal requis."),
      personalCity: z.string().min(1, "Ville requise."),
      // Insurer info
      insurer: z.string().min(1, "Nom de l'assureur requis."),
      insurerAddress: z.string().min(1, "Adresse de l'assureur requise."),
      policyNumber: z.string().min(1, "Numéro de police requis."),
      employerName: z.string().min(1, "Nom de l'employeur requis."),
      effectiveDate: z.string().min(1, "Date d'effet requise."),
      familyMembers: z
        .array(
          z.object({
            name: z.string().min(1, 'Nom requis pour chaque personne assurée.'),
            dateOfBirth: z.string().optional().default(''),
            policyNumber: z.string().optional().default(''),
          })
        )
        .max(20)
        .default([]),
    }),
    templateText: `${letterHeader}Objet : Demande d'exclusion de la couverture accidents

Madame, Monsieur,

Je suis actuellement assuré(e) auprès de votre caisse sous le n° de police [policyNumber].

Étant employé(e) à plus de 8 heures par semaine chez [employerName], je suis couvert(e) par l'assurance accidents obligatoire de mon employeur (LAA).

Par la présente, je vous demande d'exclure la couverture accidents de mon assurance maladie avec effet au [effectiveDate].

Personnes concernées par la présente demande (le cas échéant) : [familyMembersList]

Je vous remercie de bien vouloir confirmer cette modification et de m'informer de la réduction de prime correspondante.${letterClosing}`,
  },
  {
    id: 'LM-1.6',
    titleKey: 'AssuranceMaladie.resiliationComplementaire.title',
    descriptionKey: 'AssuranceMaladie.resiliationComplementaire.description',
    fields: z.object({
      // Personal info (auto-populated from profile)
      personalName: z.string().min(1, "Votre nom complet requis."),
      dateOfBirth: z.string().min(1, "Date de naissance requise."),
      personalAddress: z.string().min(1, "Votre adresse requise."),
      personalPostalCode: z.string().min(1, "Code postal requis."),
      personalCity: z.string().min(1, "Ville requise."),
      // Insurer info
      insurer: z.string().min(1, "Nom de l'assureur requis."),
      insurerAddress: z.string().min(1, "Adresse de l'assureur requise."),
      policyNumber: z.string().min(1, "Numéro de police requis."),
      complementaryInsurances: z.string().min(1, "Assurances complémentaires à résilier."),
      terminationDate: z.string().min(1, "Date de résiliation requise."),
      familyMembers: z
        .array(
          z.object({
            name: z.string().min(1, 'Nom requis pour chaque personne assurée.'),
            dateOfBirth: z.string().optional().default(''),
            policyNumber: z.string().optional().default(''),
          })
        )
        .max(20)
        .default([]),
    }),
    templateText: `${letterHeader}Objet : Résiliation d'assurance(s) complémentaire(s)

Madame, Monsieur,

Je suis actuellement assuré(e) auprès de votre caisse sous le n° de police [policyNumber].

Par la présente, je résilie la/les assurance(s) complémentaire(s) suivante(s) : [complementaryInsurances], avec effet au [terminationDate].

Personnes concernées par la présente résiliation (le cas échéant) : [familyMembersList]

Je vous prie de bien vouloir confirmer cette résiliation par écrit.${letterClosing}`,
  },
  {
    id: 'LM-1.7',
    titleKey: 'AssuranceMaladie.contestationRefus.title',
    descriptionKey: 'AssuranceMaladie.contestationRefus.description',
    fields: z.object({
      insurer: z.string().min(1, "Nom de l'assureur requis."),
      insurerAddress: z.string().min(1, "Adresse de l'assureur requise."),
      policyNumber: z.string().min(1, "Numéro de police requis."),
      refusalDate: z.string().min(1, "Date du refus requise."),
      treatmentDescription: z.string().min(10, "Description du traitement refusé requise."),
      reasonForContestation: z.string().min(10, "Motifs de contestation requis."),
      familyMembers: z
        .array(
          z.object({
            name: z.string().min(1, 'Nom requis pour chaque personne assurée.'),
            dateOfBirth: z.string().optional().default(''),
            policyNumber: z.string().optional().default(''),
          })
        )
        .max(20)
        .default([]),
    }),
    templateText: `${letterHeader}Objet : Contestation de votre refus de prise en charge

Madame, Monsieur,

Je suis assuré(e) auprès de votre caisse sous le n° de police [policyNumber].

Par courrier du [refusalDate], vous avez refusé la prise en charge du traitement suivant : [treatmentDescription].

Je conteste ce refus pour les motifs suivants : [reasonForContestation].

Personnes concernées par la présente demande (le cas échéant) : [familyMembersList]

Je vous demande de reconsidérer votre décision et de m'accorder la prise en charge demandée. À défaut, je vous prie de bien vouloir me notifier une décision formelle susceptible de recours.${letterClosing}`,
  },
  {
    id: 'LM-1.8',
    titleKey: 'AssuranceMaladie.suspensionPrimes.title',
    descriptionKey: 'AssuranceMaladie.suspensionPrimes.description',
    fields: z.object({
      insurer: z.string().min(1, "Nom de l'assureur requis."),
      insurerAddress: z.string().min(1, "Adresse de l'assureur requise."),
      policyNumber: z.string().min(1, "Numéro de police requis."),
      serviceType: z.enum(['militaire', 'civil']),
      serviceStartDate: z.string().min(1, "Date de début du service requise."),
      serviceEndDate: z.string().min(1, "Date de fin du service requise."),
      familyMembers: z
        .array(
          z.object({
            name: z.string().min(1, 'Nom requis pour chaque personne assurée.'),
            dateOfBirth: z.string().optional().default(''),
            policyNumber: z.string().optional().default(''),
          })
        )
        .max(20)
        .default([]),
    }),
    templateText: `${letterHeader}Objet : Demande de suspension des primes durant le service [serviceType]

Madame, Monsieur,

Je suis assuré(e) auprès de votre caisse sous le n° de police [policyNumber].

Je vais effectuer mon service [serviceType] du [serviceStartDate] au [serviceEndDate]. Durant cette période, je serai couvert(e) par l'assurance militaire.

Par la présente, je vous demande de suspendre mes primes d'assurance maladie pour cette période, conformément à la législation en vigueur.

Personnes concernées par la présente demande (le cas échéant) : [familyMembersList]

Je joins à la présente une copie de ma convocation au service.${letterClosing}`,
  },
];

// ============================================================================
// CATEGORY 2: GARANTIE (4 templates)
// ============================================================================
const garantieTemplates: Template[] = [
  {
    id: 'LM-2.1',
    titleKey: 'Garantie.avisDefauts.title',
    descriptionKey: 'Garantie.avisDefauts.description',
    fields: z.object({
      retailerName: z.string().min(1, "Nom du vendeur requis."),
      retailerAddress: z.string().min(1, "Adresse du vendeur requise."),
      productName: z.string().min(1, "Nom du produit requis."),
      purchaseDate: z.string().min(1, "Date d'achat requise."),
      defectDescription: z.string().min(10, "Description du défaut requise."),
    }),
    templateText: `${letterHeader}Objet : Avis des défauts – [productName]

Madame, Monsieur,

En date du [purchaseDate], j'ai acheté chez vous le produit suivant : [productName].

Je constate aujourd'hui le défaut suivant : [defectDescription].

Conformément aux articles 197 et suivants du Code des obligations, je vous demande de remédier à ce défaut dans un délai de 10 jours, soit par réparation, soit par échange du produit défectueux.

À défaut de réponse de votre part dans ce délai, je me réserve le droit de demander une réduction du prix ou l'annulation de la vente.${letterClosing}`,
  },
  {
    id: 'LM-2.2',
    titleKey: 'Garantie.avisDefautsContrat.title',
    descriptionKey: 'Garantie.avisDefautsContrat.description',
    fields: z.object({
      companyName: z.string().min(1, "Nom de l'entreprise requis."),
      companyAddress: z.string().min(1, "Adresse de l'entreprise requise."),
      workDescription: z.string().min(1, "Description des travaux requise."),
      executionDate: z.string().min(1, "Date d'exécution requise."),
      defectDescription: z.string().min(10, "Description du défaut requise."),
    }),
    templateText: `${letterHeader}Objet : Avis des défauts – Travaux du [executionDate]

Madame, Monsieur,

En date du [executionDate], vous avez exécuté les travaux suivants : [workDescription].

Je constate aujourd'hui le défaut suivant : [defectDescription].

Conformément aux articles 367 et suivants du Code des obligations, je vous demande de remédier à ce défaut dans un délai de 10 jours.

À défaut, je me réserve le droit de faire exécuter les travaux de correction par un tiers à vos frais ou de demander une réduction du prix.${letterClosing}`,
  },
  {
    id: 'LM-2.3',
    titleKey: 'Garantie.defautPersistant.title',
    descriptionKey: 'Garantie.defautPersistant.description',
    fields: z.object({
      retailerName: z.string().min(1, "Nom du vendeur requis."),
      retailerAddress: z.string().min(1, "Adresse du vendeur requise."),
      productName: z.string().min(1, "Nom du produit requis."),
      originalDefectDate: z.string().min(1, "Date du signalement initial requise."),
      repairDate: z.string().min(1, "Date de la réparation requise."),
      defectDescription: z.string().min(10, "Description du défaut persistant requise."),
    }),
    templateText: `${letterHeader}Objet : Défaut persistant après réparation – [productName]

Madame, Monsieur,

Suite à mon avis des défauts du [originalDefectDate] concernant [productName], vous avez procédé à une réparation le [repairDate].

Malheureusement, je constate que le défaut suivant persiste : [defectDescription].

Cette réparation n'ayant pas résolu le problème, je vous demande de procéder à une nouvelle intervention ou à l'échange du produit dans un délai de 10 jours.

À défaut, je me réserve le droit de demander l'annulation de la vente et le remboursement intégral.${letterClosing}`,
  },
  {
    id: 'LM-2.4',
    titleKey: 'Garantie.resiliationApresReparations.title',
    descriptionKey: 'Garantie.resiliationApresReparations.description',
    fields: z.object({
      retailerName: z.string().min(1, "Nom du vendeur requis."),
      retailerAddress: z.string().min(1, "Adresse du vendeur requise."),
      productName: z.string().min(1, "Nom du produit requis."),
      purchaseDate: z.string().min(1, "Date d'achat requise."),
      repairDates: z.string().min(1, "Dates des réparations (liste)."),
      desiredOutcome: z.enum(['remboursement', 'échange']),
    }),
    templateText: `${letterHeader}Objet : Demande de [desiredOutcome] – [productName]

Madame, Monsieur,

En date du [purchaseDate], j'ai acheté chez vous le produit suivant : [productName].

Depuis lors, ce produit a nécessité plusieurs réparations aux dates suivantes : [repairDates].

Malgré ces interventions répétées, le produit présente toujours des défauts rendant son utilisation normale impossible. Conformément aux articles 205 et suivants du Code des obligations, et compte tenu de l'échec des tentatives de réparation, je demande le [desiredOutcome] du produit.

Je vous prie de donner suite à ma demande dans un délai de 10 jours.${letterClosing}`,
  },
];

// ============================================================================
// CATEGORY 3: EXECUTION CONTRAT (16 templates)
// ============================================================================
const executionContratTemplates: Template[] = [
  {
    id: 'LM-3.1',
    titleKey: 'ExecutionContrat.relanceGenerale.title',
    descriptionKey: 'ExecutionContrat.relanceGenerale.description',
    fields: z.object({
      debtorName: z.string().min(1, "Nom du débiteur requis."),
      debtorAddress: z.string().min(1, "Adresse du débiteur requise."),
      obligationDescription: z.string().min(10, "Description de l'obligation requise."),
      originalDueDate: z.string().min(1, "Date d'échéance originale requise."),
    }),
    templateText: `${letterHeader}Objet : Relance – [obligationDescription]

Madame, Monsieur,

Je me permets de vous relancer concernant [obligationDescription], dont l'échéance était fixée au [originalDueDate].

À ce jour, je n'ai toujours pas reçu satisfaction. Je vous prie de bien vouloir vous exécuter dans les plus brefs délais.

Dans l'attente de votre réponse, je vous prie d'agréer mes salutations distinguées.

[Signature]`,
  },
  {
    id: 'LM-3.2',
    titleKey: 'ExecutionContrat.miseEnDemeure.title',
    descriptionKey: 'ExecutionContrat.miseEnDemeure.description',
    fields: z.object({
      debtorName: z.string().min(1, "Nom du débiteur requis."),
      debtorAddress: z.string().min(1, "Adresse du débiteur requise."),
      obligationDescription: z.string().min(10, "Description de l'obligation requise."),
      amount: z.string().optional(),
      originalDueDate: z.string().min(1, "Date d'échéance originale requise."),
      newDeadline: z.string().min(1, "Nouveau délai requis."),
    }),
    templateText: `${letterHeader}Objet : MISE EN DEMEURE

Madame, Monsieur,

Malgré mes précédentes relances, vous n'avez toujours pas donné suite à votre obligation : [obligationDescription], échue depuis le [originalDueDate].

Par la présente, je vous mets formellement en demeure de vous exécuter dans un dernier délai échéant le [newDeadline].

Passé ce délai, je me réserve le droit d'entreprendre toutes les démarches judiciaires nécessaires à la défense de mes intérêts, sans autre avis de ma part.${letterClosing}`,
  },
  {
    id: 'LM-3.3',
    titleKey: 'ExecutionContrat.miseEnDemeureRetard.title',
    descriptionKey: 'ExecutionContrat.miseEnDemeureRetard.description',
    fields: z.object({
      sellerName: z.string().min(1, "Nom du vendeur requis."),
      sellerAddress: z.string().min(1, "Adresse du vendeur requise."),
      productDescription: z.string().min(1, "Description du produit commandé requise."),
      orderDate: z.string().min(1, "Date de commande requise."),
      promisedDeliveryDate: z.string().min(1, "Date de livraison promise requise."),
      newDeadline: z.string().min(1, "Nouveau délai de livraison requis."),
    }),
    templateText: `${letterHeader}Objet : MISE EN DEMEURE – Retard de livraison

Madame, Monsieur,

En date du [orderDate], j'ai commandé chez vous : [productDescription]. La livraison était prévue pour le [promisedDeliveryDate].

À ce jour, je n'ai toujours pas reçu ma commande.

Par la présente, je vous mets en demeure de procéder à la livraison dans un délai échéant le [newDeadline].

Passé ce délai, je considérerai la vente comme annulée et exigerai le remboursement intégral des sommes versées, sans préjudice de tous dommages-intérêts.${letterClosing}`,
  },
  {
    id: 'LM-3.4',
    titleKey: 'ExecutionContrat.resiliationVente.title',
    descriptionKey: 'ExecutionContrat.resiliationVente.description',
    fields: z.object({
      sellerName: z.string().min(1, "Nom du vendeur requis."),
      sellerAddress: z.string().min(1, "Adresse du vendeur requise."),
      productDescription: z.string().min(1, "Description du produit requise."),
      miseEnDemeureDate: z.string().min(1, "Date de la mise en demeure requise."),
      amountPaid: z.string().min(1, "Montant payé requis."),
    }),
    templateText: `${letterHeader}Objet : Résiliation du contrat de vente et demande de remboursement

Madame, Monsieur,

Par courrier du [miseEnDemeureDate], je vous ai mis en demeure de me livrer [productDescription]. Ce délai est maintenant échu sans que vous ayez donné suite.

Conformément à l'article 107 du Code des obligations, je déclare par la présente résilier le contrat de vente.

Je vous demande de me rembourser la somme de CHF [amountPaid] dans un délai de 10 jours.

À défaut, j'entreprendrai les démarches judiciaires nécessaires.${letterClosing}`,
  },
  {
    id: 'LM-3.5',
    titleKey: 'ExecutionContrat.resiliationEntreprise.title',
    descriptionKey: 'ExecutionContrat.resiliationEntreprise.description',
    fields: z.object({
      companyName: z.string().min(1, "Nom de l'entreprise requis."),
      companyAddress: z.string().min(1, "Adresse de l'entreprise requise."),
      workDescription: z.string().min(1, "Description des travaux requise."),
      miseEnDemeureDate: z.string().min(1, "Date de la mise en demeure requise."),
      amountPaid: z.string().min(1, "Montant payé requis."),
    }),
    templateText: `${letterHeader}Objet : Résiliation du contrat d'entreprise

Madame, Monsieur,

Par courrier du [miseEnDemeureDate], je vous ai mis en demeure d'exécuter les travaux suivants : [workDescription]. Ce délai est maintenant échu sans que vous ayez donné suite.

Conformément aux articles 107 et 366 du Code des obligations, je déclare par la présente résilier le contrat d'entreprise.

Je vous demande de me rembourser la somme de CHF [amountPaid] correspondant aux acomptes versés, dans un délai de 10 jours.${letterClosing}`,
  },
  {
    id: 'LM-3.6',
    titleKey: 'ExecutionContrat.demandeJustificatifs.title',
    descriptionKey: 'ExecutionContrat.demandeJustificatifs.description',
    fields: z.object({
      companyName: z.string().min(1, "Nom de l'entreprise requis."),
      companyAddress: z.string().min(1, "Adresse de l'entreprise requise."),
      invoiceNumber: z.string().min(1, "Numéro de facture requis."),
      documentsRequested: z.string().min(10, "Documents demandés requis."),
    }),
    templateText: `${letterHeader}Objet : Demande de pièces justificatives – Facture n° [invoiceNumber]

Madame, Monsieur,

J'ai reçu votre facture n° [invoiceNumber]. Avant de procéder au paiement, je vous prie de bien vouloir me fournir les pièces justificatives suivantes : [documentsRequested].

Je vous remercie de me les transmettre dans un délai de 10 jours.${letterClosing}`,
  },
  {
    id: 'LM-3.7',
    titleKey: 'ExecutionContrat.renonciationPrescription.title',
    descriptionKey: 'ExecutionContrat.renonciationPrescription.description',
    fields: z.object({
      creditorName: z.string().min(1, "Nom du créancier requis."),
      creditorAddress: z.string().min(1, "Adresse du créancier requise."),
      claimDescription: z.string().min(10, "Description de la créance requise."),
      waiverEndDate: z.string().min(1, "Date de fin de renonciation requise."),
    }),
    templateText: `${letterHeader}Objet : Renonciation à invoquer la prescription

Madame, Monsieur,

Concernant la créance suivante : [claimDescription],

Par la présente, je renonce à invoquer la prescription jusqu'au [waiverEndDate] inclus.

Cette renonciation ne constitue pas une reconnaissance de dette et n'emporte aucune reconnaissance de responsabilité de ma part.${letterClosing}`,
  },
  {
    id: 'LM-3.8',
    titleKey: 'ExecutionContrat.contestationInflation.title',
    descriptionKey: 'ExecutionContrat.contestationInflation.description',
    fields: z.object({
      companyName: z.string().min(1, "Nom de l'opérateur requis."),
      companyAddress: z.string().min(1, "Adresse de l'opérateur requise."),
      contractType: z.string().min(1, "Type de contrat requis."),
      priceIncrease: z.string().min(1, "Augmentation contestée requise."),
    }),
    templateText: `${letterHeader}Objet : Contestation de l'augmentation tarifaire

Madame, Monsieur,

J'ai pris connaissance de votre courrier m'informant d'une augmentation de [priceIncrease] de mon abonnement [contractType] en raison de l'inflation.

Je conteste cette augmentation. Une telle clause d'adaptation des prix doit être prévue de manière claire et précise dans le contrat, ce qui n'est pas le cas en l'espèce.

Je vous demande de maintenir le tarif initial prévu au contrat.${letterClosing}`,
  },
  {
    id: 'LM-3.9',
    titleKey: 'ExecutionContrat.bonsCadeaux.title',
    descriptionKey: 'ExecutionContrat.bonsCadeaux.description',
    fields: z.object({
      companyName: z.string().min(1, "Nom de l'entreprise requis."),
      companyAddress: z.string().min(1, "Adresse de l'entreprise requise."),
      voucherValue: z.string().min(1, "Valeur du bon requis."),
      expirationDate: z.string().min(1, "Date d'expiration requise."),
    }),
    templateText: `${letterHeader}Objet : Demande d'utilisation de bon cadeau

Madame, Monsieur,

Je suis en possession d'un bon cadeau d'une valeur de CHF [voucherValue], arrivé à échéance le [expirationDate].

Selon la jurisprudence du Tribunal fédéral, la créance incorporée dans un bon cadeau se prescrit par 10 ans. La date d'expiration mentionnée ne m'est donc pas opposable.

Je vous prie de bien vouloir honorer ce bon lors de mon prochain achat.${letterClosing}`,
  },
  {
    id: 'LM-3.10',
    titleKey: 'ExecutionContrat.remboursementAnnulationVol.title',
    descriptionKey: 'ExecutionContrat.remboursementAnnulationVol.description',
    fields: z.object({
      airline: z.string().min(1, "Nom de la compagnie aérienne requis."),
      airlineAddress: z.string().min(1, "Adresse de la compagnie requise."),
      flightNumber: z.string().min(1, "Numéro de vol requis."),
      flightDate: z.string().min(1, "Date du vol requise."),
      ticketPrice: z.string().min(1, "Prix du billet requis."),
      bookingReference: z.string().min(1, "Référence de réservation requise."),
    }),
    templateText: `${letterHeader}Objet : Demande de remboursement – Vol [flightNumber] annulé

Madame, Monsieur,

J'avais réservé le vol [flightNumber] du [flightDate] (réf. [bookingReference]). Ce vol a été annulé.

Conformément au Règlement européen 261/2004, je demande le remboursement intégral du prix de mon billet, soit CHF [ticketPrice], dans un délai de 7 jours.

Je me réserve également le droit de réclamer une indemnisation forfaitaire selon ce même règlement.${letterClosing}`,
  },
  {
    id: 'LM-3.11',
    titleKey: 'ExecutionContrat.remboursementFraisVol.title',
    descriptionKey: 'ExecutionContrat.remboursementFraisVol.description',
    fields: z.object({
      airline: z.string().min(1, "Nom de la compagnie aérienne requis."),
      airlineAddress: z.string().min(1, "Adresse de la compagnie requise."),
      flightNumber: z.string().min(1, "Numéro de vol requis."),
      flightDate: z.string().min(1, "Date du vol requis."),
      expensesDescription: z.string().min(10, "Description des frais requis."),
      totalAmount: z.string().min(1, "Montant total requis."),
    }),
    templateText: `${letterHeader}Objet : Remboursement des frais – Vol [flightNumber] annulé

Madame, Monsieur,

Suite à l'annulation du vol [flightNumber] du [flightDate], j'ai dû engager les frais suivants : [expensesDescription].

Conformément au Règlement européen 261/2004, je demande le remboursement de ces frais pour un montant total de CHF [totalAmount].

Je joins à la présente les justificatifs correspondants.${letterClosing}`,
  },
  {
    id: 'LM-3.12',
    titleKey: 'ExecutionContrat.indemnisationRetardVol.title',
    descriptionKey: 'ExecutionContrat.indemnisationRetardVol.description',
    fields: z.object({
      airline: z.string().min(1, "Nom de la compagnie aérienne requis."),
      airlineAddress: z.string().min(1, "Adresse de la compagnie requise."),
      flightNumber: z.string().min(1, "Numéro de vol requis."),
      flightDate: z.string().min(1, "Date du vol requis."),
      delayDuration: z.string().min(1, "Durée du retard requise."),
      flightDistance: z.enum(['moins de 1500 km', 'entre 1500 et 3500 km', 'plus de 3500 km']),
    }),
    templateText: `${letterHeader}Objet : Demande d'indemnisation – Retard vol [flightNumber]

Madame, Monsieur,

Le vol [flightNumber] du [flightDate] a subi un retard de [delayDuration] à l'arrivée.

Ce vol couvrait une distance de [flightDistance]. Conformément au Règlement européen 261/2004, j'ai droit à une indemnisation forfaitaire.

Je vous demande de procéder au paiement de cette indemnisation dans un délai de 14 jours.${letterClosing}`,
  },
  {
    id: 'LM-3.13',
    titleKey: 'ExecutionContrat.indemnisationBagages.title',
    descriptionKey: 'ExecutionContrat.indemnisationBagages.description',
    fields: z.object({
      airline: z.string().min(1, "Nom de la compagnie aérienne requis."),
      airlineAddress: z.string().min(1, "Adresse de la compagnie requise."),
      flightNumber: z.string().min(1, "Numéro de vol requis."),
      flightDate: z.string().min(1, "Date du vol requis."),
      pirNumber: z.string().min(1, "Numéro PIR requis."),
      issueType: z.enum(['perte', 'retard', 'dommage']),
      damageDescription: z.string().min(10, "Description du problème requise."),
      claimedAmount: z.string().min(1, "Montant réclamé requis."),
    }),
    templateText: `${letterHeader}Objet : Réclamation bagage – [issueType] – PIR [pirNumber]

Madame, Monsieur,

Lors de mon vol [flightNumber] du [flightDate], mon bagage a été [issueType].

Détail du problème : [damageDescription].

Conformément à la Convention de Montréal, je demande une indemnisation d'un montant de CHF [claimedAmount].

Je joins à la présente les justificatifs (déclaration PIR, factures, photos).${letterClosing}`,
  },
  {
    id: 'LM-3.14',
    titleKey: 'ExecutionContrat.contestationFacture.title',
    descriptionKey: 'ExecutionContrat.contestationFacture.description',
    fields: z.object({
      companyName: z.string().min(1, "Nom de l'entreprise requis."),
      companyAddress: z.string().min(1, "Adresse de l'entreprise requise."),
      invoiceNumber: z.string().min(1, "Numéro de facture requis."),
      invoiceDate: z.string().min(1, "Date de la facture requise."),
      contestationReason: z.string().min(10, "Motif de contestation requis."),
    }),
    templateText: `${letterHeader}Objet : Contestation de la facture n° [invoiceNumber]

Madame, Monsieur,

J'ai reçu votre facture n° [invoiceNumber] du [invoiceDate].

Je conteste cette facture pour les motifs suivants : [contestationReason].

Je vous prie de bien vouloir vérifier cette facture et m'envoyer une facture rectifiée ou les justificatifs correspondants.

En attendant, je suspends le paiement de cette facture.${letterClosing}`,
  },
  {
    id: 'LM-3.15',
    titleKey: 'ExecutionContrat.contestationFactureDevis.title',
    descriptionKey: 'ExecutionContrat.contestationFactureDevis.description',
    fields: z.object({
      companyName: z.string().min(1, "Nom de l'entreprise requis."),
      companyAddress: z.string().min(1, "Adresse de l'entreprise requise."),
      invoiceNumber: z.string().min(1, "Numéro de facture requis."),
      invoiceAmount: z.string().min(1, "Montant facturé requis."),
      quotedAmount: z.string().min(1, "Montant du devis requis."),
      quoteDate: z.string().min(1, "Date du devis requise."),
    }),
    templateText: `${letterHeader}Objet : Contestation facture n° [invoiceNumber] – Dépassement du devis

Madame, Monsieur,

J'ai reçu votre facture n° [invoiceNumber] d'un montant de CHF [invoiceAmount].

Or, le devis que j'ai accepté le [quoteDate] s'élevait à CHF [quotedAmount]. Vous ne m'avez pas informé d'un éventuel dépassement avant l'exécution des travaux, ni obtenu mon accord.

Je refuse de payer au-delà du montant convenu et vous adresse ce jour le règlement de CHF [quotedAmount].${letterClosing}`,
  },
  {
    id: 'LM-3.16',
    titleKey: 'ExecutionContrat.contestationFacturePrescrite.title',
    descriptionKey: 'ExecutionContrat.contestationFacturePrescrite.description',
    fields: z.object({
      companyName: z.string().min(1, "Nom de l'entreprise requis."),
      companyAddress: z.string().min(1, "Adresse de l'entreprise requise."),
      invoiceNumber: z.string().min(1, "Numéro de facture requis."),
      originalDate: z.string().min(1, "Date de la prestation originale requise."),
    }),
    templateText: `${letterHeader}Objet : Invocation de la prescription – Facture n° [invoiceNumber]

Madame, Monsieur,

J'ai reçu votre facture n° [invoiceNumber] relative à une prestation du [originalDate].

La créance correspondante est prescrite selon l'article 128 du Code des obligations, qui prévoit un délai de prescription de 5 ans pour les créances périodiques et certaines prestations de services.

J'invoque par la présente l'exception de prescription et refuse tout paiement.${letterClosing}`,
  },
];

// ============================================================================
// CATEGORY 4: RÉSILIATION (9 templates)
// ============================================================================
const resiliationTemplates: Template[] = [
  {
    id: 'LM-4.1',
    titleKey: 'Resiliation.contratEcheance.title',
    descriptionKey: 'Resiliation.contratEcheance.description',
    fields: z.object({
      companyName: z.string().min(1, "Nom de l'entreprise requis."),
      companyAddress: z.string().min(1, "Adresse de l'entreprise requise."),
      contractType: z.string().min(1, "Type de contrat requis."),
      contractNumber: z.string().min(1, "Numéro de contrat requis."),
      expiryDate: z.string().min(1, "Date d'échéance requise."),
    }),
    templateText: `${letterHeader}Objet : Résiliation du contrat n° [contractNumber]

Madame, Monsieur,

Par la présente, je vous informe de ma décision de résilier mon contrat [contractType] n° [contractNumber] pour son échéance du [expiryDate].

Je vous prie de bien vouloir me confirmer la résiliation par écrit et de cesser tout prélèvement à compter de cette date.${letterClosing}`,
  },
  {
    id: 'LM-4.2',
    titleKey: 'Resiliation.contratMandat.title',
    descriptionKey: 'Resiliation.contratMandat.description',
    fields: z.object({
      mandataryName: z.string().min(1, "Nom du mandataire requis."),
      mandataryAddress: z.string().min(1, "Adresse du mandataire requise."),
      mandateDescription: z.string().min(1, "Description du mandat requise."),
      mandateDate: z.string().min(1, "Date du mandat requise."),
    }),
    templateText: `${letterHeader}Objet : Résiliation de mandat

Madame, Monsieur,

Par la présente, je résilie avec effet immédiat le mandat que je vous ai confié le [mandateDate] concernant : [mandateDescription].

Conformément à l'article 404 du Code des obligations, le mandat peut être révoqué en tout temps.

Je vous prie de me restituer tous les documents en votre possession relatifs à ce mandat et de m'adresser votre note d'honoraires finale.${letterClosing}`,
  },
  {
    id: 'LM-4.3',
    titleKey: 'Resiliation.mandatInopportun.title',
    descriptionKey: 'Resiliation.mandatInopportun.description',
    fields: z.object({
      mandataryName: z.string().min(1, "Nom du mandataire requis."),
      mandataryAddress: z.string().min(1, "Adresse du mandataire requise."),
      mandateDescription: z.string().min(1, "Description du mandat requise."),
      reason: z.string().min(10, "Raison de la résiliation requise."),
    }),
    templateText: `${letterHeader}Objet : Résiliation de mandat

Madame, Monsieur,

Par la présente, je résilie avec effet immédiat le mandat concernant : [mandateDescription].

Je suis conscient que cette résiliation intervient en temps inopportun. Les raisons de cette décision sont les suivantes : [reason].

Je reste prêt à discuter d'une éventuelle indemnisation conformément à l'article 404 al. 2 du Code des obligations.

Je vous prie de me restituer tous les documents en votre possession.${letterClosing}`,
  },
  {
    id: 'LM-4.4',
    titleKey: 'Resiliation.petitCredit14Jours.title',
    descriptionKey: 'Resiliation.petitCredit14Jours.description',
    fields: z.object({
      creditCompany: z.string().min(1, "Nom de l'organisme de crédit requis."),
      creditAddress: z.string().min(1, "Adresse de l'organisme requise."),
      contractNumber: z.string().min(1, "Numéro de contrat requis."),
      contractDate: z.string().min(1, "Date du contrat requise."),
      creditAmount: z.string().min(1, "Montant du crédit requis."),
    }),
    templateText: `${letterHeader}Objet : Révocation du contrat de crédit n° [contractNumber]

Madame, Monsieur,

En date du [contractDate], j'ai signé un contrat de crédit n° [contractNumber] pour un montant de CHF [creditAmount].

Conformément à l'article 16 de la Loi fédérale sur le crédit à la consommation (LCC), je révoque par la présente ce contrat dans le délai légal de 14 jours.

Je vous restituerai le montant perçu dans les 30 jours suivant l'envoi de la présente.${letterClosing}`,
  },
  {
    id: 'LM-4.5',
    titleKey: 'Resiliation.leasing14Jours.title',
    descriptionKey: 'Resiliation.leasing14Jours.description',
    fields: z.object({
      leasingCompany: z.string().min(1, "Nom de la société de leasing requis."),
      leasingAddress: z.string().min(1, "Adresse de la société requise."),
      contractNumber: z.string().min(1, "Numéro de contrat requis."),
      contractDate: z.string().min(1, "Date du contrat requise."),
      objectDescription: z.string().min(1, "Objet du leasing requis."),
    }),
    templateText: `${letterHeader}Objet : Révocation du contrat de leasing n° [contractNumber]

Madame, Monsieur,

En date du [contractDate], j'ai signé un contrat de leasing n° [contractNumber] pour : [objectDescription].

Conformément à l'article 16 de la Loi fédérale sur le crédit à la consommation (LCC), je révoque par la présente ce contrat dans le délai légal de 14 jours.

Je me tiens à votre disposition pour la restitution de l'objet loué.${letterClosing}`,
  },
  {
    id: 'LM-4.6',
    titleKey: 'Resiliation.modificationContractuelle.title',
    descriptionKey: 'Resiliation.modificationContractuelle.description',
    fields: z.object({
      companyName: z.string().min(1, "Nom de l'entreprise requis."),
      companyAddress: z.string().min(1, "Adresse de l'entreprise requise."),
      contractType: z.string().min(1, "Type de contrat requis."),
      contractNumber: z.string().min(1, "Numéro de contrat requis."),
      modificationDescription: z.string().min(10, "Description de la modification requise."),
    }),
    templateText: `${letterHeader}Objet : Résiliation suite à modification contractuelle

Madame, Monsieur,

J'ai reçu votre courrier m'informant de la modification suivante de mon contrat [contractType] n° [contractNumber] : [modificationDescription].

Cette modification constitue un changement substantiel des conditions initiales. Conformément aux conditions générales et à la jurisprudence, je fais usage de mon droit de résiliation extraordinaire.

Je résilie par la présente mon contrat avec effet immédiat.${letterClosing}`,
  },
  {
    id: 'LM-4.7',
    titleKey: 'Resiliation.carteCredit.title',
    descriptionKey: 'Resiliation.carteCredit.description',
    fields: z.object({
      cardIssuer: z.string().min(1, "Nom de l'émetteur requis."),
      cardIssuerAddress: z.string().min(1, "Adresse de l'émetteur requise."),
      cardNumber: z.string().min(1, "4 derniers chiffres de la carte requis."),
      accountNumber: z.string().optional(),
    }),
    templateText: `${letterHeader}Objet : Résiliation de ma carte de crédit

Madame, Monsieur,

Par la présente, je résilie ma carte de crédit se terminant par [cardNumber].

Je vous prie de bien vouloir :
- Confirmer la résiliation par écrit
- M'indiquer le solde final à régler
- Cesser tout frais d'abonnement

Je procéderai à la destruction de la carte dès réception de votre confirmation.${letterClosing}`,
  },
  {
    id: 'LM-4.8',
    titleKey: 'Resiliation.assuranceApresSinistre.title',
    descriptionKey: 'Resiliation.assuranceApresSinistre.description',
    fields: z.object({
      insurer: z.string().min(1, "Nom de l'assureur requis."),
      insurerAddress: z.string().min(1, "Adresse de l'assureur requise."),
      policyNumber: z.string().min(1, "Numéro de police requis."),
      claimNumber: z.string().min(1, "Numéro du sinistre requis."),
      claimDate: z.string().min(1, "Date du sinistre requise."),
    }),
    templateText: `${letterHeader}Objet : Résiliation du contrat d'assurance – Police n° [policyNumber]

Madame, Monsieur,

Suite au sinistre n° [claimNumber] survenu le [claimDate], je fais usage de mon droit de résiliation extraordinaire prévu à l'article 42 de la Loi sur le contrat d'assurance (LCA).

Je résilie par la présente le contrat d'assurance n° [policyNumber] avec effet dans les 14 jours suivant la réception de ce courrier.

Je vous prie de me confirmer cette résiliation et de me rembourser le prorata de prime non utilisé.${letterClosing}`,
  },
  {
    id: 'LM-4.9',
    titleKey: 'Resiliation.fitnessJustesMotifs.title',
    descriptionKey: 'Resiliation.fitnessJustesMotifs.description',
    fields: z.object({
      gymName: z.string().min(1, "Nom du fitness requis."),
      gymAddress: z.string().min(1, "Adresse du fitness requise."),
      contractNumber: z.string().min(1, "Numéro de contrat requis."),
      contractDate: z.string().min(1, "Date du contrat requis."),
      reason: z.string().min(10, "Raison de la résiliation requise."),
      justificationDocument: z.string().min(1, "Document justificatif requis."),
    }),
    templateText: `${letterHeader}Objet : Résiliation pour justes motifs de mon contrat de fitness n° [contractNumber]

Madame, Monsieur,

En date du [contractDate], je suis devenu membre de votre établissement.

Il ne m'est toutefois plus possible, pour des raisons de [reason], de continuer à fréquenter votre centre.

Je joins à la présente [justificationDocument] et résilie le contrat pour justes motifs en application des articles 266g et suivants du Code des obligations et de la jurisprudence du Tribunal fédéral.

Je vous prie de confirmer la résiliation et de cesser tout prélèvement.${letterClosing}`,
  },
];

// ============================================================================
// CATEGORY 5: ANNULATION (5 templates)
// ============================================================================
const annulationTemplates: Template[] = [
  {
    id: 'LM-5.1',
    titleKey: 'Annulation.erreurEssentielle.title',
    descriptionKey: 'Annulation.erreurEssentielle.description',
    fields: z.object({
      companyName: z.string().min(1, "Nom de l'entreprise requis."),
      companyAddress: z.string().min(1, "Adresse de l'entreprise requise."),
      contractDescription: z.string().min(1, "Description du contrat requise."),
      contractDate: z.string().min(1, "Date du contrat requise."),
      errorDescription: z.string().min(10, "Description de l'erreur/tromperie requise."),
    }),
    templateText: `${letterHeader}Objet : Annulation du contrat pour erreur essentielle / dol

Madame, Monsieur,

En date du [contractDate], j'ai conclu avec vous le contrat suivant : [contractDescription].

J'ai découvert que ce contrat a été conclu sur la base de : [errorDescription].

Conformément aux articles 23 à 28 du Code des obligations, je déclare par la présente l'annulation de ce contrat pour erreur essentielle / dol.

Je vous demande la restitution de toutes les prestations effectuées.${letterClosing}`,
  },
  {
    id: 'LM-5.2',
    titleKey: 'Annulation.demandeRemboursement.title',
    descriptionKey: 'Annulation.demandeRemboursement.description',
    fields: z.object({
      companyName: z.string().min(1, "Nom de l'entreprise requis."),
      companyAddress: z.string().min(1, "Adresse de l'entreprise requise."),
      contractDescription: z.string().min(1, "Description du contrat requise."),
      contractDate: z.string().min(1, "Date du contrat requise."),
      errorDescription: z.string().min(10, "Description de l'erreur requise."),
      amountPaid: z.string().min(1, "Montant payé requis."),
    }),
    templateText: `${letterHeader}Objet : Annulation du contrat et demande de remboursement

Madame, Monsieur,

En date du [contractDate], j'ai conclu avec vous : [contractDescription], et vous ai versé la somme de CHF [amountPaid].

Ce contrat a été conclu sur la base de : [errorDescription].

Conformément aux articles 23 à 28 du Code des obligations, je déclare par la présente l'annulation de ce contrat et vous demande le remboursement de CHF [amountPaid] dans un délai de 10 jours.${letterClosing}`,
  },
  {
    id: 'LM-5.3',
    titleKey: 'Annulation.contestationObligo.title',
    descriptionKey: 'Annulation.contestationObligo.description',
    fields: z.object({
      creditorName: z.string().min(1, "Nom du créancier requis."),
      creditorAddress: z.string().min(1, "Adresse du créancier requise."),
      obligoDate: z.string().min(1, "Date de l'accord Obligo requise."),
      circumstances: z.string().min(10, "Circonstances de la signature requises."),
    }),
    templateText: `${letterHeader}Objet : Contestation de l'accord Obligo du [obligoDate]

Madame, Monsieur,

En date du [obligoDate], j'ai signé un accord Obligo (reconnaissance de dette avec renonciation à l'opposition).

Cet accord a été obtenu dans les circonstances suivantes : [circumstances].

Je conteste la validité de cet accord car il a été obtenu par des moyens contraires aux règles de la bonne foi. Je vous demande de renoncer à toute poursuite basée sur ce document.${letterClosing}`,
  },
  {
    id: 'LM-5.4',
    titleKey: 'Annulation.assuranceNonSouhaitee.title',
    descriptionKey: 'Annulation.assuranceNonSouhaitee.description',
    fields: z.object({
      insurer: z.string().min(1, "Nom de l'assureur requis."),
      insurerAddress: z.string().min(1, "Adresse de l'assureur requise."),
      productName: z.string().min(1, "Nom du produit requis."),
      policyNumber: z.string().min(1, "Numéro de police requis."),
      subscriptionDate: z.string().min(1, "Date de souscription requise."),
      circumstances: z.string().min(10, "Circonstances de la souscription requises."),
    }),
    templateText: `${letterHeader}Objet : Annulation / Résiliation – [productName] – Police n° [policyNumber]

Madame, Monsieur,

En date du [subscriptionDate], le produit d'assurance [productName] (police n° [policyNumber]) a été souscrit à mon nom.

Les circonstances de cette souscription sont les suivantes : [circumstances].

Je n'ai jamais eu l'intention de souscrire ce produit et conteste la validité de ce contrat. Je demande son annulation immédiate et le remboursement de toutes les primes prélevées.${letterClosing}`,
  },
  {
    id: 'LM-5.5',
    titleKey: 'Annulation.fauxConcours.title',
    descriptionKey: 'Annulation.fauxConcours.description',
    fields: z.object({
      companyName: z.string().min(1, "Nom de l'entreprise requis."),
      companyAddress: z.string().min(1, "Adresse de l'entreprise requise."),
      subscriptionDate: z.string().min(1, "Date de souscription requise."),
      circumstances: z.string().min(10, "Circonstances de la souscription requises."),
    }),
    templateText: `${letterHeader}Objet : Annulation d'abonnement – Concours trompeur

Madame, Monsieur,

En date du [subscriptionDate], j'ai participé à ce que je croyais être un concours. Il s'avère qu'il s'agissait en réalité d'un abonnement payant.

Les circonstances étaient les suivantes : [circumstances].

Ce procédé constitue une pratique commerciale déloyale au sens de la LCD. Je déclare par la présente l'annulation de ce prétendu contrat et refuse tout paiement.${letterClosing}`,
  },
];

// ============================================================================
// CATEGORY 6: TRANSPORT AÉRIEN (4 templates)
// ============================================================================
const transportAerienTemplates: Template[] = [
  {
    id: 'LM-6.1',
    titleKey: 'TransportAerien.remboursementAnnulation.title',
    descriptionKey: 'TransportAerien.remboursementAnnulation.description',
    fields: z.object({
      airline: z.string().min(1, "Compagnie aérienne requise."),
      airlineAddress: z.string().min(1, "Adresse de la compagnie requise."),
      flightNumber: z.string().min(1, "Numéro de vol requis."),
      flightDate: z.string().min(1, "Date du vol requise."),
      bookingReference: z.string().min(1, "Référence de réservation requise."),
      ticketPrice: z.string().min(1, "Prix du billet requis."),
    }),
    templateText: `${letterHeader}Objet : Demande de remboursement – Vol [flightNumber] annulé

Madame, Monsieur,

J'avais réservé le vol [flightNumber] du [flightDate] (réf. [bookingReference]) qui a été annulé.

Conformément au Règlement européen 261/2004, je demande le remboursement intégral du prix du billet, soit CHF [ticketPrice], dans un délai de 7 jours.${letterClosing}`,
  },
  {
    id: 'LM-6.2',
    titleKey: 'TransportAerien.remboursementFrais.title',
    descriptionKey: 'TransportAerien.remboursementFrais.description',
    fields: z.object({
      airline: z.string().min(1, "Compagnie aérienne requise."),
      airlineAddress: z.string().min(1, "Adresse de la compagnie requise."),
      flightNumber: z.string().min(1, "Numéro de vol requis."),
      flightDate: z.string().min(1, "Date du vol requis."),
      expensesDescription: z.string().min(10, "Description des frais requis."),
      totalAmount: z.string().min(1, "Montant total requis."),
    }),
    templateText: `${letterHeader}Objet : Remboursement des frais – Vol [flightNumber] annulé

Madame, Monsieur,

Suite à l'annulation du vol [flightNumber] du [flightDate], j'ai engagé les frais suivants : [expensesDescription].

Je demande le remboursement de ces frais s'élevant à CHF [totalAmount]. Je joins les justificatifs correspondants.${letterClosing}`,
  },
  {
    id: 'LM-6.3',
    titleKey: 'TransportAerien.indemnisationRetard.title',
    descriptionKey: 'TransportAerien.indemnisationRetard.description',
    fields: z.object({
      airline: z.string().min(1, "Compagnie aérienne requise."),
      airlineAddress: z.string().min(1, "Adresse de la compagnie requise."),
      flightNumber: z.string().min(1, "Numéro de vol requis."),
      flightDate: z.string().min(1, "Date du vol requis."),
      delayDuration: z.string().min(1, "Durée du retard requise."),
      departureCity: z.string().min(1, "Ville de départ requise."),
      arrivalCity: z.string().min(1, "Ville d'arrivée requise."),
    }),
    templateText: `${letterHeader}Objet : Demande d'indemnisation – Retard vol [flightNumber]

Madame, Monsieur,

Le vol [flightNumber] du [flightDate] de [departureCity] à [arrivalCity] a subi un retard de [delayDuration] à l'arrivée.

Conformément au Règlement européen 261/2004, ce retard me donne droit à une indemnisation forfaitaire.

Je vous demande de procéder au versement de cette indemnisation dans les 14 jours.${letterClosing}`,
  },
  {
    id: 'LM-6.4',
    titleKey: 'TransportAerien.indemnisationBagages.title',
    descriptionKey: 'TransportAerien.indemnisationBagages.description',
    fields: z.object({
      airline: z.string().min(1, "Compagnie aérienne requise."),
      airlineAddress: z.string().min(1, "Adresse de la compagnie requise."),
      flightNumber: z.string().min(1, "Numéro de vol requis."),
      flightDate: z.string().min(1, "Date du vol requis."),
      pirNumber: z.string().min(1, "Numéro PIR requis."),
      issueType: z.enum(['perte', 'retard', 'dommage']),
      claimedAmount: z.string().min(1, "Montant réclamé requis."),
      itemsList: z.string().min(10, "Liste des objets requise."),
    }),
    templateText: `${letterHeader}Objet : Réclamation bagage – [issueType] – PIR [pirNumber]

Madame, Monsieur,

Lors du vol [flightNumber] du [flightDate], mon bagage a été [issueType].

J'ai effectué une déclaration à l'arrivée (PIR n° [pirNumber]).

Contenu du bagage : [itemsList].

Conformément à la Convention de Montréal, je demande une indemnisation de CHF [claimedAmount]. Je joins les justificatifs.${letterClosing}`,
  },
];

// ============================================================================
// CATEGORY 7: RECOUVREMENT (2 templates)
// ============================================================================
const recouvrementTemplates: Template[] = [
  {
    id: 'LM-7.1',
    titleKey: 'Recouvrement.contestationFrais.title',
    descriptionKey: 'Recouvrement.contestationFrais.description',
    fields: z.object({
      companyName: z.string().min(1, "Nom de l'entreprise/société de recouvrement requis."),
      companyAddress: z.string().min(1, "Adresse requise."),
      invoiceNumber: z.string().min(1, "Numéro de facture originale requis."),
      contestedFees: z.string().min(1, "Montant des frais contestés requis."),
      reason: z.string().min(10, "Motif de contestation requis."),
    }),
    templateText: `${letterHeader}Objet : Contestation des frais de recouvrement

Madame, Monsieur,

J'ai reçu votre courrier relatif à la facture n° [invoiceNumber], incluant des frais de recouvrement de CHF [contestedFees].

Je conteste ces frais pour les motifs suivants : [reason].

Des frais de rappel ou de recouvrement ne peuvent être facturés que s'ils sont prévus contractuellement et reflètent des coûts réels. Tel n'est pas le cas en l'espèce.

Je vous demande d'annuler ces frais et de me confirmer le montant exact dû.${letterClosing}`,
  },
  {
    id: 'LM-7.2',
    titleKey: 'Recouvrement.confirmationContestation.title',
    descriptionKey: 'Recouvrement.confirmationContestation.description',
    fields: z.object({
      companyName: z.string().min(1, "Nom de l'entreprise requis."),
      companyAddress: z.string().min(1, "Adresse requise."),
      originalLetterDate: z.string().min(1, "Date de votre premier courrier requise."),
      invoiceNumber: z.string().min(1, "Numéro de facture requis."),
    }),
    templateText: `${letterHeader}Objet : Confirmation de ma contestation – Facture n° [invoiceNumber]

Madame, Monsieur,

Par courrier du [originalLetterDate], j'ai contesté les frais relatifs à la facture n° [invoiceNumber].

Je n'ai pas reçu de réponse de votre part. Je confirme par la présente ma contestation et maintiens que ces frais sont injustifiés.

Sans réponse de votre part dans les 10 jours, je considérerai l'affaire comme classée.${letterClosing}`,
  },
];

// ============================================================================
// CATEGORY 8: POURSUITES (5 templates)
// ============================================================================
const poursuitesTemplates: Template[] = [
  {
    id: 'LM-8.1',
    titleKey: 'Poursuites.opposition.title',
    descriptionKey: 'Poursuites.opposition.description',
    fields: z.object({
      pursuitOffice: z.string().min(1, "Office des poursuites requis."),
      pursuitOfficeAddress: z.string().min(1, "Adresse de l'office requise."),
      pursuitNumber: z.string().min(1, "Numéro de poursuite requis."),
      creditorName: z.string().min(1, "Nom du créancier requis."),
    }),
    templateText: `${letterHeader}Objet : Opposition au commandement de payer – Poursuite n° [pursuitNumber]

Madame, Monsieur,

J'ai reçu le commandement de payer relatif à la poursuite n° [pursuitNumber] introduite par [creditorName].

Par la présente, je forme OPPOSITION TOTALE à ce commandement de payer.

Je vous prie de bien vouloir prendre note de cette opposition.${letterClosing}`,
  },
  {
    id: 'LM-8.2',
    titleKey: 'Poursuites.oppositionFrais.title',
    descriptionKey: 'Poursuites.oppositionFrais.description',
    fields: z.object({
      pursuitOffice: z.string().min(1, "Office des poursuites requis."),
      pursuitOfficeAddress: z.string().min(1, "Adresse de l'office requise."),
      pursuitNumber: z.string().min(1, "Numéro de poursuite requis."),
      contestedFees: z.string().min(1, "Frais contestés requis."),
      reason: z.string().min(10, "Motif de contestation requis."),
    }),
    templateText: `${letterHeader}Objet : Contestation des frais – Poursuite n° [pursuitNumber]

Madame, Monsieur,

Concernant la poursuite n° [pursuitNumber], je conteste les frais de CHF [contestedFees] pour les motifs suivants : [reason].

Je vous demande de vérifier ces frais et de me communiquer leur justification légale.${letterClosing}`,
  },
  {
    id: 'LM-8.3',
    titleKey: 'Poursuites.demandeRadiation.title',
    descriptionKey: 'Poursuites.demandeRadiation.description',
    fields: z.object({
      pursuitOffice: z.string().min(1, "Office des poursuites requis."),
      pursuitOfficeAddress: z.string().min(1, "Adresse de l'office requise."),
      pursuitNumber: z.string().min(1, "Numéro de poursuite requis."),
      paymentDate: z.string().min(1, "Date de paiement requise."),
    }),
    templateText: `${letterHeader}Objet : Demande de radiation – Poursuite n° [pursuitNumber]

Madame, Monsieur,

J'ai procédé au paiement intégral de la poursuite n° [pursuitNumber] en date du [paymentDate].

Conformément à l'article 8a LP, je demande la radiation de cette poursuite de mon extrait du registre.

Je joins à la présente la preuve de paiement.${letterClosing}`,
  },
  {
    id: 'LM-8.4',
    titleKey: 'Poursuites.conventionRadiation.title',
    descriptionKey: 'Poursuites.conventionRadiation.description',
    fields: z.object({
      creditorName: z.string().min(1, "Nom du créancier requis."),
      creditorAddress: z.string().min(1, "Adresse du créancier requise."),
      pursuitNumber: z.string().min(1, "Numéro de poursuite requis."),
      proposedAmount: z.string().min(1, "Montant proposé requis."),
      paymentDate: z.string().min(1, "Date de paiement proposée requise."),
    }),
    templateText: `${letterHeader}Objet : Proposition de règlement – Poursuite n° [pursuitNumber]

Madame, Monsieur,

Concernant la poursuite n° [pursuitNumber], je vous propose le règlement suivant :

- Paiement de CHF [proposedAmount] au [paymentDate]
- En contrepartie, vous vous engagez à demander la radiation de la poursuite

Cette proposition est valable 10 jours. En cas d'accord, je vous remercie de me retourner une copie signée de la présente.${letterClosing}`,
  },
  {
    id: 'LM-8.5',
    titleKey: 'Poursuites.demandeRachatDette.title',
    descriptionKey: 'Poursuites.demandeRachatDette.description',
    fields: z.object({
      associationName: z.string().min(1, "Nom de l'association requis."),
      associationAddress: z.string().min(1, "Adresse de l'association requise."),
      totalDebtAmount: z.string().min(1, "Montant total de la dette requis."),
      creditorsList: z.string().min(1, "Liste des créanciers requise."),
      monthlyIncome: z.string().min(1, "Revenu mensuel requis."),
      monthlyExpenses: z.string().min(1, "Charges mensuelles requises."),
    }),
    templateText: `${letterHeader}Objet : Demande de rachat de dette

Madame, Monsieur,

Je me permets de solliciter votre aide pour le rachat de ma dette.

Ma situation est la suivante :
- Dette totale : CHF [totalDebtAmount]
- Créanciers : [creditorsList]
- Revenu mensuel : CHF [monthlyIncome]
- Charges mensuelles : CHF [monthlyExpenses]

Je souhaiterais pouvoir rembourser ma dette de manière échelonnée et bénéficier de votre accompagnement.

Je vous remercie de l'attention que vous porterez à ma demande.${letterClosing}`,
  },
];

// ============================================================================
// CATEGORY 9: DÉMARCHAGE (2 templates)
// ============================================================================
const demarchageTemplates: Template[] = [
  {
    id: 'LM-9.1',
    titleKey: 'Demarchage.revocation14Jours.title',
    descriptionKey: 'Demarchage.revocation14Jours.description',
    fields: z.object({
      companyName: z.string().min(1, "Nom de l'entreprise requis."),
      companyAddress: z.string().min(1, "Adresse de l'entreprise requise."),
      contractDate: z.string().min(1, "Date du contrat requise."),
      contractDescription: z.string().min(1, "Description du contrat requise."),
    }),
    templateText: `${letterHeader}Objet : Révocation de contrat – Démarchage à domicile / téléphonique

Madame, Monsieur,

En date du [contractDate], j'ai conclu avec votre représentant un contrat portant sur : [contractDescription].

Ce contrat ayant été conclu par démarchage, je fais usage de mon droit de révocation prévu aux articles 40a et suivants du Code des obligations.

Je révoque par la présente ce contrat dans le délai légal de 14 jours.

Je vous demande de confirmer cette révocation par écrit.${letterClosing}`,
  },
  {
    id: 'LM-9.2',
    titleKey: 'Demarchage.revocationDelaiNonMentionne.title',
    descriptionKey: 'Demarchage.revocationDelaiNonMentionne.description',
    fields: z.object({
      companyName: z.string().min(1, "Nom de l'entreprise requis."),
      companyAddress: z.string().min(1, "Adresse de l'entreprise requise."),
      contractDate: z.string().min(1, "Date du contrat requise."),
      contractDescription: z.string().min(1, "Description du contrat requise."),
    }),
    templateText: `${letterHeader}Objet : Révocation de contrat – Absence d'information sur le droit de révocation

Madame, Monsieur,

En date du [contractDate], j'ai conclu un contrat portant sur : [contractDescription].

Je constate que je n'ai pas été informé(e) de mon droit de révocation comme l'exige l'article 40e du Code des obligations.

En l'absence de cette information, le délai de révocation de 14 jours n'a jamais commencé à courir. Je révoque par la présente ce contrat avec effet immédiat.${letterClosing}`,
  },
];

// ============================================================================
// CATEGORY 10: ENVOI NON COMMANDÉ (2 templates)
// ============================================================================
const envoiNonCommandeTemplates: Template[] = [
  {
    id: 'LM-10.1',
    titleKey: 'EnvoiNonCommande.refus.title',
    descriptionKey: 'EnvoiNonCommande.refus.description',
    fields: z.object({
      companyName: z.string().min(1, "Nom de l'entreprise requis."),
      companyAddress: z.string().min(1, "Adresse de l'entreprise requise."),
      itemReceived: z.string().min(1, "Article reçu requis."),
      receiptDate: z.string().min(1, "Date de réception requise."),
    }),
    templateText: `${letterHeader}Objet : Refus de paiement – Envoi non commandé

Madame, Monsieur,

J'ai reçu le [receiptDate] l'article suivant : [itemReceived].

Je n'ai jamais commandé cet article. Conformément à l'article 6a de la Loi contre la concurrence déloyale (LCD), l'envoi non commandé de marchandises constitue une prestation non commandée qui ne m'oblige à aucun paiement.

Je refuse tout paiement. L'article reste à votre disposition pendant 30 jours pour récupération à vos frais.${letterClosing}`,
  },
  {
    id: 'LM-10.2',
    titleKey: 'EnvoiNonCommande.annulationPresumee.title',
    descriptionKey: 'EnvoiNonCommande.annulationPresumee.description',
    fields: z.object({
      companyName: z.string().min(1, "Nom de l'entreprise requis."),
      companyAddress: z.string().min(1, "Adresse de l'entreprise requise."),
      orderNumber: z.string().optional(),
      itemReceived: z.string().min(1, "Article reçu requis."),
    }),
    templateText: `${letterHeader}Objet : Contestation de commande et refus de paiement

Madame, Monsieur,

J'ai reçu un colis contenant : [itemReceived], accompagné d'une facture.

Je conteste formellement avoir passé cette commande. Aucun contrat n'a été conclu entre nous.

Conformément à l'article 6a LCD, je ne suis tenu à aucun paiement pour des envois non commandés. Je refuse tout paiement et vous demande de ne plus m'importuner.${letterClosing}`,
  },
];

// ============================================================================
// CATEGORY 11: ARNAQUE (2 templates)
// ============================================================================
const arnaqueTemplates: Template[] = [
  {
    id: 'LM-11.1',
    titleKey: 'Arnaque.contestationSMS.title',
    descriptionKey: 'Arnaque.contestationSMS.description',
    fields: z.object({
      telecomProvider: z.string().min(1, "Nom de l'opérateur requis."),
      telecomAddress: z.string().min(1, "Adresse de l'opérateur requise."),
      premiumNumber: z.string().min(1, "Numéro surtaxé requis."),
      chargedAmount: z.string().min(1, "Montant facturé requis."),
      invoiceDate: z.string().min(1, "Date de la facture requise."),
    }),
    templateText: `${letterHeader}Objet : Contestation de frais – SMS surtaxés

Madame, Monsieur,

Sur ma facture du [invoiceDate], je constate des frais de CHF [chargedAmount] pour des SMS vers/depuis le numéro [premiumNumber].

Je n'ai jamais demandé ce service et n'ai jamais consenti à ces frais. Ces pratiques constituent une arnaque au sens de la LCD.

Je refuse le paiement de ces frais et vous demande de bloquer tout numéro surtaxé sur ma ligne.${letterClosing}`,
  },
  {
    id: 'LM-11.2',
    titleKey: 'Arnaque.annulationAnnuaire.title',
    descriptionKey: 'Arnaque.annulationAnnuaire.description',
    fields: z.object({
      companyName: z.string().min(1, "Nom de l'éditeur d'annuaire requis."),
      companyAddress: z.string().min(1, "Adresse de l'éditeur requise."),
      invoiceAmount: z.string().min(1, "Montant facturé requis."),
      circumstances: z.string().min(10, "Circonstances de l'inscription requises."),
    }),
    templateText: `${letterHeader}Objet : Contestation d'inscription annuaire

Madame, Monsieur,

J'ai reçu une facture de CHF [invoiceAmount] pour une prétendue inscription dans votre annuaire.

Les circonstances de cette "inscription" sont les suivantes : [circumstances].

Ce procédé constitue une pratique commerciale déloyale. Je conteste toute obligation de paiement et vous mets en demeure de cesser toute relance.${letterClosing}`,
  },
];

// ============================================================================
// CATEGORY 12: PROTECTION DES DONNÉES (3 templates)
// ============================================================================
const protectionDonneesTemplates: Template[] = [
  {
    id: 'LM-12.1',
    titleKey: 'ProtectionDonnees.rectification.title',
    descriptionKey: 'ProtectionDonnees.rectification.description',
    fields: z.object({
      companyName: z.string().min(1, "Nom de l'entreprise requis."),
      companyAddress: z.string().min(1, "Adresse de l'entreprise requise."),
      incorrectData: z.string().min(1, "Données incorrectes requises."),
      correctData: z.string().min(1, "Données correctes requises."),
    }),
    templateText: `${letterHeader}Objet : Demande de rectification de données personnelles

Madame, Monsieur,

Conformément à la Loi fédérale sur la protection des données (LPD), je vous demande de rectifier les données suivantes me concernant :

Données incorrectes : [incorrectData]
Données correctes : [correctData]

Je vous prie de procéder à cette rectification dans un délai de 30 jours et de m'en confirmer l'exécution.${letterClosing}`,
  },
  {
    id: 'LM-12.2',
    titleKey: 'ProtectionDonnees.acces.title',
    descriptionKey: 'ProtectionDonnees.acces.description',
    fields: z.object({
      companyName: z.string().min(1, "Nom de l'entreprise requis."),
      companyAddress: z.string().min(1, "Adresse de l'entreprise requise."),
    }),
    templateText: `${letterHeader}Objet : Demande d'accès à mes données personnelles

Madame, Monsieur,

Conformément à l'article 25 de la Loi fédérale sur la protection des données (LPD), je vous demande de me communiquer l'ensemble des données personnelles me concernant que vous détenez, notamment :

- Les catégories de données traitées
- La finalité du traitement
- Les destinataires des données
- L'origine des données

Je vous prie de me répondre dans le délai légal de 30 jours.${letterClosing}`,
  },
  {
    id: 'LM-12.3',
    titleKey: 'ProtectionDonnees.effacement.title',
    descriptionKey: 'ProtectionDonnees.effacement.description',
    fields: z.object({
      companyName: z.string().min(1, "Nom de l'entreprise requis."),
      companyAddress: z.string().min(1, "Adresse de l'entreprise requise."),
      dataToDelete: z.string().min(1, "Données à supprimer requises."),
      reason: z.string().min(10, "Motif de la demande requis."),
    }),
    templateText: `${letterHeader}Objet : Demande de suppression de données personnelles

Madame, Monsieur,

Conformément à l'article 32 de la Loi fédérale sur la protection des données (LPD), je vous demande la suppression des données suivantes me concernant : [dataToDelete].

Cette demande est motivée par : [reason].

Je vous prie de procéder à cet effacement dans un délai de 30 jours et de m'en confirmer l'exécution.${letterClosing}`,
  },
];

// ============================================================================
// CATEGORY 13: BAIL (6 templates)
// ============================================================================
const bailTemplates: Template[] = [
  {
    id: 'LM-13.01',
    titleKey: 'Bail.resiliationOrdinaire.title',
    descriptionKey: 'Bail.resiliationOrdinaire.description',
    fields: z.object({
      landlordName: z.string().min(1, "Nom du bailleur requis."),
      landlordAddress: z.string().min(1, "Adresse du bailleur requise."),
      propertyAddress: z.string().min(1, "Adresse du bien loué requise."),
      leaseReference: z.string().optional(),
      leaseStartDate: z.string().min(1, "Date d'entrée en vigueur du bail requise."),
      terminationDate: z.string().min(1, "Date de résiliation souhaitée requise."),
    }),
    templateText: `${letterHeader}Objet : Résiliation du bail

Madame, Monsieur,

Je vous informe par la présente de ma décision de résilier mon contrat de bail pour l'appartement situé [propertyAddress], en vigueur depuis le [leaseStartDate], à sa prochaine échéance du [terminationDate].

Je vous remercie de bien vouloir m'adresser une confirmation de ma résiliation. Veuillez également me communiquer la date de l'état des lieux de sortie.${letterClosing}`,
  },
  {
    id: 'LM-13.02',
    titleKey: 'Bail.resiliationAnticipee.title',
    descriptionKey: 'Bail.resiliationAnticipee.description',
    fields: z.object({
      landlordName: z.string().min(1, "Nom du bailleur requis."),
      landlordAddress: z.string().min(1, "Adresse du bailleur requise."),
      propertyAddress: z.string().min(1, "Adresse du bien loué requise."),
      desiredTerminationDate: z.string().min(1, "Date de départ souhaitée requise."),
      newTenantName: z.string().min(1, "Nom du candidat locataire requis."),
      newTenantContact: z.string().min(1, "Coordonnées du candidat requises."),
    }),
    templateText: `${letterHeader}Objet : Résiliation anticipée du bail – Proposition de locataire de remplacement

Madame, Monsieur,

Je souhaite résilier mon bail pour l'appartement situé [propertyAddress] de manière anticipée, au [desiredTerminationDate].

Conformément à l'article 264 du Code des obligations, je vous propose le candidat de remplacement suivant :
- Nom : [newTenantName]
- Contact : [newTenantContact]

Ce candidat est solvable et disposé à reprendre le bail aux mêmes conditions. Je vous prie d'examiner sa candidature et de me libérer de mes obligations locatives.${letterClosing}`,
  },
  {
    id: 'LM-13.03',
    titleKey: 'Bail.contestationFrais.title',
    descriptionKey: 'Bail.contestationFrais.description',
    fields: z.object({
      landlordName: z.string().min(1, "Nom du bailleur requis."),
      landlordAddress: z.string().min(1, "Adresse du bailleur requise."),
      propertyAddress: z.string().min(1, "Adresse du bien loué requise."),
      chargedAmount: z.string().min(1, "Montant facturé requis."),
      contestationReason: z.string().min(10, "Motif de contestation requis."),
    }),
    templateText: `${letterHeader}Objet : Contestation des frais de résiliation anticipée

Madame, Monsieur,

Suite à mon départ de l'appartement [propertyAddress], vous me réclamez la somme de CHF [chargedAmount].

Je conteste ce montant pour les motifs suivants : [contestationReason].

Conformément à l'article 264 CO, seul le dommage réellement subi peut être facturé au locataire. Je vous demande de justifier ces frais ou d'y renoncer.${letterClosing}`,
  },
  {
    id: 'LM-13.04',
    titleKey: 'Bail.demandeBaisseLoyer.title',
    descriptionKey: 'Bail.demandeBaisseLoyer.description',
    fields: z.object({
      landlordName: z.string().min(1, "Nom du bailleur requis."),
      landlordAddress: z.string().min(1, "Adresse du bailleur requise."),
      propertyAddress: z.string().min(1, "Adresse du bien loué requise."),
      currentRent: z.string().min(1, "Loyer actuel requis."),
      requestedRent: z.string().min(1, "Loyer demandé requis."),
      justification: z.string().min(10, "Justification requise."),
    }),
    templateText: `${letterHeader}Objet : Demande de baisse du loyer

Madame, Monsieur,

Je suis locataire de l'appartement situé [propertyAddress] et paie actuellement un loyer mensuel de CHF [currentRent].

Compte tenu de [justification], notamment la baisse du taux hypothécaire de référence, je vous demande de réduire mon loyer à CHF [requestedRent].

Conformément à l'article 270a CO, je vous prie de me répondre dans un délai de 30 jours.${letterClosing}`,
  },
  {
    id: 'LM-13.05',
    titleKey: 'Bail.contestationHausseLoyer.title',
    descriptionKey: 'Bail.contestationHausseLoyer.description',
    fields: z.object({
      landlordName: z.string().min(1, "Nom du bailleur requis."),
      landlordAddress: z.string().min(1, "Adresse du bailleur requise."),
      propertyAddress: z.string().min(1, "Adresse du bien loué requise."),
      notificationDate: z.string().min(1, "Date de notification de la hausse requise."),
      proposedIncrease: z.string().min(1, "Augmentation proposée requise."),
      contestationReason: z.string().min(10, "Motif de contestation requis."),
    }),
    templateText: `${letterHeader}Objet : Contestation de la hausse de loyer

Madame, Monsieur,

Par notification du [notificationDate], vous m'avez annoncé une augmentation de loyer de CHF [proposedIncrease] pour l'appartement situé [propertyAddress].

Je conteste cette hausse pour les motifs suivants : [contestationReason].

Conformément à l'article 270b CO, je me réserve le droit de saisir l'autorité de conciliation dans le délai de 30 jours.${letterClosing}`,
  },
  {
    id: 'LM-13.06',
    titleKey: 'Bail.consignationLoyer.title',
    descriptionKey: 'Bail.consignationLoyer.description',
    fields: z.object({
      landlordName: z.string().min(1, "Nom du bailleur requis."),
      landlordAddress: z.string().min(1, "Adresse du bailleur requise."),
      propertyAddress: z.string().min(1, "Adresse du bien loué requise."),
      defectDescription: z.string().min(10, "Description du défaut requis."),
      notificationDate: z.string().min(1, "Date de signalement du défaut requise."),
    }),
    templateText: `${letterHeader}Objet : Consignation du loyer

Madame, Monsieur,

En date du [notificationDate], je vous ai signalé le défaut suivant dans l'appartement [propertyAddress] : [defectDescription].

À ce jour, vous n'avez pas remédié à ce défaut. Conformément à l'article 259g CO, je consigne mon loyer auprès de l'office désigné à cet effet jusqu'à ce que les réparations nécessaires soient effectuées.

Je vous invite à procéder aux réparations dans les plus brefs délais.${letterClosing}`,
  },
];

// ============================================================================
// CATEGORY 14: PLAINTES ET FORMULAIRES (1 template)
// ============================================================================
const plaintesFormulairesTemplates: Template[] = [
  {
    id: 'LM-14.01',
    titleKey: 'Plaintes.plainteElcom.title',
    descriptionKey: 'Plaintes.plainteElcom.description',
    fields: z.object({
      elcomAddress: z.string().default("Commission fédérale de l'électricité ElCom, 3003 Berne"),
      electricityProvider: z.string().min(1, "Nom du fournisseur d'électricité requis."),
      currentRate: z.string().min(1, "Tarif actuel requis."),
      newRate: z.string().min(1, "Nouveau tarif requis."),
      increasePercentage: z.string().min(1, "Pourcentage d'augmentation requis."),
      contestationReason: z.string().min(10, "Motif de contestation requis."),
    }),
    templateText: `[Prénom et Nom]
[Adresse]
[Code postal et Ville]

Commission fédérale de l'électricité ElCom
3003 Berne

[Lieu], le [Date]

Objet : Plainte concernant une hausse tarifaire – [electricityProvider]

Madame, Monsieur,

Je me permets de déposer une plainte auprès de votre autorité concernant l'augmentation des tarifs d'électricité pratiquée par [electricityProvider].

Mon tarif est passé de CHF [currentRate] à CHF [newRate], soit une augmentation de [increasePercentage].

Je conteste cette hausse pour les motifs suivants : [contestationReason].

Je vous prie d'examiner cette augmentation et de vérifier sa conformité avec le droit applicable.${letterClosing}`,
  },
];

// ============================================================================
// CATEGORY 15: MODÈLES DE CONTRATS (9 templates)
// ============================================================================
const contratsModelesTemplates: Template[] = [
  {
    id: 'contrat-cession-creance',
    titleKey: 'Contrats.cessionCreance.title',
    descriptionKey: 'Contrats.cessionCreance.description',
    fields: z.object({
      cedantName: z.string().min(1, "Nom du cédant requis."),
      cedantAddress: z.string().min(1, "Adresse du cédant requise."),
      cessionaireName: z.string().min(1, "Nom du cessionnaire requis."),
      cessionaireAddress: z.string().min(1, "Adresse du cessionnaire requise."),
      debtorName: z.string().min(1, "Nom du débiteur requis."),
      claimDescription: z.string().min(10, "Description de la créance requise."),
      claimAmount: z.string().min(1, "Montant de la créance requis."),
      transferPrice: z.string().min(1, "Prix de cession requis."),
    }),
    templateText: `CONTRAT DE CESSION DE CRÉANCE

Entre les soussignés :

LE CÉDANT :
[cedantName]
[cedantAddress]

LE CESSIONNAIRE :
[cessionaireName]
[cessionaireAddress]

IL A ÉTÉ CONVENU CE QUI SUIT :

Article 1 – Objet de la cession
Le cédant cède au cessionnaire, qui accepte, la créance suivante :
- Débiteur : [debtorName]
- Nature : [claimDescription]
- Montant : CHF [claimAmount]

Article 2 – Prix de la cession
La présente cession est consentie moyennant le prix de CHF [transferPrice], payable ce jour.

Article 3 – Transfert des droits
Le cessionnaire est subrogé dans tous les droits du cédant relatifs à cette créance.

Article 4 – Notification au débiteur
Le cessionnaire notifiera la présente cession au débiteur.

Fait en deux exemplaires à [Lieu], le [Date].

Le Cédant :                    Le Cessionnaire :
_________________              _________________`,
  },
  {
    id: 'contrat-pret',
    titleKey: 'Contrats.pret.title',
    descriptionKey: 'Contrats.pret.description',
    fields: z.object({
      lenderName: z.string().min(1, "Nom du prêteur requis."),
      lenderAddress: z.string().min(1, "Adresse du prêteur requise."),
      borrowerName: z.string().min(1, "Nom de l'emprunteur requis."),
      borrowerAddress: z.string().min(1, "Adresse de l'emprunteur requise."),
      loanAmount: z.string().min(1, "Montant du prêt requis."),
      interestRate: z.string().min(0, "Taux d'intérêt requis."),
      repaymentTerms: z.string().min(10, "Modalités de remboursement requises."),
      startDate: z.string().min(1, "Date de début requise."),
    }),
    templateText: `CONTRAT DE PRÊT

Entre les soussignés :

LE PRÊTEUR :
[lenderName]
[lenderAddress]

L'EMPRUNTEUR :
[borrowerName]
[borrowerAddress]

IL A ÉTÉ CONVENU CE QUI SUIT :

Article 1 – Objet
Le prêteur accorde à l'emprunteur un prêt d'un montant de CHF [loanAmount].

Article 2 – Intérêts
Ce prêt est consenti au taux d'intérêt de [interestRate]% l'an.

Article 3 – Modalités de remboursement
[repaymentTerms]

Article 4 – Date d'effet
Le présent contrat prend effet le [startDate].

Article 5 – Exigibilité anticipée
En cas de non-paiement d'une échéance, la totalité du prêt deviendra immédiatement exigible.

Article 6 – Droit applicable
Le présent contrat est soumis au droit suisse.

Fait en deux exemplaires à [Lieu], le [Date].

Le Prêteur :                   L'Emprunteur :
_________________              _________________`,
  },
  {
    id: 'contrat-freelance',
    titleKey: 'Contrats.freelance.title',
    descriptionKey: 'Contrats.freelance.description',
    fields: z.object({
      clientName: z.string().min(1, "Nom du client requis."),
      clientAddress: z.string().min(1, "Adresse du client requise."),
      freelancerName: z.string().min(1, "Nom du prestataire requis."),
      freelancerAddress: z.string().min(1, "Adresse du prestataire requise."),
      serviceDescription: z.string().min(10, "Description de la mission requise."),
      deliverables: z.string().min(10, "Livrables attendus requis."),
      remuneration: z.string().min(1, "Rémunération requise."),
      deadline: z.string().min(1, "Date limite requise."),
    }),
    templateText: `CONTRAT DE PRESTATION DE SERVICES

Entre les soussignés :

LE CLIENT :
[clientName]
[clientAddress]

LE PRESTATAIRE :
[freelancerName]
[freelancerAddress]

IL A ÉTÉ CONVENU CE QUI SUIT :

Article 1 – Objet
Le client confie au prestataire la mission suivante : [serviceDescription]

Article 2 – Livrables
Le prestataire s'engage à fournir : [deliverables]

Article 3 – Délai
La mission devra être accomplie au plus tard le [deadline].

Article 4 – Rémunération
Le client versera au prestataire la somme de CHF [remuneration].

Article 5 – Statut du prestataire
Le prestataire exerce son activité de manière indépendante. Le présent contrat ne crée aucun lien de subordination.

Article 6 – Confidentialité
Les parties s'engagent à garder confidentielles les informations échangées dans le cadre de cette mission.

Fait en deux exemplaires à [Lieu], le [Date].

Le Client :                    Le Prestataire :
_________________              _________________`,
  },
  {
    id: 'convention-accord',
    titleKey: 'Contrats.accord.title',
    descriptionKey: 'Contrats.accord.description',
    fields: z.object({
      party1Name: z.string().min(1, "Nom de la partie 1 requis."),
      party1Address: z.string().min(1, "Adresse de la partie 1 requise."),
      party2Name: z.string().min(1, "Nom de la partie 2 requis."),
      party2Address: z.string().min(1, "Adresse de la partie 2 requise."),
      disputeDescription: z.string().min(10, "Description du litige requis."),
      agreementTerms: z.string().min(10, "Termes de l'accord requis."),
    }),
    templateText: `CONVENTION D'ACCORD AMIABLE

Entre les soussignés :

PARTIE 1 :
[party1Name]
[party1Address]

PARTIE 2 :
[party2Name]
[party2Address]

PRÉAMBULE :
Les parties étaient en litige concernant : [disputeDescription]

Elles ont décidé de régler ce différend à l'amiable aux conditions suivantes.

IL A ÉTÉ CONVENU CE QUI SUIT :

Article 1 – Objet de l'accord
[agreementTerms]

Article 2 – Renonciation à action
Les parties renoncent réciproquement à toute action judiciaire relative au litige susmentionné.

Article 3 – Confidentialité
Les parties s'engagent à garder les termes de la présente convention confidentiels.

Article 4 – Droit applicable
La présente convention est soumise au droit suisse. Tout litige sera soumis aux tribunaux compétents.

Fait en deux exemplaires à [Lieu], le [Date].

Partie 1 :                     Partie 2 :
_________________              _________________`,
  },
  {
    id: 'donation-condition',
    titleKey: 'Contrats.donationCondition.title',
    descriptionKey: 'Contrats.donationCondition.description',
    fields: z.object({
      donorName: z.string().min(1, "Nom du donateur requis."),
      donorAddress: z.string().min(1, "Adresse du donateur requise."),
      doneeName: z.string().min(1, "Nom du donataire requis."),
      doneeAddress: z.string().min(1, "Adresse du donataire requise."),
      giftDescription: z.string().min(1, "Description du bien donné requise."),
      giftValue: z.string().min(1, "Valeur estimée requise."),
      condition: z.string().min(10, "Condition de la donation requise."),
    }),
    templateText: `ACTE DE DONATION AVEC CONDITION

Entre les soussignés :

LE DONATEUR :
[donorName]
[donorAddress]

LE DONATAIRE :
[doneeName]
[doneeAddress]

IL A ÉTÉ CONVENU CE QUI SUIT :

Article 1 – Donation
Le donateur donne au donataire, qui accepte, le bien suivant :
[giftDescription]
Valeur estimée : CHF [giftValue]

Article 2 – Condition
Cette donation est consentie sous la condition suivante : [condition]

Article 3 – Révocation
En cas de non-respect de la condition, le donateur se réserve le droit de révoquer la donation conformément aux articles 249 et suivants du Code des obligations.

Article 4 – Frais
Les frais éventuels de transfert sont à la charge du donataire.

Fait en deux exemplaires à [Lieu], le [Date].

Le Donateur :                  Le Donataire :
_________________              _________________`,
  },
  {
    id: 'donation-obligation',
    titleKey: 'Contrats.donationObligation.title',
    descriptionKey: 'Contrats.donationObligation.description',
    fields: z.object({
      donorName: z.string().min(1, "Nom du donateur requis."),
      donorAddress: z.string().min(1, "Adresse du donateur requise."),
      doneeName: z.string().min(1, "Nom du donataire requis."),
      doneeAddress: z.string().min(1, "Adresse du donataire requise."),
      giftDescription: z.string().min(1, "Description du bien donné requise."),
      giftValue: z.string().min(1, "Valeur estimée requise."),
      obligation: z.string().min(10, "Charge/obligation requise."),
    }),
    templateText: `ACTE DE DONATION AVEC CHARGE

Entre les soussignés :

LE DONATEUR :
[donorName]
[donorAddress]

LE DONATAIRE :
[doneeName]
[doneeAddress]

IL A ÉTÉ CONVENU CE QUI SUIT :

Article 1 – Donation
Le donateur donne au donataire, qui accepte, le bien suivant :
[giftDescription]
Valeur estimée : CHF [giftValue]

Article 2 – Charge
En contrepartie, le donataire s'engage à : [obligation]

Article 3 – Non-exécution de la charge
En cas de non-exécution de la charge, le donateur peut demander l'exécution forcée ou la révocation de la donation.

Fait en deux exemplaires à [Lieu], le [Date].

Le Donateur :                  Le Donataire :
_________________              _________________`,
  },
  {
    id: 'reconnaissance-dettes',
    titleKey: 'Contrats.reconnaissanceDette.title',
    descriptionKey: 'Contrats.reconnaissanceDette.description',
    fields: z.object({
      debtorName: z.string().min(1, "Nom du débiteur requis."),
      debtorAddress: z.string().min(1, "Adresse du débiteur requise."),
      creditorName: z.string().min(1, "Nom du créancier requis."),
      creditorAddress: z.string().min(1, "Adresse du créancier requise."),
      debtAmount: z.string().min(1, "Montant de la dette requis."),
      debtOrigin: z.string().min(10, "Origine de la dette requise."),
      repaymentTerms: z.string().min(10, "Modalités de remboursement requises."),
    }),
    templateText: `RECONNAISSANCE DE DETTE

Je soussigné(e),

[debtorName]
[debtorAddress]

RECONNAÎT DEVOIR

à [creditorName], domicilié(e) à [creditorAddress],

la somme de CHF [debtAmount] (en lettres : __________________ francs suisses),

pour la cause suivante : [debtOrigin]

Je m'engage à rembourser cette somme selon les modalités suivantes :
[repaymentTerms]

La présente reconnaissance de dette constitue un titre exécutoire au sens de l'article 82 LP.

Fait à [Lieu], le [Date].

Signature du débiteur :
_________________`,
  },
  {
    id: 'contrat-travail-domestique-horaire',
    titleKey: 'Contrats.travailDomestiqueHoraire.title',
    descriptionKey: 'Contrats.travailDomestiqueHoraire.description',
    fields: z.object({
      employerName: z.string().min(1, "Nom de l'employeur requis."),
      employerAddress: z.string().min(1, "Adresse de l'employeur requise."),
      employeeName: z.string().min(1, "Nom de l'employé requis."),
      employeeAddress: z.string().min(1, "Adresse de l'employé requise."),
      startDate: z.string().min(1, "Date de début requise."),
      hourlyWage: z.string().min(1, "Salaire horaire requis."),
      weeklyHours: z.string().min(1, "Heures par semaine requises."),
      tasks: z.string().min(10, "Tâches à effectuer requises."),
    }),
    templateText: `CONTRAT DE TRAVAIL POUR EMPLOYÉ DE MAISON
(Salaire horaire)

Entre :

L'EMPLOYEUR :
[employerName]
[employerAddress]

L'EMPLOYÉ :
[employeeName]
[employeeAddress]

IL EST CONVENU CE QUI SUIT :

1. ENGAGEMENT
L'employeur engage l'employé pour effectuer des travaux domestiques à compter du [startDate].

2. TÂCHES
[tasks]

3. HORAIRES
L'employé travaillera [weeklyHours] heures par semaine, selon un horaire à convenir.

4. RÉMUNÉRATION
Salaire horaire brut : CHF [hourlyWage]
(inclus : 8.33% vacances, 2.78% jours fériés)

5. CHARGES SOCIALES
Les cotisations AVS/AI/APG/AC sont déduites du salaire conformément à la loi.

6. RÉSILIATION
Le contrat peut être résilié avec un préavis d'un mois pour la fin d'un mois.

Fait en deux exemplaires à [Lieu], le [Date].

L'Employeur :                  L'Employé :
_________________              _________________`,
  },
  {
    id: 'contrat-travail-domestique-mensuel',
    titleKey: 'Contrats.travailDomestiqueMensuel.title',
    descriptionKey: 'Contrats.travailDomestiqueMensuel.description',
    fields: z.object({
      employerName: z.string().min(1, "Nom de l'employeur requis."),
      employerAddress: z.string().min(1, "Adresse de l'employeur requise."),
      employeeName: z.string().min(1, "Nom de l'employé requis."),
      employeeAddress: z.string().min(1, "Adresse de l'employé requise."),
      startDate: z.string().min(1, "Date de début requise."),
      monthlySalary: z.string().min(1, "Salaire mensuel requis."),
      weeklyHours: z.string().min(1, "Heures par semaine requises."),
      tasks: z.string().min(10, "Tâches à effectuer requises."),
      vacationDays: z.string().min(1, "Nombre de jours de vacances requis."),
    }),
    templateText: `CONTRAT DE TRAVAIL POUR EMPLOYÉ DE MAISON
(Salaire mensuel)

Entre :

L'EMPLOYEUR :
[employerName]
[employerAddress]

L'EMPLOYÉ :
[employeeName]
[employeeAddress]

IL EST CONVENU CE QUI SUIT :

1. ENGAGEMENT
L'employeur engage l'employé pour effectuer des travaux domestiques à compter du [startDate].

2. TÂCHES
[tasks]

3. HORAIRES
L'employé travaillera [weeklyHours] heures par semaine.

4. RÉMUNÉRATION
Salaire mensuel brut : CHF [monthlySalary]
Payable à la fin de chaque mois.

5. VACANCES
L'employé a droit à [vacationDays] jours de vacances payées par an.

6. CHARGES SOCIALES
Les cotisations sociales sont déduites du salaire conformément à la loi.

7. RÉSILIATION
Pendant la période d'essai (1 mois) : 7 jours de préavis.
Ensuite : 1 mois de préavis pour la fin d'un mois.

Fait en deux exemplaires à [Lieu], le [Date].

L'Employeur :                  L'Employé :
_________________              _________________`,
  },
];

// ============================================================================
// EXPORT ALL CATEGORIES
// ============================================================================
export const templateCategories: TemplateCategory[] = [
  {
    id: 'assurance-maladie',
    titleKey: 'AssuranceMaladie.categoryTitle',
    descriptionKey: 'AssuranceMaladie.categoryDescription',
    icon: 'Heart',
    templates: assuranceMaladieTemplates,
  },
  {
    id: 'garantie',
    titleKey: 'Garantie.categoryTitle',
    descriptionKey: 'Garantie.categoryDescription',
    icon: 'Shield',
    templates: garantieTemplates,
  },
  {
    id: 'execution-contrat',
    titleKey: 'ExecutionContrat.categoryTitle',
    descriptionKey: 'ExecutionContrat.categoryDescription',
    icon: 'FileText',
    templates: executionContratTemplates,
  },
  {
    id: 'resiliation',
    titleKey: 'Resiliation.categoryTitle',
    descriptionKey: 'Resiliation.categoryDescription',
    icon: 'XCircle',
    templates: resiliationTemplates,
  },
  {
    id: 'annulation',
    titleKey: 'Annulation.categoryTitle',
    descriptionKey: 'Annulation.categoryDescription',
    icon: 'XCircle',
    templates: annulationTemplates,
  },
  {
    id: 'transport-aerien',
    titleKey: 'TransportAerien.categoryTitle',
    descriptionKey: 'TransportAerien.categoryDescription',
    icon: 'Plane',
    templates: transportAerienTemplates,
  },
  {
    id: 'recouvrement',
    titleKey: 'Recouvrement.categoryTitle',
    descriptionKey: 'Recouvrement.categoryDescription',
    icon: 'Handshake',
    templates: recouvrementTemplates,
  },
  {
    id: 'poursuites',
    titleKey: 'Poursuites.categoryTitle',
    descriptionKey: 'Poursuites.categoryDescription',
    icon: 'Gavel',
    templates: poursuitesTemplates,
  },
  {
    id: 'demarchage',
    titleKey: 'Demarchage.categoryTitle',
    descriptionKey: 'Demarchage.categoryDescription',
    icon: 'Megaphone',
    templates: demarchageTemplates,
  },
  {
    id: 'envoi-non-commande',
    titleKey: 'EnvoiNonCommande.categoryTitle',
    descriptionKey: 'EnvoiNonCommande.categoryDescription',
    icon: 'PackageX',
    templates: envoiNonCommandeTemplates,
  },
  {
    id: 'arnaque',
    titleKey: 'Arnaque.categoryTitle',
    descriptionKey: 'Arnaque.categoryDescription',
    icon: 'AlertTriangle',
    templates: arnaqueTemplates,
  },
  {
    id: 'protection-donnees',
    titleKey: 'ProtectionDonnees.categoryTitle',
    descriptionKey: 'ProtectionDonnees.categoryDescription',
    icon: 'Database',
    templates: protectionDonneesTemplates,
  },
  {
    id: 'bail',
    titleKey: 'Bail.categoryTitle',
    descriptionKey: 'Bail.categoryDescription',
    icon: 'Home',
    templates: bailTemplates,
  },
  {
    id: 'plaintes-formulaires',
    titleKey: 'Plaintes.categoryTitle',
    descriptionKey: 'Plaintes.categoryDescription',
    icon: 'FileWarning',
    templates: plaintesFormulairesTemplates,
  },
  {
    id: 'contrats-modeles',
    titleKey: 'Contrats.categoryTitle',
    descriptionKey: 'Contrats.categoryDescription',
    icon: 'BookUser',
    templates: contratsModelesTemplates,
  },
];

// Helper function to find a template by ID
export function findTemplateById(templateId: string): { category: TemplateCategory; template: Template } | null {
  for (const category of templateCategories) {
    const template = category.templates.find(t => t.id === templateId);
    if (template) {
      return { category, template };
    }
  }
  return null;
}

// Get total template count
export function getTotalTemplateCount(): number {
  return templateCategories.reduce((sum, cat) => sum + cat.templates.length, 0);
}
