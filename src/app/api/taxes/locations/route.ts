import { NextResponse } from 'next/server';
import { getTaxLocations } from '@/lib/taxes/location';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const yearParam = Number(searchParams.get('year'));
  const year = Number.isFinite(yearParam) && yearParam > 0 ? yearParam : 2022;
  const locations = await getTaxLocations(year);
  return NextResponse.json(locations ?? []);
}
