import { TaxType } from '../types';

export const taxTarifGroups = [
  'VERHEIRATET',
  'LEDIG_MIT_KINDER',
  'LEDIG_ALLEINE',
  'LEDIG_KONKUBINAT'
] as const;

export type TaxTarifTableType = 'ZUERICH' | 'FLATTAX' | 'BUND' | 'FREIBURG' | 'FORMEL';
export type TaxTarifTarget = 'BUND' | 'KANTON' | 'GEMEINDE';

export interface TaxTarifTableItem {
  formula: string;
  taxes: number;
  percent: number;
  amount: number;
}

export interface TaxTarif {
  tableType: TaxTarifTableType;
  taxType: TaxType;
  group: string;
  splitting: number;
  table: TaxTarifTableItem[];
}

export type TaxTarifGroup = (typeof taxTarifGroups)[number];
export type TaxTarifGroupWithFallback = Array<(typeof taxTarifGroups)[number]>;

export interface TaxTarifRaw {
  TaxType: string;
  Group: string;
  Target: TaxTarifTarget;
  Splitting: number;
  TableType: string;
  Table: {
    Formula: string;
    Taxes: number;
    Percent: number;
    Amount: number;
  }[];
  Location: {
    TaxLocationID: number;
    ZipCode: string;
    BfsID: number;
    CantonID: number;
    BfsName: string;
    City: string;
    Canton: string;
  };
}
