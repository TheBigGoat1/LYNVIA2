import { promises as fs } from 'fs';
import path from 'path';
import { TaxTarif, TaxTarifGroup, TaxTarifGroupWithFallback } from './types';
import { TaxType } from '../types';

const taxTarifsByYearAndCanton = new Map<number, Map<number, Map<TaxType, TaxTarif[]>>>();

const loadTarifsIfRequired = async (cantonId: number, year: number) => {
  const dataYear = year;
  if (taxTarifsByYearAndCanton.get(dataYear)?.has(cantonId)) return;

  const resolvedPath = path.resolve(
    process.cwd(),
    `src/data/parsed/${dataYear}/tarifs/${cantonId}.json`
  );
  const tarifs: TaxTarif[] = JSON.parse(await fs.readFile(resolvedPath, 'utf-8'));

  let taxTarifsByCanton = taxTarifsByYearAndCanton.get(dataYear);

  if (!taxTarifsByCanton) {
    taxTarifsByCanton = new Map();
    taxTarifsByYearAndCanton.set(dataYear, taxTarifsByCanton);
  }

  tarifs.forEach((tarifRaw) => {
    if (!taxTarifsByCanton) throw new Error('taxTarifsByCanton is undefined');

    let tarifsByTaxType = taxTarifsByCanton.get(cantonId);

    if (!tarifsByTaxType) {
      tarifsByTaxType = new Map();
      taxTarifsByCanton.set(cantonId, tarifsByTaxType);
    }

    let tarifs = tarifsByTaxType.get(tarifRaw.taxType);

    if (!tarifs) {
      tarifs = [];
      tarifsByTaxType.set(tarifRaw.taxType, tarifs);
    }
    tarifs.push(tarifRaw);
  });
};

export const getTaxTarifTable = async (
  cantonId: number,
  year: number,
  taxType: TaxType,
  tarifGroup: TaxTarifGroupWithFallback
): Promise<[TaxTarif, TaxTarifGroup]> => {
  const dataYear = year;
  await loadTarifsIfRequired(cantonId, dataYear);

  const tarifTables = taxTarifsByYearAndCanton.get(dataYear)?.get(cantonId)?.get(taxType);
  if (!tarifTables)
    throw new Error(`No tarifs found for cantonId: ${cantonId}, tarifType: ${taxType}`);

  for (const group of tarifGroup) {
    const tarifTable = tarifTables.find(
      (tarif) => tarif.group === 'ALLE' || tarif.group.includes(group)
    );

    if (tarifTable) return [tarifTable, group];
  }

  throw new Error(
    `Tarif not found for cantonId: ${cantonId}, tarifType: ${taxType}, tarifGroup: ${tarifGroup}`
  );
};
