/**
 * LPP (2nd Pillar) — Swiss Occupational Pension Rules for 2026
 *
 * Reference: LPP / BVG legislation, Federal Council parameters for 2026
 * All base constants are imported from @/lib/social-insurance-rates.ts
 * (single source of truth for all social-insurance parameters).
 */

import {
  BVG_ENTRY_THRESHOLD_ANNUAL,
  BVG_ENTRY_THRESHOLD_MONTHLY,
  BVG_MAX_INSURABLE_ANNUAL,
  BVG_COORDINATION_DEDUCTION_ANNUAL,
  BVG_COORDINATION_DEDUCTION_MONTHLY,
  BVG_MAX_INSURED_ANNUAL,
  BVG_MIN_INSURED_ANNUAL,
  BVG_MAX_COVERABLE_ANNUAL,
  BVG_MIN_RETURN_RATE,
  BVG_AGE_BRACKETS,
  type BvgAgeBracket,
  getBvgRate as _getBvgRate,
} from "@/lib/social-insurance-rates";

// ─── Re-export LPP_2026 object (backwards-compatible) ──────────────

export const LPP_2026 = {
  entryThresholdAnnual: BVG_ENTRY_THRESHOLD_ANNUAL,
  entryThresholdMonthly: BVG_ENTRY_THRESHOLD_MONTHLY,
  maxInsurableAnnualSalary: BVG_MAX_INSURABLE_ANNUAL,
  coordinationDeductionAnnual: BVG_COORDINATION_DEDUCTION_ANNUAL,
  coordinationDeductionMonthly: BVG_COORDINATION_DEDUCTION_MONTHLY,
  maxInsuredAnnualSalary: BVG_MAX_INSURED_ANNUAL,
  minInsuredAnnualSalary: BVG_MIN_INSURED_ANNUAL,
  maxCoverableAnnualSalary: BVG_MAX_COVERABLE_ANNUAL,
  minReturnRate: BVG_MIN_RETURN_RATE,
} as const;

// ─── Age-based default LPP contribution rates (re-exported) ──────

export type LppAgeBracket = {
  /** Inclusive lower age bound */
  minAge: number;
  /** Inclusive upper age bound */
  maxAge: number;
  /** Default LPP rate (employer + employee combined) as a decimal */
  defaultRate: number;
  /** Label for display */
  label: string;
};

/**
 * Default BVG/LPP bonification rates by age bracket.
 * Derived from the central BVG_AGE_BRACKETS in social-insurance-rates.ts.
 */
export const LPP_DEFAULT_AGE_BRACKETS: LppAgeBracket[] = BVG_AGE_BRACKETS.map(b => ({
  minAge: b.minAge,
  maxAge: b.maxAge,
  defaultRate: b.rate,
  label: b.label,
}));

// ─── Types ─────────────────────────────────────────────────────────

export type LppEnrollmentResult = {
  mustEnroll: boolean;
  grossMonthly: number;
  threshold: number;
  message: string;
};

export type LppContributionResult = {
  grossMonthly: number;
  grossAnnual: number;
  coordinationDeductionMonthly: number;
  insuredMonthly: number;
  insuredAnnual: number;
  lppRate: number;
  lppContributionMonthly: number;
  lppContributionAnnual: number;
  ageBracketLabel: string;
  belowThreshold: boolean;
};

// ─── Functions ─────────────────────────────────────────────────────

/**
 * Check whether an employee must be enrolled in an LPP plan.
 */
export function checkLppEnrollment(grossMonthlySalary: number): LppEnrollmentResult {
  const threshold = LPP_2026.entryThresholdMonthly;
  const mustEnroll = grossMonthlySalary > threshold;

  if (mustEnroll) {
    return {
      mustEnroll: true,
      grossMonthly: grossMonthlySalary,
      threshold,
      message:
        `The gross monthly salary of CHF ${grossMonthlySalary.toLocaleString('de-CH', { minimumFractionDigits: 2 })} ` +
        `exceeds the LPP entry threshold of CHF ${threshold.toLocaleString('de-CH', { minimumFractionDigits: 2 })}/month ` +
        `(CHF ${LPP_2026.entryThresholdAnnual.toLocaleString('de-CH')}/year). ` +
        `This employee must be enrolled in an LPP (2nd pillar) insurance plan, ` +
        `or declared to the company's existing LPP insurer.`,
    };
  }

  return {
    mustEnroll: false,
    grossMonthly: grossMonthlySalary,
    threshold,
    message:
      `The gross monthly salary of CHF ${grossMonthlySalary.toLocaleString('de-CH', { minimumFractionDigits: 2 })} ` +
      `is below the LPP entry threshold of CHF ${threshold.toLocaleString('de-CH', { minimumFractionDigits: 2 })}/month. ` +
      `No mandatory LPP enrollment required.`,
  };
}

/**
 * Get the employee's age on January 1 of the current contribution year.
 */
export function getAgeOnJan1(dateOfBirth: string | Date, referenceYear?: number): number {
  const dob = typeof dateOfBirth === 'string' ? new Date(dateOfBirth) : dateOfBirth;
  const year = referenceYear ?? new Date().getFullYear();
  // Age on Jan 1 of the contribution year
  return year - dob.getFullYear();
}

/**
 * Look up the LPP rate for a given age.
 * Uses custom brackets if provided (company-specific insurer rates),
 * otherwise falls back to the legal default brackets.
 */
export function getLppRate(
  ageOnJan1: number,
  customBrackets?: LppAgeBracket[]
): { rate: number; bracket: LppAgeBracket | null } {
  const brackets = customBrackets ?? LPP_DEFAULT_AGE_BRACKETS;
  const bracket = brackets.find((b) => ageOnJan1 >= b.minAge && ageOnJan1 <= b.maxAge) ?? null;
  return { rate: bracket?.defaultRate ?? 0, bracket };
}

/**
 * Calculate full LPP contribution details for an employee.
 */
export function calculateLppContribution(
  grossMonthlySalary: number,
  dateOfBirth: string | Date,
  customBrackets?: LppAgeBracket[],
  referenceYear?: number
): LppContributionResult {
  const grossAnnual = grossMonthlySalary * 12;
  const belowThreshold = grossMonthlySalary <= LPP_2026.entryThresholdMonthly;

  if (belowThreshold) {
    return {
      grossMonthly: grossMonthlySalary,
      grossAnnual,
      coordinationDeductionMonthly: 0,
      insuredMonthly: 0,
      insuredAnnual: 0,
      lppRate: 0,
      lppContributionMonthly: 0,
      lppContributionAnnual: 0,
      ageBracketLabel: 'Below entry threshold',
      belowThreshold: true,
    };
  }

  const ageOnJan1 = getAgeOnJan1(dateOfBirth, referenceYear);
  const { rate, bracket } = getLppRate(ageOnJan1, customBrackets);

  // Coordinated salary (insured portion)
  const coordDeductionMonthly = LPP_2026.coordinationDeductionMonthly;
  let insuredMonthly = grossMonthlySalary - coordDeductionMonthly;

  // Floor: minimum insured salary
  const minInsuredMonthly = LPP_2026.minInsuredAnnualSalary / 12;
  if (insuredMonthly < minInsuredMonthly) {
    insuredMonthly = minInsuredMonthly;
  }

  // Cap: maximum insured salary
  const maxInsuredMonthly = LPP_2026.maxInsuredAnnualSalary / 12;
  if (insuredMonthly > maxInsuredMonthly) {
    insuredMonthly = maxInsuredMonthly;
  }

  const insuredAnnual = insuredMonthly * 12;
  const lppContributionMonthly = insuredMonthly * rate;
  const lppContributionAnnual = lppContributionMonthly * 12;

  return {
    grossMonthly: grossMonthlySalary,
    grossAnnual,
    coordinationDeductionMonthly: coordDeductionMonthly,
    insuredMonthly,
    insuredAnnual,
    lppRate: rate,
    lppContributionMonthly,
    lppContributionAnnual,
    ageBracketLabel: bracket?.label ?? `Age ${ageOnJan1} (no matching bracket)`,
    belowThreshold: false,
  };
}

/**
 * Build a human-readable LPP context string for the AI assistant.
 */
export function buildLppContextForAI(): string {
  return `
=== LPP / 2nd Pillar (BVG) — 2026 Parameters ===
Entry threshold: CHF ${LPP_2026.entryThresholdAnnual.toLocaleString('de-CH')}/year (CHF ${LPP_2026.entryThresholdMonthly.toFixed(2)}/month)
Maximum insurable annual salary (LAA): CHF ${LPP_2026.maxInsurableAnnualSalary.toLocaleString('de-CH')}
Coordination deduction: CHF ${LPP_2026.coordinationDeductionAnnual.toLocaleString('de-CH')}/year (CHF ${LPP_2026.coordinationDeductionMonthly.toFixed(2)}/month)
Maximum insured (coordinated) salary: CHF ${LPP_2026.maxInsuredAnnualSalary.toLocaleString('de-CH')}/year
Minimum insured (coordinated) salary: CHF ${LPP_2026.minInsuredAnnualSalary.toLocaleString('de-CH')}/year
Maximum coverable salary (surobligatoire): CHF ${LPP_2026.maxCoverableAnnualSalary.toLocaleString('de-CH')}/year
Minimum return rate on retirement savings: ${(LPP_2026.minReturnRate * 100).toFixed(2)}%

Insured salary formula: Gross annual salary − CHF ${LPP_2026.coordinationDeductionAnnual.toLocaleString('de-CH')} (coordination deduction)
Contribution = Insured salary × LPP rate (age-dependent)

Default LPP contribution rates by age:
${LPP_DEFAULT_AGE_BRACKETS.map((b) => `  ${b.label}`).join('\n')}

Note: Actual rates may differ per insurer. Rates above are legal BVG minimums.
`.trim();
}
