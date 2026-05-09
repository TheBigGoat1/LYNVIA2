import { NextResponse } from 'next/server';
import admin from '@/firebase/admin-config';
import { verifyCompanyEmployeeCaller } from '@/app/api/business/company-employees/_auth';
import { employeeFirestoreSchema, employeePayloadForFirestore } from '@/lib/business/employee-firestore-schema';
import { assertEmployeeMeetsClaMinimum } from '@/lib/business/employee-cla-guard';
import { notifyAdminServer } from '@/lib/admin-notifications';

export async function POST(request: Request) {
  const auth = await verifyCompanyEmployeeCaller(request);
  if (!auth.ok) return auth.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = employeeFirestoreSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed', issues: parsed.error.issues }, { status: 400 });
  }

  const db = admin.firestore();
  const companySnap = await db.collection('companies').doc(auth.companyId).get();
  const companyData = companySnap.data() ?? {};
  const industry = companyData.industry as string | undefined;
  const canton = companyData.canton as string | undefined;
  const companyName = (companyData.companyName as string | undefined) || (companyData.name as string | undefined) || auth.companyId;

  const claCheck = assertEmployeeMeetsClaMinimum(industry, canton, parsed.data);
  if (!claCheck.ok) {
    return NextResponse.json({ error: claCheck.message }, { status: 400 });
  }

  const payload = {
    ...employeePayloadForFirestore(parsed.data),
    avsStatus: 'a_verifier',
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  const ref = await db.collection('companies').doc(auth.companyId).collection('employees').add(payload);

  try {
    await notifyAdminServer(db, {
      title: 'New employee added — social insurance declaration required',
      description: `${parsed.data.firstName} ${parsed.data.lastName} (${parsed.data.position}) was added to ${companyName}. Please declare to the relevant social insurance bodies.`,
      type: 'employee_created',
      link: '/admin/employee-management',
      clientId: auth.uid,
      clientName: auth.displayName,
      companyId: auth.companyId,
      companyName,
    });
  } catch (e) {
    console.error('[company-employees POST] admin notification failed', e);
  }

  return NextResponse.json({ success: true, id: ref.id });
}
