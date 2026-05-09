import { NextResponse } from 'next/server';
import admin from '@/firebase/admin-config';
import { verifyCompanyEmployeeCaller } from '@/app/api/business/company-employees/_auth';
import { monthlyPayrollSubmissionBodySchema } from '@/lib/business/monthly-payroll-submission-schema';
import {
  computeEstimatedGross,
  type PayrollEmployeeSnapshot,
} from '@/lib/business/monthly-payroll-compute';

function toNum(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function employeeSnapshotFromFirestore(data: Record<string, unknown>): PayrollEmployeeSnapshot | null {
  const typeRemu = data.typeRemu === 'mensuel' ? 'mensuel' : 'horaire';
  return {
    typeRemu,
    salaireMensuel: toNum(data.salaireMensuel),
    salaireHoraire: toNum(data.salaireHoraire, 25),
  };
}

export async function POST(request: Request) {
  const auth = await verifyCompanyEmployeeCaller(request);
  if (!auth.ok) return auth.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = monthlyPayrollSubmissionBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed', issues: parsed.error.issues }, { status: 400 });
  }

  const { month, employeeId, hours, feesToReimburse, feesToDeduct, privateVehicleKm, mealsToReimburse, mealsToDeduct, bonus, prime } =
    parsed.data;

  const db = admin.firestore();
  const empRef = db.collection('companies').doc(auth.companyId).collection('employees').doc(employeeId);
  const empSnap = await empRef.get();
  if (!empSnap.exists) {
    return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
  }

  const snapshot = employeeSnapshotFromFirestore(empSnap.data() as Record<string, unknown>);
  if (!snapshot) {
    return NextResponse.json({ error: 'Invalid employee data' }, { status: 400 });
  }

  if (snapshot.typeRemu === 'horaire' && hours <= 0) {
    return NextResponse.json({ error: 'Hours worked must be greater than zero for hourly employees.' }, { status: 400 });
  }

  const fields = {
    hours,
    feesToReimburse,
    feesToDeduct,
    privateVehicleKm,
    mealsToReimburse,
    mealsToDeduct,
    bonus,
    prime,
  };

  const estimatedGross = computeEstimatedGross(snapshot, fields);
  const submission = {
    month,
    ...fields,
    estimatedGross,
    submittedAt: new Date().toISOString(),
  };

  const payrollDoc = db.collection('companies').doc(auth.companyId).collection('monthlyPayroll').doc(month);
  await payrollDoc.set({ [employeeId]: submission }, { merge: true });

  return NextResponse.json({ success: true, submission });
}
