import { NextResponse } from 'next/server';
import { taxInputData } from '@/lib/taxes/constants';

export async function GET() {
  return NextResponse.json(taxInputData);
}
