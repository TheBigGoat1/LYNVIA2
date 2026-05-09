import { TaxInput, TaxGrossNetDetail } from '../typesClient';
import { TaxType } from '../types';

export interface TaxDeductionDefinitionInput {
  target?: string;
  amount?: number;
  min?: number;
  multiplier?: number;
}

export interface TaxDeductionDefinition {
  id: string;
  name?: string;
  rule: (taxInput: TaxInput, taxType: TaxType) => boolean;
  input: (
    taxInput: TaxInput,
    grossDeductions: TaxGrossNetDetail[]
  ) => TaxDeductionDefinitionInput[];
  applyAlways?: boolean;
}

export interface TaxDeductionTableItem {
  id: string;
  name: { de: string };
  format: string;
  maximum: number;
  minimum: number;
  percent: number;
  amount: number;
}

export interface TaxDeductionTable {
    type: string;
    items: TaxDeductionTableItem[];
}

export interface TaxDeductionTableExtended extends TaxDeductionTable {
  itemsById: Map<string, TaxDeductionTableItem>;
}
