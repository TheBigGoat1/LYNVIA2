export const INDIVIDUAL_ACCESS_PRICING = {
  free: {
    nonPillarScenariosPerMonth: 2,
    unlimitedScenarioIds: ['pillar_3a'] as const,
    aiExchangesLabel: 'Limited',
    documentPreviewIncluded: true,
  },
  addOns: {
    extraScenarioPriceChf: 10,
    reviewedDocumentPriceChf: 20,
    instantPdfPriceChf: 5,
  },
} as const;

export type IndividualFreeUnlimitedScenarioId =
  typeof INDIVIDUAL_ACCESS_PRICING.free.unlimitedScenarioIds[number];
