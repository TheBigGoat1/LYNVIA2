export type TaxDeclarationServiceId =
  | 'couple-inactive'
  | 'couple-retired'
  | 'couple-salaried'
  | 'single-inactive'
  | 'single-retired'
  | 'single-salaried'
  | 'permit-b-simplified';

export type ChildrenOption = '0' | '1' | '2' | '3' | '4' | '5_plus';
export type PropertiesOption = '0' | '1' | '2' | '3' | '4' | 'plus_4';
export type BankAssetsOption = '1_3' | '4_6' | '7_9' | '10_12';
export type DependentsOption = '0' | '1' | '2';

export type TaxServiceSelections = {
  children: ChildrenOption;
  properties: PropertiesOption;
  bankAssets: BankAssetsOption;
  dependents: DependentsOption;
};

export type TaxServicePricingBreakdown = {
  basePriceCents: number;
  childrenSurchargeCents: number;
  propertiesSurchargeCents: number;
  bankAssetsSurchargeCents: number;
  dependentsSurchargeCents: number;
  totalSurchargeCents: number;
  totalPriceCents: number;
};

export type TaxDeclarationServiceConfig = {
  id: TaxDeclarationServiceId;
  title: string;
  description: string;
  basePriceCents: number;
  hasVariants: boolean;
};

export const DEFAULT_TAX_SERVICE_SELECTIONS: TaxServiceSelections = {
  children: '0',
  properties: '0',
  bankAssets: '1_3',
  dependents: '0',
};

export const CHILDREN_OPTIONS: Array<{ value: ChildrenOption; label: string; units: number }> = [
  { value: '0', label: '0', units: 0 },
  { value: '1', label: '1', units: 1 },
  { value: '2', label: '2', units: 2 },
  { value: '3', label: '3', units: 3 },
  { value: '4', label: '4', units: 4 },
  { value: '5_plus', label: '5+', units: 5 },
];

export const PROPERTIES_OPTIONS: Array<{ value: PropertiesOption; label: string; units: number }> = [
  { value: '0', label: '0', units: 0 },
  { value: '1', label: '1', units: 1 },
  { value: '2', label: '2', units: 2 },
  { value: '3', label: '3', units: 3 },
  { value: '4', label: '4', units: 4 },
  { value: 'plus_4', label: '4+', units: 5 },
];

export const BANK_ASSETS_OPTIONS: Array<{ value: BankAssetsOption; label: string; surchargeCents: number }> = [
  { value: '1_3', label: '1–3', surchargeCents: 0 },
  { value: '4_6', label: '4–6', surchargeCents: 2000 },
  { value: '7_9', label: '7–9', surchargeCents: 4000 },
  { value: '10_12', label: '10–12', surchargeCents: 6000 },
];

export const DEPENDENTS_OPTIONS: Array<{ value: DependentsOption; label: string; units: number }> = [
  { value: '0', label: '0', units: 0 },
  { value: '1', label: '1', units: 1 },
  { value: '2', label: '2', units: 2 },
];

export const TAX_DECLARATION_SERVICE_CONFIG: Record<TaxDeclarationServiceId, TaxDeclarationServiceConfig> = {
  'couple-inactive': {
    id: 'couple-inactive',
    title: 'Tax declaration - Couple (Inactive)',
    description: 'Swiss tax declaration service for couples with inactive status, with dynamic pricing based on case complexity.',
    basePriceCents: 10000,
    hasVariants: true,
  },
  'couple-retired': {
    id: 'couple-retired',
    title: 'Tax declaration - Couple (Retired)',
    description: 'Swiss tax declaration service for retired couples, with dynamic pricing based on case complexity.',
    basePriceCents: 10000,
    hasVariants: true,
  },
  'couple-salaried': {
    id: 'couple-salaried',
    title: 'Tax declaration - Couple (Salaried)',
    description: 'Swiss tax declaration service for salaried couples, with dynamic pricing based on case complexity.',
    basePriceCents: 12000,
    hasVariants: true,
  },
  'single-inactive': {
    id: 'single-inactive',
    title: 'Tax declaration - Single person (Inactive)',
    description: 'Swiss tax declaration service for single inactive individuals, with dynamic pricing based on case complexity.',
    basePriceCents: 8000,
    hasVariants: true,
  },
  'single-retired': {
    id: 'single-retired',
    title: 'Tax declaration - Single person (Retired)',
    description: 'Swiss tax declaration service for single retired individuals, with dynamic pricing based on case complexity.',
    basePriceCents: 8000,
    hasVariants: true,
  },
  'single-salaried': {
    id: 'single-salaried',
    title: 'Tax declaration - Single person (Salaried)',
    description: 'Swiss tax declaration service for single salaried individuals, with dynamic pricing based on case complexity.',
    basePriceCents: 10000,
    hasVariants: true,
  },
  'permit-b-simplified': {
    id: 'permit-b-simplified',
    title: 'Simplified declaration for Permit B',
    description: 'Fixed-price simplified Swiss tax declaration service for Permit B cases.',
    basePriceCents: 8000,
    hasVariants: false,
  },
};

function findChildrenUnits(value: ChildrenOption): number {
  return CHILDREN_OPTIONS.find((option) => option.value === value)?.units ?? 0;
}

function findPropertiesUnits(value: PropertiesOption): number {
  return PROPERTIES_OPTIONS.find((option) => option.value === value)?.units ?? 0;
}

function findDependentsUnits(value: DependentsOption): number {
  return DEPENDENTS_OPTIONS.find((option) => option.value === value)?.units ?? 0;
}

function findBankAssetsSurcharge(value: BankAssetsOption): number {
  return BANK_ASSETS_OPTIONS.find((option) => option.value === value)?.surchargeCents ?? 0;
}

export function getTaxServicePricingBreakdown(
  serviceId: TaxDeclarationServiceId,
  selections: TaxServiceSelections = DEFAULT_TAX_SERVICE_SELECTIONS,
): TaxServicePricingBreakdown {
  const service = TAX_DECLARATION_SERVICE_CONFIG[serviceId];

  const basePriceCents = service.basePriceCents;

  if (!service.hasVariants) {
    return {
      basePriceCents,
      childrenSurchargeCents: 0,
      propertiesSurchargeCents: 0,
      bankAssetsSurchargeCents: 0,
      dependentsSurchargeCents: 0,
      totalSurchargeCents: 0,
      totalPriceCents: basePriceCents,
    };
  }

  const childrenSurchargeCents = findChildrenUnits(selections.children) * 1000;
  const propertiesSurchargeCents = findPropertiesUnits(selections.properties) * 3000;
  const bankAssetsSurchargeCents = findBankAssetsSurcharge(selections.bankAssets);
  const dependentsSurchargeCents = findDependentsUnits(selections.dependents) * 1000;

  const totalSurchargeCents =
    childrenSurchargeCents +
    propertiesSurchargeCents +
    bankAssetsSurchargeCents +
    dependentsSurchargeCents;

  return {
    basePriceCents,
    childrenSurchargeCents,
    propertiesSurchargeCents,
    bankAssetsSurchargeCents,
    dependentsSurchargeCents,
    totalSurchargeCents,
    totalPriceCents: basePriceCents + totalSurchargeCents,
  };
}

export function formatTaxServiceSelectionsForAudit(selections: TaxServiceSelections): string {
  const childrenLabel = CHILDREN_OPTIONS.find((option) => option.value === selections.children)?.label ?? selections.children;
  const propertiesLabel = PROPERTIES_OPTIONS.find((option) => option.value === selections.properties)?.label ?? selections.properties;
  const bankAssetsLabel = BANK_ASSETS_OPTIONS.find((option) => option.value === selections.bankAssets)?.label ?? selections.bankAssets;
  const dependentsLabel = DEPENDENTS_OPTIONS.find((option) => option.value === selections.dependents)?.label ?? selections.dependents;

  return `children:${childrenLabel};properties:${propertiesLabel};bankAssets:${bankAssetsLabel};dependents:${dependentsLabel}`;
}
