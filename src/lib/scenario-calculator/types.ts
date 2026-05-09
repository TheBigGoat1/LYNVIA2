// ============================================================================
// SCENARIO CALCULATOR TYPES
// ============================================================================

export type ScenarioType =
  | "income_change"
  | "job_loss"
  | "child_birth"
  | "marriage"
  | "pillar_3a"
  | "pillar_2_buyback"
  | "supplementary_benefits"
  | "vat_comparison";

export interface ScenarioConfig {
  id: ScenarioType;
  title: string;
  description: string;
  icon: string;
  available: boolean;
}

export interface TaxCalculationResult {
  totalTax: number;
  federalTax: number;
  cantonalTax: number;
  municipalTax: number;
  churchTax: number;
  wealthTax: number;
  netIncome: number;
  effectiveTaxRate: number;
  marginalTaxRate: number;
  socialDeductions: {
    ahv: number;
    alv: number;
    bvg: number;
    nbuv: number;
    total: number;
  };
  locationId?: number;
  locationName?: string;
  canton?: string;
}

export interface LocationSearchResult {
  TaxLocationID: number;
  ZipCode: string;
  BfsID: number;
  CantonID: number;
  BfsName: string;
  City: string;
  Canton: string;
  LongName: string;
}


export interface SituationSummary {
  grossIncome: number;
  totalTax: number;
  netIncome: number;
  effectiveTaxRate: number;
  additionalBenefits?: number;
  benefitsBreakdown?: BenefitItem[];
}

export interface BenefitItem {
  label: string;
  amount: number;
  type: "allowance" | "subsidy" | "deduction" | "benefit";
}

export interface ScenarioComparison {
  taxDifference: number;
  taxDifferencePct: number;
  netIncomeChange: number;
  netIncomeChangePct: number;
}

export interface ScenarioAnalysis {
  summary: string;
  recommendations: string[];
  impacts: string[];
}

export interface ScenarioResult {
  currentSituation: SituationSummary;
  futureSituation: SituationSummary;
  comparison: ScenarioComparison;
  analysis: ScenarioAnalysis;
  metadata: {
    scenarioType: string;
    scenarioId?: ScenarioType;
    location: string;
    calculatedAt: string;
  };
}
