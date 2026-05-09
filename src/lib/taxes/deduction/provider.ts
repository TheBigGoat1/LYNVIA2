import { promises as fs } from 'fs';
import path from 'path';
import { TaxDeductionTableExtended, TaxDeductionTable } from './types';
import { dataParsedBasePath } from '../constants';
import { TaxType } from '../types';

const taxDeductionsByYearAndCanton = new Map<
  number,
  Map<number, Map<TaxType, TaxDeductionTableExtended>>
>();

const loadDeductionsIfRequired = async (cantonId: number, year: number) => {
  const dataYear = year;
  if (taxDeductionsByYearAndCanton.get(dataYear)?.has(cantonId)) return;

  const resolvedPath = path.resolve(
    process.cwd(),
    `src/data/parsed/${dataYear}/deductions/${cantonId}.json`
  );
  const deductionsRaw: TaxDeductionTable[] = JSON.parse(await fs.readFile(resolvedPath, 'utf-8'));

  let taxDeductionsByCanton = taxDeductionsByYearAndCanton.get(dataYear);

  if (!taxDeductionsByCanton) {
    taxDeductionsByCanton = new Map();
    taxDeductionsByYearAndCanton.set(dataYear, taxDeductionsByCanton);
  }

  deductionsRaw.forEach((deductionRaw) => {
    if (!taxDeductionsByCanton) throw new Error('taxDeductionsByCanton is undefined');

    let deductionsByTaxType = taxDeductionsByCanton.get(cantonId);

    if (!deductionsByTaxType) {
      deductionsByTaxType = new Map();
      taxDeductionsByCanton.set(cantonId, deductionsByTaxType);
    }

    const deductions = deductionsByTaxType.get(deductionRaw.type as TaxType);

    if (!deductions) {
      deductionsByTaxType.set(deductionRaw.type as TaxType, {
        ...deductionRaw,
        itemsById: new Map(deductionRaw.items.map((item) => [item.id, item]))
      });
    }
  });
};

export const getTaxDecutionTable = async (cantonId: number, year: number, taxType: TaxType) => {
  const dataYear = year;
  await loadDeductionsIfRequired(cantonId, dataYear);
  const deductionTable = taxDeductionsByYearAndCanton.get(dataYear)?.get(cantonId)?.get(taxType);
  if (!deductionTable)
    throw new Error(`Deduction table not found for canton ${cantonId}, tax type ${taxType}`);

  return deductionTable;
};
