import { promises as fs } from 'fs';
import path from 'path';
import { TaxLocation } from '../typesClient';

const locationsByYearAndCity = new Map<number, Map<number, TaxLocation>>();
const locationsByYear = new Map<number, TaxLocation[]>();

const loadLocationsIfRequired = async (year: number) => {
  const dataYear = year;
  if (locationsByYearAndCity.has(dataYear)) return;

  const resolvedPath = path.resolve(process.cwd(), `src/data/parsed/${dataYear}/locations.json`);
  const locations: TaxLocation[] = JSON.parse(await fs.readFile(resolvedPath, 'utf-8'));

  const locationsByCity = new Map<number, TaxLocation>();
  locationsByYearAndCity.set(dataYear, locationsByCity);

  locations.forEach((location) => {
    locationsByCity.set(location.BfsID, location);
  });

  locationsByYear.set(dataYear, locations);
};

export const getCantonIdByCityId = async (cityId: number, year: number) => {
  const dataYear = year;
  await loadLocationsIfRequired(dataYear);
  const location = locationsByYearAndCity.get(dataYear)?.get(cityId);
  if (!location) throw new Error(`Location not found for ${cityId}, ${dataYear}`);
  return location.CantonID;
};

export const getTaxLocations = async (year: number) => {
  const dataYear = year;
  await loadLocationsIfRequired(dataYear);
  return locationsByYear.get(dataYear);
};
