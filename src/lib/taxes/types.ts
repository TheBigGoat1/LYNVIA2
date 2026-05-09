import { DineroChf } from '../utils/dinero';

export type TaxType =
  | 'VERMOEGENSSTEUER'
  | 'EINKOMMENSSTEUER'
  | 'KAPITALSTEUER'
  | 'ERBSCHAFT'
  | 'VORSORGESTEUER';

export interface TaxDeductionResultItem {
  id: string;
  name: string;
  target: string;
  amountCanton: DineroChf;
  amountBund: DineroChf;
}

export interface TaxLocationRaw {
  TaxLocationID: number;
  ZipCode: string;
  BfsID: number;
  CantonID: number;
  BfsName: string;
  City: string;
  Canton: string;
}
