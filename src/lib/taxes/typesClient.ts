
export type TaxCalculationType = 'incomeAndWealth' | 'capital';
export type TaxRelationship = 's' | 'm' | 'rp' | 'c';
export type TaxConfession = 'christ' | 'roman' | 'protestant' | 'other';
export type TaxIncomeType = 'gross' | 'net' | 'taxable';

export interface LocalizedText {
  de: string;
  en: string;
  fr?: string;
  it?: string;
  es?: string;
}

export interface ValueLabelItem<T extends string> {
  value: T;
  label: LocalizedText;
}

export type TaxCalculationTypeList = readonly ValueLabelItem<TaxCalculationType>[];
export type TaxRelationshipList = readonly ValueLabelItem<TaxRelationship>[];
export type TaxConfessionList = readonly ValueLabelItem<TaxConfession>[];
export type TaxIncomeTypeList = readonly ValueLabelItem<TaxIncomeType>[];

export interface TaxInputPerson {
  age: number;
  confession: TaxConfession;
  incomeType: TaxIncomeType;
  income: number;
  pkDeduction?: number;
  deductions?: TaxDeductionPerPersonInput;
}

export interface TaxInput {
  calculationType: TaxCalculationType;
  relationship: TaxRelationship;
  locationId: number;
  cantonId: number;
  year: number;
  children: number;
  fortune: number;
  persons: TaxInputPerson[];
  deductions?: TaxDeductionGeneralInput;
}

export interface TaxGrossNetDetail {
  person: TaxInputPerson;
  grossIncome: number;
  ahvIvEo: number;
  alv: number;
  nbu: number;
  pk: number;
  netIncome: number;
}

export interface TaxDeductionResultItemDisplay {
  id: string;
  name: string;
  target: string;
  amountCanton: number;
  amountBund: number;
}

export interface TaxDeductionResult {
  grossNetDetails?: TaxGrossNetDetail[];
  netIncomeCanton: number;
  netIncomeBund: number;
  deductionsIncome: TaxDeductionResultItemDisplay[];
  deductionsFortune: TaxDeductionResultItemDisplay[];
  taxableFortuneCanton: number;
  taxableIncomeCanton: number;
  taxableIncomeBund: number;
}

export interface TaxResult {
  input: TaxInput;
  taxesIncomeCanton: number;
  taxesIncomeCity: number;
  taxesIncomeChurch: number;
  taxesFortuneCanton: number;
  taxesFortuneCity: number;
  taxesFortuneChurch: number;
  taxesIncomeBund: number;
  taxesPersonnel: number;
  taxesTotal: number;
  details: TaxDeductionResult;
}

export interface TaxLocation {
  TaxLocationID: number;
  BfsID: number;
  CantonID: number;
  BfsName: string;
  Canton: string;
}

export interface TaxDeductionPerPersonInput {
  insurancePremiums?: number;
  pillar3a?: number;
  mealCosts?: number;
  travelExpenses?: number;
  otherProfessionalExpenses?: number;
  professionalExpensesSideline?: number;
  otherDeductions?: number;
}

export interface TaxDeductionGeneralInput {
  insurancePremiumsKids?: number;
  childcareCosts?: number;
  debtInterest?: number;
  maintenanceCostsRealEstate?: number;
  otherDeductions?: number;
}

interface TaxDeductionFieldConfig {
  label: LocalizedText;
  hint?: LocalizedText;
  default?: number;
  suggestion?: number;
  defaultPerson?: number;
  withChildrenOnly?: boolean;
  defaultPerChild?: number;
  dependsOnWorkloadFactor?: boolean;
  defaultFlatRate?: boolean;
  defaultFactor?: number;
}

export type TaxDeductionFieldConfigs = Record<string, TaxDeductionFieldConfig>;

export type TaxDeductionPersonFieldConfigs = Record<
  keyof TaxDeductionPerPersonInput,
  TaxDeductionFieldConfig
>;

export type TaxDeductionGeneralFieldConfigs = Record<
  keyof TaxDeductionGeneralInput,
  TaxDeductionFieldConfig
>;

export interface TaxInputData {
  calculationTypes: TaxCalculationTypeList;
  years: number[];
  relationships: TaxRelationshipList;
  confessions: TaxConfessionList;
  incomeTypes: TaxIncomeTypeList;
  deductionsGeneral: TaxDeductionGeneralFieldConfigs;
  deductionsPerson: TaxDeductionPersonFieldConfigs;
}
