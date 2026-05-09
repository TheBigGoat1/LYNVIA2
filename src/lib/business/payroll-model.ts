import { INDIVIDUAL_BENEFITS_SOURCE_INDEX } from "@/lib/scenario-calculator/individual-benefits-rules";
import {
  calculateAdoptionAllowance,
  calculateBirthAllowance,
  calculateComplementaryBenefits,
  calculateFamilyAllowances,
  calculateHealthInsuranceSubsidy,
  calculateMaternityAllowance,
  calculateSocialDeductions,
} from "@/lib/scenario-calculator/calculations";
import {
  AHV_IV_EO_EMPLOYER_RATE,
  ALV_EMPLOYER_RATE,
  ALV_MAX_INSURABLE_SALARY,
} from "@/lib/social-insurance-rates";

export type PayrollHouseholdProfile = {
  grossSalary: number;
  age: number;
  canton: string;
  maritalStatus: "single" | "married";
  dependents: number;
};

export type PayrollSnapshot = {
  employeeSocialDeductions: ReturnType<typeof calculateSocialDeductions>;
  employerContributions: {
    ahv: number;
    alv: number;
    bvg: number;
    total: number;
  };
  annualFamilyAllowance: number;
  monthlyFamilyAllowance: number;
  estimatedNetPayBeforeTax: number;
  monthlyEmployerCost: number;
  annualEmployerCost: number;
  healthSubsidy: ReturnType<typeof calculateHealthInsuranceSubsidy>;
  complementaryBenefits: ReturnType<typeof calculateComplementaryBenefits>;
  // leaveCoverage removed as per requirements
};

export type WorkforceScenarioSummary = {
  perHire: PayrollSnapshot;
  totals: {
    annualGrossPayroll: number;
    annualEmployeeDeductions: number;
    annualEmployerContributions: number;
    annualFamilyAllowances: number;
    annualEmployerCost: number;
    monthlyEmployerCost: number;
    annualNetPayBeforeTax: number;
  };
  sourceIndex: typeof INDIVIDUAL_BENEFITS_SOURCE_INDEX;
};

export function calculateEmployerContributions(grossSalary: number, age: number) {
  const employeeSide = calculateSocialDeductions(grossSalary, age);
  const ahv = grossSalary * AHV_IV_EO_EMPLOYER_RATE;
  const alv = Math.min(grossSalary, ALV_MAX_INSURABLE_SALARY) * ALV_EMPLOYER_RATE;
  const bvg = employeeSide.bvg; // employer matches employee share
  return {
    ahv,
    alv,
    bvg,
    total: ahv + alv + bvg,
  };
}

export function calculatePayrollSnapshot(profile: PayrollHouseholdProfile): PayrollSnapshot {
  const employeeSocialDeductions = calculateSocialDeductions(profile.grossSalary, profile.age);
  const employerContributions = calculateEmployerContributions(profile.grossSalary, profile.age);
  const annualFamilyAllowance = calculateFamilyAllowances(profile.canton, profile.dependents);
  const monthlyFamilyAllowance = annualFamilyAllowance / 12;
  const estimatedNetPayBeforeTax = profile.grossSalary - employeeSocialDeductions.total + annualFamilyAllowance;
  const annualEmployerCost = profile.grossSalary + employerContributions.total + annualFamilyAllowance;
  const monthlyEmployerCost = annualEmployerCost / 12;

  return {
    employeeSocialDeductions,
    employerContributions,
    annualFamilyAllowance,
    monthlyFamilyAllowance,
    estimatedNetPayBeforeTax,
    annualEmployerCost,
    monthlyEmployerCost,
    healthSubsidy: calculateHealthInsuranceSubsidy(
      profile.canton,
      profile.maritalStatus,
      profile.grossSalary,
      profile.dependents
    ),
    complementaryBenefits: calculateComplementaryBenefits(
      profile.canton,
      profile.maritalStatus,
      profile.grossSalary,
      profile.dependents
    ),
    // leaveCoverage removed as per requirements
  };
}

export function calculateWorkforceScenarioSummary(
  profile: PayrollHouseholdProfile,
  numberOfHires: number
): WorkforceScenarioSummary {
  const perHire = calculatePayrollSnapshot(profile);

  return {
    perHire,
    totals: {
      annualGrossPayroll: profile.grossSalary * numberOfHires,
      annualEmployeeDeductions: perHire.employeeSocialDeductions.total * numberOfHires,
      annualEmployerContributions: perHire.employerContributions.total * numberOfHires,
      annualFamilyAllowances: perHire.annualFamilyAllowance * numberOfHires,
      annualEmployerCost: perHire.annualEmployerCost * numberOfHires,
      monthlyEmployerCost: perHire.monthlyEmployerCost * numberOfHires,
      annualNetPayBeforeTax: perHire.estimatedNetPayBeforeTax * numberOfHires,
    },
    sourceIndex: INDIVIDUAL_BENEFITS_SOURCE_INDEX,
  };
}
