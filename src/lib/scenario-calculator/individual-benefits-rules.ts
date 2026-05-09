// Centralized Swiss allowance and household-support rules shared by
// individual and business modules.

import { FR_MUNICIPALITY_RENT_REGION } from "./fr-municipality-rent-regions";

export type CantonCode =
  | "ag" | "ar" | "ai" | "bl" | "bs" | "be" | "fr" | "ge" | "gl" | "gr"
  | "ju" | "lu" | "ne" | "nw" | "ow" | "sh" | "sz" | "so" | "sg" | "tg"
  | "ti" | "ur" | "vs" | "vd" | "zg" | "zh";

export const INDIVIDUAL_BENEFITS_SOURCE_INDEX = {
  familyAllowances: [
    "Allocations familiales",
    "Payroll/Allocations Familiales _ Family allowances",
  ],
  maternityAndAdoption: [
    "Allocation de maternite",
    "Allocation d'adoption",
    "Allocation de prise en charge",
    "Allocation a l'autre parent",
    "Allocation pour perte de gain",
  ],
  healthSubsidies: [
    "Subsides assurance maladie _ Health insurance Subsidies",
  ],
  complementaryBenefits: [
    "Prestations complementaires (PC Familles)",
    "Prestations transitoires pour chomeurs ages",
    "AVS (Prestations)",
  ],
} as const;

export const FAMILY_ALLOWANCE_RATES: Record<CantonCode, { child: number; education: number }> = {
  ag: { child: 200, education: 250 },
  ar: { child: 200, education: 250 },
  ai: { child: 200, education: 250 },
  bl: { child: 200, education: 250 },
  bs: { child: 200, education: 275 },
  be: { child: 230, education: 290 },
  fr: { child: 245, education: 305 },
  ge: { child: 311, education: 415 },
  gl: { child: 200, education: 250 },
  gr: { child: 230, education: 280 },
  ju: { child: 250, education: 300 },
  lu: { child: 210, education: 260 },
  ne: { child: 220, education: 300 },
  nw: { child: 200, education: 250 },
  ow: { child: 200, education: 250 },
  sh: { child: 200, education: 250 },
  sz: { child: 200, education: 250 },
  so: { child: 200, education: 250 },
  sg: { child: 230, education: 280 },
  tg: { child: 200, education: 250 },
  ti: { child: 200, education: 250 },
  ur: { child: 200, education: 250 },
  vs: { child: 305, education: 435 },
  vd: { child: 300, education: 400 },
  zg: { child: 300, education: 300 },
  zh: { child: 200, education: 250 },
};

export const BIRTH_ALLOWANCE: Record<CantonCode, number> = {
  ag: 0, ar: 0, ai: 0, bl: 0, bs: 0,
  be: 0, fr: 1500, ge: 2000, gl: 0, gr: 0,
  ju: 0, lu: 0, ne: 0, nw: 0, ow: 0,
  sh: 0, sz: 0, so: 0, sg: 0, tg: 0,
  ti: 0, ur: 0, vs: 2000, vd: 1500, zg: 0,
  zh: 0,
};

export const ADOPTION_ALLOWANCE: Record<CantonCode, number> = {
  ag: 0, ar: 0, ai: 0, bl: 0, bs: 0,
  be: 0, fr: 1500, ge: 2000, gl: 0, gr: 0,
  ju: 0, lu: 0, ne: 0, nw: 0, ow: 0,
  sh: 0, sz: 0, so: 0, sg: 0, tg: 0,
  ti: 0, ur: 0, vs: 2000, vd: 1500, zg: 0,
  zh: 0,
};

export const HEALTH_SUBSIDY_INCOME_THRESHOLDS: Partial<Record<CantonCode, {
  single: number;
  family: number;
  perChildSubsidy: number;
  adultSubsidy: number;
}>> = {
  ag: { single: 42000, family: 54000, perChildSubsidy: 1800, adultSubsidy: 2400 },
  be: { single: 38000, family: 50000, perChildSubsidy: 2400, adultSubsidy: 3600 },
  bs: { single: 40000, family: 52000, perChildSubsidy: 2400, adultSubsidy: 3600 },
  fr: { single: 42000, family: 55000, perChildSubsidy: 2000, adultSubsidy: 3000 },
  ge: { single: 44000, family: 58000, perChildSubsidy: 3000, adultSubsidy: 4200 },
  ju: { single: 38000, family: 50000, perChildSubsidy: 2400, adultSubsidy: 3600 },
  lu: { single: 40000, family: 52000, perChildSubsidy: 2000, adultSubsidy: 3000 },
  ne: { single: 42000, family: 55000, perChildSubsidy: 2400, adultSubsidy: 3600 },
  sg: { single: 40000, family: 52000, perChildSubsidy: 1800, adultSubsidy: 2400 },
  so: { single: 40000, family: 52000, perChildSubsidy: 2000, adultSubsidy: 2800 },
  ti: { single: 42000, family: 55000, perChildSubsidy: 2400, adultSubsidy: 3600 },
  vd: { single: 44000, family: 58000, perChildSubsidy: 2400, adultSubsidy: 3600 },
  vs: { single: 40000, family: 52000, perChildSubsidy: 2000, adultSubsidy: 3000 },
  zh: { single: 42000, family: 54000, perChildSubsidy: 2400, adultSubsidy: 3000 },
  zg: { single: 38000, family: 50000, perChildSubsidy: 1800, adultSubsidy: 2400 },
};

export const DEFAULT_HEALTH_SUBSIDY = {
  single: 40000,
  family: 52000,
  perChildSubsidy: 2000,
  adultSubsidy: 2800,
};

export const COMPLEMENTARY_BENEFITS_RULES: Partial<Record<CantonCode, {
  singleThreshold: number;
  familyBaseThreshold: number;
  perChildThresholdIncrease: number;
  maxAnnualBenefit: number;
}>> = {
  fr: { singleThreshold: 36000, familyBaseThreshold: 52000, perChildThresholdIncrease: 6000, maxAnnualBenefit: 18000 },
  ge: { singleThreshold: 38000, familyBaseThreshold: 56000, perChildThresholdIncrease: 6500, maxAnnualBenefit: 24000 },
  ne: { singleThreshold: 35000, familyBaseThreshold: 50000, perChildThresholdIncrease: 5500, maxAnnualBenefit: 15000 },
  vd: { singleThreshold: 37000, familyBaseThreshold: 54000, perChildThresholdIncrease: 6000, maxAnnualBenefit: 20000 },
  vs: { singleThreshold: 34000, familyBaseThreshold: 50000, perChildThresholdIncrease: 5500, maxAnnualBenefit: 16000 },
  ju: { singleThreshold: 34000, familyBaseThreshold: 49000, perChildThresholdIncrease: 5000, maxAnnualBenefit: 15000 },
};

export type SupplementaryBenefitsEligibilityGroup = "retired" | "ai";

export type SupplementaryBenefitsRule = {
  basicNeedsSingle: number;
  basicNeedsCouple: number;
  basicNeedsPerChild: number;
  maxRecognizedRentSingle: number;
  maxRecognizedRentCouple: number;
  maxRecognizedRentPerChild: number;
  recognizedHealthPremiumSingle: number;
  recognizedHealthPremiumCouple: number;
  recognizedHealthPremiumPerChild: number;
  assetEligibilityLimitSingle: number;
  assetEligibilityLimitCouple: number;
  assetEligibilityLimitPerChild: number;
  assetDisregardSingle: number;
  assetDisregardCouple: number;
  assetDisregardPerChild: number;
  assetConsumptionRateRetired: number;
  assetConsumptionRateAi: number;
  maxAnnualBenefit: number;
};

const DEFAULT_SUPPLEMENTARY_BENEFITS_RULE: SupplementaryBenefitsRule = {
  basicNeedsSingle: 20670,
  basicNeedsCouple: 31005,
  basicNeedsPerChild: 7590,
  maxRecognizedRentSingle: 18300,
  maxRecognizedRentCouple: 21720,
  maxRecognizedRentPerChild: 1800,
  recognizedHealthPremiumSingle: 4200,
  recognizedHealthPremiumCouple: 7800,
  recognizedHealthPremiumPerChild: 1200,
  assetEligibilityLimitSingle: 100000,
  assetEligibilityLimitCouple: 200000,
  assetEligibilityLimitPerChild: 50000,
  assetDisregardSingle: 30000,
  assetDisregardCouple: 50000,
  assetDisregardPerChild: 15000,
  assetConsumptionRateRetired: 0.1,
  assetConsumptionRateAi: 1 / 15,
  maxAnnualBenefit: 36000,
};

type SupplementaryBenefitsRentRegion = "region1" | "region2" | "region3";

const SUPPLEMENTARY_BENEFITS_RENT_CAPS: Record<SupplementaryBenefitsRentRegion, {
  single: number;
  couple: number;
  perChild: number;
}> = {
  // Derived from canton EL rent-cap tables (annual values, CHF)
  region1: { single: 18900, couple: 22320, perChild: 2460 },
  region2: { single: 18300, couple: 21720, perChild: 2040 },
  region3: { single: 16680, couple: 20160, perChild: 2040 },
};

const SUPPLEMENTARY_BENEFITS_REGION_BY_CANTON: Record<CantonCode, SupplementaryBenefitsRentRegion> = {
  ag: "region2",
  ar: "region3",
  ai: "region3",
  bl: "region1",
  bs: "region1",
  be: "region2",
  fr: "region3",
  ge: "region1",
  gl: "region3",
  gr: "region3",
  ju: "region3",
  lu: "region2",
  ne: "region3",
  nw: "region2",
  ow: "region3",
  sh: "region2",
  sz: "region2",
  so: "region2",
  sg: "region3",
  tg: "region3",
  ti: "region2",
  ur: "region3",
  vs: "region3",
  vd: "region1",
  zg: "region1",
  zh: "region1",
};

function supplementaryBenefitsRuleForRegion(region: SupplementaryBenefitsRentRegion): SupplementaryBenefitsRule {
  const caps = SUPPLEMENTARY_BENEFITS_RENT_CAPS[region];
  return {
    ...DEFAULT_SUPPLEMENTARY_BENEFITS_RULE,
    maxRecognizedRentSingle: caps.single,
    maxRecognizedRentCouple: caps.couple,
    maxRecognizedRentPerChild: caps.perChild,
  };
}

function normalizeMunicipalityKey(input: string | undefined | null): string | null {
  if (!input) return null;
  const key = input
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
  return key || null;
}

function regionNumberToKey(region: 1 | 2 | 3): SupplementaryBenefitsRentRegion {
  if (region === 1) return "region1";
  if (region === 2) return "region2";
  return "region3";
}

export function resolveSupplementaryBenefitsRentRegion(
  cantonCode: CantonCode,
  municipalityName?: string | null
): SupplementaryBenefitsRentRegion {
  if (cantonCode === "fr" && municipalityName) {
    const key = normalizeMunicipalityKey(municipalityName);
    const frRegion = key ? FR_MUNICIPALITY_RENT_REGION[key] : undefined;
    if (frRegion) {
      return regionNumberToKey(frRegion);
    }
  }

  return SUPPLEMENTARY_BENEFITS_REGION_BY_CANTON[cantonCode];
}

export function getSupplementaryBenefitsRule(
  cantonCode: CantonCode,
  municipalityName?: string | null
): SupplementaryBenefitsRule {
  const region = resolveSupplementaryBenefitsRentRegion(cantonCode, municipalityName);
  const cantonBase = SUPPLEMENTARY_BENEFITS_ENTITLEMENT_RULES[cantonCode];
  const regionalRule = supplementaryBenefitsRuleForRegion(region);

  // Keep canton-specific non-rent adjustments (for example max annual caps),
  // while applying municipality/canton rent caps via the selected region.
  return {
    ...cantonBase,
    maxRecognizedRentSingle: regionalRule.maxRecognizedRentSingle,
    maxRecognizedRentCouple: regionalRule.maxRecognizedRentCouple,
    maxRecognizedRentPerChild: regionalRule.maxRecognizedRentPerChild,
  };
}

export const SUPPLEMENTARY_BENEFITS_ENTITLEMENT_RULES: Record<CantonCode, SupplementaryBenefitsRule> = {
  ag: supplementaryBenefitsRuleForRegion(SUPPLEMENTARY_BENEFITS_REGION_BY_CANTON.ag),
  ar: supplementaryBenefitsRuleForRegion(SUPPLEMENTARY_BENEFITS_REGION_BY_CANTON.ar),
  ai: supplementaryBenefitsRuleForRegion(SUPPLEMENTARY_BENEFITS_REGION_BY_CANTON.ai),
  bl: supplementaryBenefitsRuleForRegion(SUPPLEMENTARY_BENEFITS_REGION_BY_CANTON.bl),
  bs: supplementaryBenefitsRuleForRegion(SUPPLEMENTARY_BENEFITS_REGION_BY_CANTON.bs),
  be: supplementaryBenefitsRuleForRegion(SUPPLEMENTARY_BENEFITS_REGION_BY_CANTON.be),
  fr: supplementaryBenefitsRuleForRegion(SUPPLEMENTARY_BENEFITS_REGION_BY_CANTON.fr),
  ge: {
    ...supplementaryBenefitsRuleForRegion(SUPPLEMENTARY_BENEFITS_REGION_BY_CANTON.ge),
    maxAnnualBenefit: 42000,
  },
  gl: supplementaryBenefitsRuleForRegion(SUPPLEMENTARY_BENEFITS_REGION_BY_CANTON.gl),
  gr: supplementaryBenefitsRuleForRegion(SUPPLEMENTARY_BENEFITS_REGION_BY_CANTON.gr),
  ju: supplementaryBenefitsRuleForRegion(SUPPLEMENTARY_BENEFITS_REGION_BY_CANTON.ju),
  lu: supplementaryBenefitsRuleForRegion(SUPPLEMENTARY_BENEFITS_REGION_BY_CANTON.lu),
  ne: supplementaryBenefitsRuleForRegion(SUPPLEMENTARY_BENEFITS_REGION_BY_CANTON.ne),
  nw: supplementaryBenefitsRuleForRegion(SUPPLEMENTARY_BENEFITS_REGION_BY_CANTON.nw),
  ow: supplementaryBenefitsRuleForRegion(SUPPLEMENTARY_BENEFITS_REGION_BY_CANTON.ow),
  sh: supplementaryBenefitsRuleForRegion(SUPPLEMENTARY_BENEFITS_REGION_BY_CANTON.sh),
  sz: supplementaryBenefitsRuleForRegion(SUPPLEMENTARY_BENEFITS_REGION_BY_CANTON.sz),
  so: supplementaryBenefitsRuleForRegion(SUPPLEMENTARY_BENEFITS_REGION_BY_CANTON.so),
  sg: supplementaryBenefitsRuleForRegion(SUPPLEMENTARY_BENEFITS_REGION_BY_CANTON.sg),
  tg: supplementaryBenefitsRuleForRegion(SUPPLEMENTARY_BENEFITS_REGION_BY_CANTON.tg),
  ti: supplementaryBenefitsRuleForRegion(SUPPLEMENTARY_BENEFITS_REGION_BY_CANTON.ti),
  ur: supplementaryBenefitsRuleForRegion(SUPPLEMENTARY_BENEFITS_REGION_BY_CANTON.ur),
  vs: supplementaryBenefitsRuleForRegion(SUPPLEMENTARY_BENEFITS_REGION_BY_CANTON.vs),
  vd: {
    ...supplementaryBenefitsRuleForRegion(SUPPLEMENTARY_BENEFITS_REGION_BY_CANTON.vd),
    maxAnnualBenefit: 40000,
  },
  zg: supplementaryBenefitsRuleForRegion(SUPPLEMENTARY_BENEFITS_REGION_BY_CANTON.zg),
  zh: supplementaryBenefitsRuleForRegion(SUPPLEMENTARY_BENEFITS_REGION_BY_CANTON.zh),
};

const CANTON_ALIASES: Record<string, CantonCode> = {
  geneve: "ge",
  genf: "ge",
  vaud: "vd",
  zurich: "zh",
  zrich: "zh",
  bern: "be",
  berne: "be",
  fribourg: "fr",
  freiburg: "fr",
  tessin: "ti",
  ticino: "ti",
  valais: "vs",
  wallis: "vs",
  neuchatel: "ne",
  lucerne: "lu",
  luzern: "lu",
  stgallen: "sg",
  saintgall: "sg",
  schaffhausen: "sh",
  grisons: "gr",
  graubunden: "gr",
  aargau: "ag",
  argovie: "ag",
  appenzellrhodesinterieures: "ai",
  appenzellrhodesexterieures: "ar",
  baselstadt: "bs",
  baselland: "bl",
  thurgau: "tg",
  thurgovie: "tg",
  schwyz: "sz",
  obwald: "ow",
  nidwald: "nw",
  uri: "ur",
  zug: "zg",
  zoug: "zg",
  glarus: "gl",
  glaris: "gl",
  jura: "ju",
  soleure: "so",
  solothurn: "so",
};

export function normalizeCantonCode(input: string | undefined | null): CantonCode | null {
  if (!input) return null;
  const raw = input.trim().toLowerCase();
  if (raw.length === 2 && raw in FAMILY_ALLOWANCE_RATES) {
    return raw as CantonCode;
  }

  const key = raw
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z]/g, "");

  return CANTON_ALIASES[key] ?? null;
}
