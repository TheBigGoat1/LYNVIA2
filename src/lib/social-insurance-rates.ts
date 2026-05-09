/**
 * Swiss Social Insurance Rates — 2026
 *
 * ══════════════════════════════════════════════════════════════
 *  SINGLE SOURCE OF TRUTH for all social-insurance calculations.
 *  Every module (payroll, scenarios, tax deductions, AI context)
 *  MUST import from here — never hardcode rates elsewhere.
 * ══════════════════════════════════════════════════════════════
 *
 * References:
 *  - OFAS / BSV tables for 2026
 *  - LPP / BVG Federal Council parameters 2026
 */

// ─── 1st Pillar: AHV / IV / EO (AVS / AI / APG) ────────────────

/** AHV/IV/EO employee share (5.3% total = AHV 4.35 + IV 0.7 + EO 0.25) */
export const AHV_IV_EO_RATE = 0.05275;

/** AHV/IV/EO employer share — identical to employee share */
export const AHV_IV_EO_EMPLOYER_RATE = 0.05275;

// ─── Unemployment Insurance (AC / ALV) ──────────────────────────

/** ALV employee rate */
export const ALV_RATE = 0.011;

/** ALV employer rate — identical to employee rate */
export const ALV_EMPLOYER_RATE = 0.011;

/** Maximum annual salary subject to ALV (CHF) */
export const ALV_MAX_INSURABLE_SALARY = 148_200;

// ─── Accident Insurance (LAA / UVG) ────────────────────────────

/** Non-occupational accident (NBU/NBUV) default employee rate — varies by insurer */
export const NBUV_DEFAULT_RATE = 0.007;

/** Occupational accident (BU/BUV) default employer rate — varies by insurer */
export const BUV_DEFAULT_RATE = 0.005;

/** Maximum NBU/LAA insurable annual salary */
export const LAA_MAX_INSURABLE_SALARY = 148_200;

// ─── Daily Sickness Insurance (IJM / KTG) ──────────────────────

/** IJM/KTG default rate — highly variable by insurer, this is a common baseline */
export const IJM_DEFAULT_RATE = 0.021;

// ─── Family Allowance Fund (CAF / FAK) ─────────────────────────

/** CAF employer-only rate — canton-dependent, this is a common default */
export const CAF_DEFAULT_RATE = 0.00171;

// ─── 2nd Pillar: LPP / BVG ────────────────────────────────────

/** LPP entry threshold — annual (CHF) */
export const BVG_ENTRY_THRESHOLD_ANNUAL = 22_680;

/** LPP entry threshold — monthly (CHF) */
export const BVG_ENTRY_THRESHOLD_MONTHLY = 1_890;

/** LPP coordination deduction — annual (CHF) */
export const BVG_COORDINATION_DEDUCTION_ANNUAL = 26_460;

/** LPP coordination deduction — monthly (CHF) */
export const BVG_COORDINATION_DEDUCTION_MONTHLY = 26_460 / 12; // 2205

/** Maximum insurable annual salary (LAA ceiling, also used for BVG cap) */
export const BVG_MAX_INSURABLE_ANNUAL = 90_720;

/** Maximum insured (coordinated) annual salary */
export const BVG_MAX_INSURED_ANNUAL = 64_260;

/** Minimum insured (coordinated) annual salary */
export const BVG_MIN_INSURED_ANNUAL = 3_780;

/** Maximum coverable annual salary (surobligatoire) */
export const BVG_MAX_COVERABLE_ANNUAL = 907_200;

/** Minimum LPP return rate on retirement savings */
export const BVG_MIN_RETURN_RATE = 0.0125;

// ─── BVG Age-based contribution rates (legal minimums) ─────────

export type BvgAgeBracket = {
  minAge: number;
  maxAge: number;
  /** Combined employer + employee rate as a decimal */
  rate: number;
  label: string;
};

export const BVG_AGE_BRACKETS: BvgAgeBracket[] = [
  { minAge: 17, maxAge: 24, rate: 0.005, label: '17–24 (risk only, 0.5%)' },
  { minAge: 25, maxAge: 34, rate: 0.07,  label: '25–34 (7%)' },
  { minAge: 35, maxAge: 44, rate: 0.10,  label: '35–44 (10%)' },
  { minAge: 45, maxAge: 54, rate: 0.15,  label: '45–54 (15%)' },
  { minAge: 55, maxAge: 65, rate: 0.18,  label: '55–65 (18%)' },
];

/**
 * Look up the BVG contribution rate for a given age.
 * Returns the combined (employer + employee) rate; divide by 2 for employee share.
 */
export function getBvgRate(age: number, customBrackets?: BvgAgeBracket[]): number {
  const brackets = customBrackets ?? BVG_AGE_BRACKETS;
  const match = brackets.find(b => age >= b.minAge && age <= b.maxAge);
  return match?.rate ?? 0;
}

/**
 * Calculate the BVG-insured (coordinated) monthly salary.
 */
export function getBvgInsuredMonthlySalary(grossMonthlySalary: number): number {
  const grossAnnual = grossMonthlySalary * 12;
  if (grossAnnual <= BVG_ENTRY_THRESHOLD_ANNUAL) return 0;

  let insuredAnnual = grossAnnual - BVG_COORDINATION_DEDUCTION_ANNUAL;
  insuredAnnual = Math.max(insuredAnnual, BVG_MIN_INSURED_ANNUAL);
  insuredAnnual = Math.min(insuredAnnual, BVG_MAX_INSURED_ANNUAL);
  return insuredAnnual / 12;
}
