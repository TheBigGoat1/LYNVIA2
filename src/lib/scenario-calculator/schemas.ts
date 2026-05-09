import { z } from "zod";

// ============================================================================
// FORM SCHEMAS
// ============================================================================

export const incomeChangeSchema = z.object({
  currentGrossSalary: z.coerce.number().min(1, "Current salary is required"),
  newGrossSalary: z.coerce.number().min(1, "New salary is required"),
  locationId: z.coerce.number({invalid_type_error: 'Municipality is required'}).min(1, "Municipality is required"),
  maritalStatus: z.enum(["single", "married"]),
  dependents: z.coerce.number().min(0).max(10),
  age: z.coerce.number().min(18).max(99),
  confession: z.string().default("none"),
  fortune: z.coerce.number().min(0).default(0),
});

export const jobLossSchema = z.object({
  currentGrossSalary: z.coerce.number().min(1, "Current salary is required"),
  locationId: z.coerce.number({invalid_type_error: 'Municipality is required'}).min(1, "Municipality is required"),
  maritalStatus: z.enum(["single", "married"]),
  dependents: z.coerce.number().min(0).max(10),
  age: z.coerce.number().min(18).max(99),
  confession: z.string().default("none"),
  unemploymentDuration: z.coerce.number().min(1).max(24).default(6),
  hasChildren: z.boolean().default(false),
  yearsEmployed: z.coerce.number().min(0).max(50).default(5),
});

export const childBirthSchema = z.object({
  currentGrossSalary: z.coerce.number().min(1, "Your salary is required"),
  spouseSalary: z.coerce.number().min(0).default(0),
  locationId: z.coerce.number({invalid_type_error: 'Municipality is required'}).min(1, "Municipality is required"),
  maritalStatus: z.enum(["single", "married"]),
  dependents: z.coerce.number().min(0).max(10),
  age: z.coerce.number().min(18).max(99),
  confession: z.string().default("none"),
  estimatedChildcareCosts: z.coerce.number().min(0).default(15000),
});

export const marriageSchema = z.object({
  person1Salary: z.coerce.number().min(1, "Person 1 salary is required"),
  person1LocationId: z.coerce.number({invalid_type_error: 'Municipality for Person 1 is required'}).min(1, "Location for Person 1 is required."),
  person1Age: z.coerce.number().min(18).max(99),
  person2Salary: z.coerce.number().min(1, "Person 2 salary is required"),
  person2LocationId: z.coerce.number({invalid_type_error: 'Municipality for Person 2 is required'}).min(1, "Location for Person 2 is required."),
  person2Age: z.coerce.number().min(18).max(99),
  futureLocationId: z.coerce.number({invalid_type_error: 'Future municipality is required'}).min(1, "Future location is required"),
  combinedDependents: z.coerce.number().min(0).max(10),
});

export const pillar3aSchema = z.object({
  currentGrossSalary: z.coerce.number().min(1, "Salary is required"),
  locationId: z.coerce.number({invalid_type_error: 'Municipality is required'}).min(1, "Municipality is required"),
  maritalStatus: z.enum(["single", "married"]),
  dependents: z.coerce.number().min(0).max(10),
  age: z.coerce.number().min(18).max(99),
  confession: z.string().default("none"),
  contributionAmount: z.coerce.number().min(0).default(7056),
  hasOccupationalPension: z.boolean().default(true),
  annualReturnRate: z.coerce.number().min(0, "Return rate cannot be negative").max(20, "Return rate is too high").default(5),
  projectionYears: z.coerce.number().min(20, "Projection horizon must be at least 20 years").max(50, "Projection horizon is too long").default(20),
});

export const pillar2BuybackSchema = z.object({
  currentGrossSalary: z.coerce.number().min(1, "Salary is required"),
  locationId: z.coerce.number({invalid_type_error: 'Municipality is required'}).min(1, "Municipality is required"),
  maritalStatus: z.enum(["single", "married"]),
  dependents: z.coerce.number().min(0).max(10),
  age: z.coerce.number().min(25).max(65),
  confession: z.string().default("none"),
  buybackAmount: z.coerce.number().min(1000, "Minimum buyback CHF 1,000"),
  currentPensionGap: z.coerce.number().min(0).default(100000),
});

export const supplementaryBenefitsSchema = z.object({
  annualRetirementIncome: z.coerce.number().min(0).default(0),
  annualDisabilityIncome: z.coerce.number().min(0).default(0),
  otherAnnualIncome: z.coerce.number().min(0).default(0),
  annualHousingCosts: z.coerce.number().min(0).default(18000),
  annualHealthInsurancePremium: z.coerce.number().min(0).default(5400),
  netAssets: z.coerce.number().min(0).default(20000),
  locationId: z.coerce.number({invalid_type_error: 'Municipality is required'}).min(1, "Municipality is required"),
  maritalStatus: z.enum(["single", "married"]),
  dependents: z.coerce.number().min(0).max(10),
  age: z.coerce.number().min(18).max(99),
  receivesAiBenefits: z.boolean().default(false),
  isRetired: z.boolean().default(true),
});

export const vatComparisonSchema = z.object({
  ca: z.coerce.number().min(1, "Revenue is required"),
  secteur: z.string().min(1, "Sector is required"),
  achats: z.coerce.number().min(0).default(0),
  depenses: z.coerce.number().min(0).default(0),
});

export type IncomeChangeFormValues = z.infer<typeof incomeChangeSchema>;
export type JobLossFormValues = z.infer<typeof jobLossSchema>;
export type ChildBirthFormValues = z.infer<typeof childBirthSchema>;
export type MarriageFormValues = z.infer<typeof marriageSchema>;
export type Pillar3aFormValues = z.infer<typeof pillar3aSchema>;
export type Pillar2BuybackFormValues = z.infer<typeof pillar2BuybackSchema>;
export type SupplementaryBenefitsFormValues = z.infer<typeof supplementaryBenefitsSchema>;
export type VatComparisonFormValues = z.infer<typeof vatComparisonSchema>;
