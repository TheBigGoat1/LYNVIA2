// ============================================================================
// VAT/TDFN FULL MULTI-SECTOR CALCULATION
// ============================================================================

import { getTdfnList } from "@/lib/tdfn-secteurs";
import type { TVAFormData } from "@/components/vat/tva-comparison-form";
import type { TVAComparisonResult } from "@/components/vat/tva-results-card";

const TVA_RATES = [
  { key: 'CA_0' as const, rate: 0 },
  { key: 'CA_26' as const, rate: 0.026 },
  { key: 'CA_38' as const, rate: 0.038 },
  { key: 'CA_81' as const, rate: 0.081 },
];

export function calculateFullVATComparison(data: TVAFormData): TVAComparisonResult {
  const tdfnList = getTdfnList();

  // ── Méthode Effective ──
  // TVA collected on standard CA buckets
  const tvaDueParTaux = TVA_RATES
    .filter(t => data[t.key] > 0)
    .map(t => ({
      taux: t.rate * 100,
      montantCA: data[t.key],
      tvaDue: data[t.key] * t.rate,
    }));

  // TVA collected on sector CA (each sector has its own effective VAT rate)
  for (const s of data.secteurs) {
    if (s.montantCA > 0 && s.tauxTVA > 0) {
      tvaDueParTaux.push({
        taux: s.tauxTVA,
        montantCA: s.montantCA,
        tvaDue: s.montantCA * (s.tauxTVA / 100),
      });
    }
  }

  const totalTvaCollected = tvaDueParTaux.reduce((sum, t) => sum + t.tvaDue, 0);

  // Input tax (impôt préalable) = VAT paid on purchases and expenses
  const impotPrealable =
    data.achats_26 * 0.026 +
    data.achats_81 * 0.081 +
    data.depenses_26 * 0.026 +
    data.depenses_81 * 0.081;

  const tvaEffective = Math.max(0, totalTvaCollected - impotPrealable);

  // ── Méthode TDFN ──
  // Each sector: CA × sector TDFN rate (from AFC list)
  const parSecteur = data.secteurs.map(s => {
    const found = tdfnList.find(t => t.branche === s.nom);
    const tauxTDFN = found ? found.tdfn : 0;
    return {
      nom: s.nom,
      montantCA: s.montantCA,
      tauxTDFN,
      tvaDue: s.montantCA * (1 + s.tauxTVA / 100) * tauxTDFN,
    };
  });

  // Standard CA (no sector) — use a weighted average TDFN rate
  // TDFN is applied on gross CA (CA TTC = CA net × (1 + TVA rate))
  const standardCATTC =
    data.CA_0 * 1 +
    data.CA_26 * 1.026 +
    data.CA_38 * 1.038 +
    data.CA_81 * 1.081;

  // For standard CA without a specific sector, we cannot determine a TDFN rate.
  // Use 0 if no sectors are set, otherwise use an average of the added sectors.
  const avgTdfnRate = parSecteur.length > 0
    ? parSecteur.reduce((sum, s) => sum + s.tauxTDFN, 0) / parSecteur.length
    : 0.062; // default: fiduciaire rate

  const standardTvaDue = standardCATTC * avgTdfnRate;
  const tdfnTotal = parSecteur.reduce((sum, s) => sum + s.tvaDue, 0) + standardTvaDue;

  // ── Recommendation ──
  const methodeRecommandee: 'Effective' | 'TDFN' = tvaEffective <= tdfnTotal ? 'Effective' : 'TDFN';
  const economie = Math.abs(tvaEffective - tdfnTotal);

  return {
    tvaEffective,
    tvaTDFN: tdfnTotal,
    methodeRecommandee,
    economie,
    detailEffective: {
      tvaDueParTaux,
      impotPrealable,
      totalTvaDue: tvaEffective,
    },
    detailTDFN: {
      parSecteur,
      standardCA: standardCATTC,
      standardTvaDue,
      totalTvaDue: tdfnTotal,
    },
  };
}
import type { TaxCalculationResult, ScenarioConfig, BenefitItem } from "./types";
import {
  ADOPTION_ALLOWANCE,
  BIRTH_ALLOWANCE,
  COMPLEMENTARY_BENEFITS_RULES,
  DEFAULT_HEALTH_SUBSIDY,
  FAMILY_ALLOWANCE_RATES,
  HEALTH_SUBSIDY_INCOME_THRESHOLDS,
  SUPPLEMENTARY_BENEFITS_ENTITLEMENT_RULES,
  type SupplementaryBenefitsEligibilityGroup,
  getSupplementaryBenefitsRule,
  normalizeCantonCode,
} from "./individual-benefits-rules";

// ============================================================================
// SCENARIO CONFIGURATIONS
// ============================================================================

export const SCENARIO_CONFIGS: ScenarioConfig[] = [
  {
    id: "income_change",
    title: "Salary Change",
    description: "Compare taxes before and after a salary change",
    icon: "TrendingUp",
    available: true,
  },
  {
    id: "child_birth",
    title: "New Child",
    description: "Tax impact, allowances, and subsidies for a new child",
    icon: "Baby",
    available: true,
  },
  {
    id: "marriage",
    title: "Marriage",
    description: "Compare single vs. married taxation (marriage penalty/bonus)",
    icon: "Heart",
    available: true,
  },
  {
    id: "pillar_3a",
    title: "Pillar 3a",
    description: "Calculate tax savings from 3rd pillar contributions",
    icon: "PiggyBank",
    available: true,
  },
  {
    id: "pillar_2_buyback",
    title: "Pillar 2 Buyback",
    description: "Tax savings from voluntary pension fund contributions",
    icon: "Wallet",
    available: true,
  },
  {
    id: "job_loss",
    title: "Job Loss",
    description: "Analyze unemployment impact and benefits",
    icon: "Briefcase",
    available: true,
  },
  {
    id: "supplementary_benefits",
    title: "Supplementary Benefits (EL)",
    description: "Estimate entitlement for retirees and AI beneficiaries",
    icon: "Landmark",
    available: true,
  },
  {
    id: "vat_comparison",
    title: "VAT Method Comparison",
    description: "Compare effective vs. TDFN VAT methods by sector",
    icon: "DollarSign",
    available: true,
  },
];


export {
  ADOPTION_ALLOWANCE,
  BIRTH_ALLOWANCE,
  COMPLEMENTARY_BENEFITS_RULES,
  DEFAULT_HEALTH_SUBSIDY,
  FAMILY_ALLOWANCE_RATES,
  HEALTH_SUBSIDY_INCOME_THRESHOLDS,
  SUPPLEMENTARY_BENEFITS_ENTITLEMENT_RULES,
} from "./individual-benefits-rules";

import {
  AHV_IV_EO_RATE,
  ALV_RATE,
  ALV_MAX_INSURABLE_SALARY,
  NBUV_DEFAULT_RATE,
  BVG_COORDINATION_DEDUCTION_ANNUAL,
  BVG_MAX_INSURABLE_ANNUAL,
  getBvgRate,
} from "@/lib/social-insurance-rates";

// ============================================================================
// SOCIAL DEDUCTION CALCULATIONS
// ============================================================================

export function calculateSocialDeductions(grossSalary: number, age: number): {
  ahv: number;
  alv: number;
  bvg: number;
  nbuv: number;
  total: number;
} {
  const ahv = grossSalary * AHV_IV_EO_RATE;
  const alvBase = Math.min(grossSalary, ALV_MAX_INSURABLE_SALARY);
  const alv = alvBase * ALV_RATE;
  const nbuv = grossSalary * NBUV_DEFAULT_RATE;

  // BVG: coordinated salary = gross - coordination deduction
  const coordinatedSalary = Math.max(0, Math.min(grossSalary, BVG_MAX_INSURABLE_ANNUAL) - BVG_COORDINATION_DEDUCTION_ANNUAL);
  const bvgRate = getBvgRate(age);
  const bvg = coordinatedSalary * bvgRate / 2; // Employee share = half

  const total = ahv + alv + bvg + nbuv;
  return { ahv, alv, bvg, nbuv, total };
}

// ============================================================================
// TAX CALCULATION (API ONLY)
// ============================================================================

export async function calculateTax(params: {
  grossSalary: number;
  maritalStatus: string;
  dependents: number;
  age: number;
  confession: string;
  fortune?: number;
  locationId: number;
}): Promise<TaxCalculationResult> {

  if (!params.locationId) {
    throw new Error("Location ID is required for tax calculation.");
  }
  
  const confessionMap: Record<string, number> = {
    none: 5, catholic: 2, protestant: 1, other: 5,
  };

  const response = await fetch("/api/taxes/calculate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      grossSalary: params.grossSalary,
      maritalStatus: params.maritalStatus,
      dependents: params.dependents,
      age: params.age,
      confession: confessionMap[params.confession] ?? 5,
      fortune: params.fortune ?? 0,
      locationId: params.locationId,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: "An unknown error occurred with the tax API." }));
    throw new Error(errorData.error || "Failed to calculate taxes via API.");
  }

  const data: TaxCalculationResult = await response.json();
  return data;
}


// ============================================================================
// BENEFIT CALCULATIONS
// ============================================================================

export function calculateFamilyAllowances(canton: string, childCount: number): number {
  const code = normalizeCantonCode(canton) ?? "zh";
  const rates = FAMILY_ALLOWANCE_RATES[code] ?? FAMILY_ALLOWANCE_RATES.zh;
  return rates.child * childCount * 12; // Annual family allowances
}

export function calculateBirthAllowance(canton: string): number {
  const code = normalizeCantonCode(canton);
  return code ? (BIRTH_ALLOWANCE[code] ?? 0) : 0;
}

export function calculateAdoptionAllowance(canton: string): number {
  const code = normalizeCantonCode(canton);
  return code ? (ADOPTION_ALLOWANCE[code] ?? 0) : 0;
}

export function calculateMaternityAllowance(dailySalary: number): {
  dailyAllowance: number;
  totalAllowance: number;
  duration: number;
} {
  // Federal maternity leave: 14 weeks (98 days), 80% of salary, max CHF 220/day
  const dailyAllowance = Math.min(dailySalary * 0.8, 220);
  return {
    dailyAllowance,
    totalAllowance: dailyAllowance * 98,
    duration: 98,
  };
}

export function calculateHealthInsuranceSubsidy(
  canton: string,
  maritalStatus: string,
  grossIncome: number,
  children: number
): { eligible: boolean; annualSubsidy: number; breakdown: BenefitItem[] } {
  const code = normalizeCantonCode(canton);
  const thresholds = (code ? HEALTH_SUBSIDY_INCOME_THRESHOLDS[code] : undefined) ?? DEFAULT_HEALTH_SUBSIDY;
  const threshold = maritalStatus === "married" || children > 0
    ? thresholds.family + (children * 4000) // Threshold increases per child
    : thresholds.single;

  if (grossIncome > threshold) {
    return { eligible: false, annualSubsidy: 0, breakdown: [] };
  }

  const breakdown: BenefitItem[] = [];
  let total = 0;

  // Adult subsidy
  const adultSubsidy = thresholds.adultSubsidy;
  total += adultSubsidy;
  breakdown.push({ label: "Adult health insurance subsidy", amount: adultSubsidy, type: "subsidy" });

  // Per-child subsidy
  if (children > 0) {
    const childSubsidy = thresholds.perChildSubsidy * children;
    total += childSubsidy;
    breakdown.push({ label: `Child health insurance subsidy (${children} child${children > 1 ? "ren" : ""})`, amount: childSubsidy, type: "subsidy" });
  }

  return { eligible: true, annualSubsidy: total, breakdown };
}

export function calculateComplementaryBenefits(
  canton: string,
  maritalStatus: string,
  grossIncome: number,
  children: number
): { eligible: boolean; annualBenefit: number; breakdown: BenefitItem[] } {
  const code = normalizeCantonCode(canton);
  const rules = (code ? COMPLEMENTARY_BENEFITS_RULES[code] : undefined) ?? null;

  if (!rules) {
    return { eligible: false, annualBenefit: 0, breakdown: [] };
  }

  const threshold = maritalStatus === "married" || children > 0
    ? rules.familyBaseThreshold + children * rules.perChildThresholdIncrease
    : rules.singleThreshold;

  if (grossIncome >= threshold) {
    return { eligible: false, annualBenefit: 0, breakdown: [] };
  }

  const annualBenefit = Math.min(threshold - grossIncome, rules.maxAnnualBenefit);
  const breakdown: BenefitItem[] = [
    {
      label: "Complementary benefits estimate (PC familles)",
      amount: annualBenefit,
      type: "benefit",
    },
  ];

  return { eligible: true, annualBenefit, breakdown };
}

export function calculateSupplementaryBenefitsEntitlement(params: {
  canton: string;
  municipalityName?: string;
  maritalStatus: string;
  children: number;
  annualAssessableIncome: number;
  annualHousingCosts: number;
  annualHealthInsurancePremium: number;
  netAssets: number;
  eligibilityGroup: SupplementaryBenefitsEligibilityGroup;
}): {
  eligible: boolean;
  annualBenefit: number;
  recognizedExpenses: number;
  determiningIncome: number;
  breakdown: BenefitItem[];
  reason?: string;
} {
  const code = normalizeCantonCode(params.canton) ?? "zh";
  const rules = getSupplementaryBenefitsRule(code, params.municipalityName);
  const childCount = Math.max(0, params.children);
  const isCouple = params.maritalStatus === "married";

  const assetEligibilityLimit =
    (isCouple ? rules.assetEligibilityLimitCouple : rules.assetEligibilityLimitSingle)
    + childCount * rules.assetEligibilityLimitPerChild;

  if (params.netAssets > assetEligibilityLimit) {
    return {
      eligible: false,
      annualBenefit: 0,
      recognizedExpenses: 0,
      determiningIncome: params.annualAssessableIncome,
      breakdown: [],
      reason: "Assets exceed canton EL eligibility limits.",
    };
  }

  const recognizedBasicNeeds =
    (isCouple ? rules.basicNeedsCouple : rules.basicNeedsSingle)
    + childCount * rules.basicNeedsPerChild;

  const maxRecognizedRent =
    (isCouple ? rules.maxRecognizedRentCouple : rules.maxRecognizedRentSingle)
    + childCount * rules.maxRecognizedRentPerChild;
  const recognizedHousing = Math.min(Math.max(0, params.annualHousingCosts), maxRecognizedRent);

  const maxRecognizedHealth =
    (isCouple ? rules.recognizedHealthPremiumCouple : rules.recognizedHealthPremiumSingle)
    + childCount * rules.recognizedHealthPremiumPerChild;
  const recognizedHealth = Math.min(Math.max(0, params.annualHealthInsurancePremium), maxRecognizedHealth);

  const assetDisregard =
    (isCouple ? rules.assetDisregardCouple : rules.assetDisregardSingle)
    + childCount * rules.assetDisregardPerChild;
  const assetBase = Math.max(0, params.netAssets - assetDisregard);
  const assetConsumptionRate =
    params.eligibilityGroup === "ai"
      ? rules.assetConsumptionRateAi
      : rules.assetConsumptionRateRetired;
  const annualAssetIncome = assetBase * assetConsumptionRate;

  const recognizedExpenses = recognizedBasicNeeds + recognizedHousing + recognizedHealth;
  const determiningIncome = Math.max(0, params.annualAssessableIncome) + annualAssetIncome;
  const rawBenefit = Math.max(0, recognizedExpenses - determiningIncome);
  const annualBenefit = Math.min(rawBenefit, rules.maxAnnualBenefit);

  const breakdown: BenefitItem[] = [
    { label: "Recognized basic needs", amount: recognizedBasicNeeds, type: "benefit" },
    { label: "Recognized housing costs", amount: recognizedHousing, type: "benefit" },
    { label: "Recognized health premium", amount: recognizedHealth, type: "benefit" },
    { label: "Determining annual income", amount: -determiningIncome, type: "deduction" },
  ];

  if (annualBenefit > 0) {
    breakdown.push({
      label: "Estimated supplementary benefits (EL)",
      amount: annualBenefit,
      type: "benefit",
    });
  }

  return {
    eligible: annualBenefit > 0,
    annualBenefit,
    recognizedExpenses,
    determiningIncome,
    breakdown,
  };
}

export function calculateUnemploymentBenefits(
  lastGrossSalary: number,
  hasChildren: boolean,
  yearsEmployed: number,
  age: number
): {
  monthlyBenefit: number;
  maxDuration: number;
  totalBenefits: number;
  benefitRate: number;
} {
  // Max insured monthly salary: CHF 148,200/year → CHF 12,350/month
  const monthlyInsured = Math.min(lastGrossSalary / 12, 12350);
  const benefitRate = hasChildren ? 0.80 : 0.70;
  const monthlyBenefit = monthlyInsured * benefitRate;

  // Max duration depends on age and years employed
  let maxDuration: number;
  if (age >= 55 && yearsEmployed >= 22) maxDuration = 24;
  else if (age >= 55) maxDuration = 18;
  else if (yearsEmployed >= 18) maxDuration = 18;
  else maxDuration = 12;

  return {
    monthlyBenefit,
    maxDuration,
    totalBenefits: monthlyBenefit * maxDuration,
    benefitRate,
  };
}

// ============================================================================
// FORMATTERS
// ============================================================================

/** @deprecated use calculateFullVATComparison */
export const calculateVATComparison = calculateFullVATComparison;

/** Flat list of TDFN sectors for dropdown use */
export const TDFN_SECTORS = getTdfnList();

export function formatCHF(amount: number): string {
  return new Intl.NumberFormat("de-CH", {
    style: "currency",
    currency: "CHF",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatPercent(rate: number): string {
  return `${(rate * 100).toFixed(1)}%`;
}
