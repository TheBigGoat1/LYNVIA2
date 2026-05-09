import { promises as fs } from 'fs';
import path from 'path';
import { TaxFactors } from './types';
import { TaxInput } from '../typesClient';

const taxFactorsByYearCantonAndCity = new Map<number, Map<number, Map<number, TaxFactors>>>();

const loadFactorsIfRequired = async (cantonId: number, year: number) => {
  const dataYear = year;
  let factorsByCantonAndCity = taxFactorsByYearCantonAndCity.get(dataYear);
  let factorsByCity = factorsByCantonAndCity?.get(cantonId);
  if (factorsByCity) return;

  const resolvedPath = path.resolve(
    process.cwd(),
    `src/data/parsed/${dataYear}/factors/${cantonId}.json`
  );
  const factors: TaxFactors[] = JSON.parse(await fs.readFile(resolvedPath, 'utf-8'));

  if (!factorsByCantonAndCity) {
    factorsByCantonAndCity = new Map();
    taxFactorsByYearCantonAndCity.set(dataYear, factorsByCantonAndCity);
  }
  factorsByCity = new Map();

  factors.forEach((factor) => {
    if (!factorsByCity) throw new Error('factorsByCity is undefined');

    const factorExisting = factorsByCity.get(factor.Location.BfsID);

    if (!factorExisting) {
      factorsByCity.set(factor.Location.BfsID, factor);
    }
  });

  factorsByCantonAndCity.set(cantonId, factorsByCity);
};

export const getTaxFactors = async (taxInput: TaxInput) => {
  const dataYear = taxInput.year;
  await loadFactorsIfRequired(taxInput.cantonId, dataYear);
  const factor = taxFactorsByYearCantonAndCity
    .get(dataYear)
    ?.get(taxInput.cantonId)
    ?.get(taxInput.locationId);
  if (!factor)
    throw new Error(
      `Factor not found for canton: ${taxInput.cantonId}, year: ${dataYear}, city: ${taxInput.locationId}`
    );
  return factor;
};
