import { NextResponse } from 'next/server';
import admin from '@/firebase/admin-config';
import { verifyCompanyEmployeeCaller } from '@/app/api/business/company-employees/_auth';
import { employeeFirestoreSchema, employeePayloadForFirestore } from '@/lib/business/employee-firestore-schema';
import { assertEmployeeMeetsClaMinimum } from '@/lib/business/employee-cla-guard';
import { notifyAdminServer } from '@/lib/admin-notifications';
import { describeEmployeeMaterialChanges } from '@/lib/business/employee-significant-diff';

type RouteContext = { params: { employeeId: string } };

export async function PATCH(request: Request, context: RouteContext) {
  const auth = await verifyCompanyEmployeeCaller(request);
  if (!auth.ok) return auth.response;

  const { employeeId } = context.params;
  if (!employeeId) {
    return NextResponse.json({ error: 'Missing employee id' }, { status: 400 });
  }

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
  const empRef = db.collection('companies').doc(auth.companyId).collection('employees').doc(employeeId);
  const existing = await empRef.get();
  if (!existing.exists) {
    return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
  }

  const companySnap = await db.collection('companies').doc(auth.companyId).get();
  const companyData = companySnap.data() ?? {};
  const industry = companyData.industry as string | undefined;
  const canton = companyData.canton as string | undefined;
  const companyName = (companyData.companyName as string | undefined) || (companyData.name as string | undefined) || auth.companyId;

  const claCheck = assertEmployeeMeetsClaMinimum(industry, canton, parsed.data);
  if (!claCheck.ok) {
    return NextResponse.json({ error: claCheck.message }, { status: 400 });
  }

  const payload = employeePayloadForFirestore(parsed.data);
  const before = existing.data() as Record<string, unknown>;
  const after = { ...payload } as Record<string, unknown>;
  const materialChanges = describeEmployeeMaterialChanges(before, after);

  await empRef.update({
    ...payload,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  if (materialChanges.length > 0) {
    try {
      await notifyAdminServer(db, {
        title: 'Employee record updated — review payroll / HR data',
        description: `${parsed.data.firstName} ${parsed.data.lastName} at ${companyName}. Changed: ${materialChanges.join(', ')}.`,
        type: 'employee_updated',
        link: '/admin/employee-management',
        clientId: auth.uid,
        clientName: auth.displayName,
        companyId: auth.companyId,
        companyName,
      });
    } catch (e) {
      console.error('[company-employees PATCH] admin notification failed', e);
    }
  }

  return NextResponse.json({ success: true });
}
