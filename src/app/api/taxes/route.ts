import { NextResponse } from 'next/server';
import { calculateTaxes } from '@/lib/taxes';
import { TaxInput } from '@/lib/taxes/typesClient';

export async function POST(request: Request) {
  try {
    const body: TaxInput = await request.json();
    const taxes = await calculateTaxes(body);
    return NextResponse.json(taxes);
  } catch (error: any) {
    console.error('Error calculating taxes:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to calculate taxes' },
      { status: 500 }
    );
  }
}
