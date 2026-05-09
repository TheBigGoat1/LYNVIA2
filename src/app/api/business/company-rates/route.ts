import { NextResponse } from 'next/server';
import admin from '@/firebase/admin-config';
import { verifyCompanyEmployeeCaller } from '@/app/api/business/company-employees/_auth';
import { companyRatesSchema } from '@/lib/business/company-rates-schema';

export async function PUT(request: Request) {
  const auth = await verifyCompanyEmployeeCaller(request);
  if (!auth.ok) return auth.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = companyRatesSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed', issues: parsed.error.issues }, { status: 400 });
  }

  const db = admin.firestore();
  await db.collection('companies').doc(auth.companyId).collection('settings').doc('rates').set(parsed.data, { merge: true });

  return NextResponse.json({ success: true });
}
