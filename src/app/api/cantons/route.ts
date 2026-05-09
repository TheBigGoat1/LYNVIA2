import { NextResponse } from 'next/server';
import { swissCantons } from '@/lib/constants';

export async function GET() {
  return NextResponse.json(swissCantons);
}
