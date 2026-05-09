import { NextRequest, NextResponse } from 'next/server';
import admin, { ensureAdminInitialized } from '@/firebase/admin-config';
import { z } from 'zod';
import { notifyAdminServer } from '@/lib/admin-notifications';

const employeeSchema = z.object({
  companyId: z.string().min(1),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  dateOfBirth: z.string().optional().default(''),
  telephone: z.string().optional().default(''),
  email: z.string().optional().default(''),
  position: z.string().min(1),
  startDate: z.string().optional().default(''),
  typeRemu: z.enum(['horaire', 'mensuel']).default('horaire'),
  salaireHoraire: z.coerce.number().min(0).default(25),
  salaireMensuel: z.coerce.number().min(0).default(5000),
  tauxActivite: z.coerce.number().min(0).max(100).default(100),
  semainesVacances: z.coerce.number().min(4).max(6).default(5),
  numeroAVS: z.string().optional().default(''),
  iban: z.string().optional().default(''),
  rue: z.string().optional().default(''),
  ville: z.string().optional().default(''),
  codePostal: z.string().optional().default(''),
});

const updateSchema = employeeSchema.extend({
  employeeId: z.string().min(1),
});

const deleteSchema = z.object({
  companyId: z.string().min(1),
  employeeId: z.string().min(1),
});

async function verifyAdmin(request: NextRequest) {
  if (!ensureAdminInitialized()) {
    return null;
  }
  const idToken = request.headers.get('Authorization')?.split('Bearer ')[1];
  if (!idToken) return null;
  try {
    const decoded = await admin.auth().verifyIdToken(idToken);
    if (decoded.role !== 'admin') return null;
    return decoded;
  } catch {
    return null;
  }
}

// POST — create employee for any company
export async function POST(request: NextRequest) {
  const caller = await verifyAdmin(request);
  if (!caller) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const parsed = employeeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', issues: parsed.error.issues }, { status: 400 });
  }

  const { companyId, ...employeeData } = parsed.data;

  const companyRef = admin.firestore().collection('companies').doc(companyId);
  const companySnap = await companyRef.get();
  if (!companySnap.exists) {
    return NextResponse.json({ error: 'Company not found' }, { status: 404 });
  }

  // --- LPP enrollment check ---
  const grossMonthly = Number(employeeData.salaireMensuel || 0);
  const LPP_ENTRY_THRESHOLD_MONTHLY = 22680 / 12; // CHF 1,890
  const lppRequired = grossMonthly > LPP_ENTRY_THRESHOLD_MONTHLY;

  const employeeDoc = await companyRef.collection('employees').add({
    ...employeeData,
    avsStatus: 'a_verifier',
    lppRequired,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  // --- Admin notification: new employee created ---
  const companyData = companySnap.data();
  const companyName = companyData?.companyName || companyData?.name || companyId;
  notifyAdminServer(admin.firestore(), {
    title: 'New employee created',
    description: `${employeeData.firstName} ${employeeData.lastName} (${employeeData.position || 'N/A'}) added to ${companyName}. ${lppRequired ? '⚠️ LPP enrollment required.' : ''} Please declare to social insurance.`,
    type: 'employee_created',
    link: '/admin/employee-management',
    companyId,
    companyName,
  });
  try {
    const adminsSnap = await admin.firestore().collection('users').where('role', '==', 'admin').get();
    const batch = admin.firestore().batch();
    for (const adminDoc of adminsSnap.docs) {
      // Don't notify the admin who created the employee
      if (adminDoc.id === caller) continue;
      const notifRef = admin.firestore().collection('users').doc(adminDoc.id).collection('notifications').doc();
      batch.set(notifRef, {
        title: 'New employee created',
        description: `${employeeData.firstName} ${employeeData.lastName} (${employeeData.position || 'N/A'}) added to ${companyName}. ${lppRequired ? '⚠️ LPP enrollment required — salary exceeds threshold.' : ''} Please declare to social insurance.`,
        type: 'system',
        read: false,
        link: `/admin/employee-management`,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }
    await batch.commit();
  } catch (notifErr) {
    console.error('Failed to send admin notifications:', notifErr);
  }

  return NextResponse.json({ success: true, lppRequired });
}

// PUT — update an employee record
export async function PUT(request: NextRequest) {
  const caller = await verifyAdmin(request);
  if (!caller) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', issues: parsed.error.issues }, { status: 400 });
  }

  const { companyId, employeeId, ...employeeData } = parsed.data;

  const employeeRef = admin
    .firestore()
    .collection('companies')
    .doc(companyId)
    .collection('employees')
    .doc(employeeId);

  const snap = await employeeRef.get();
  if (!snap.exists) {
    return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
  }

  await employeeRef.set(
    {
      ...employeeData,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  return NextResponse.json({ success: true });
}

// PATCH — admin actions: register with social insurance, process payslip
export async function PATCH(request: NextRequest) {
  const caller = await verifyAdmin(request);
  if (!caller) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { companyId, employeeId, action, data } = body as {
    companyId: string;
    employeeId: string;
    action: string;
    data?: Record<string, unknown>;
  };

  if (!companyId || !employeeId || !action) {
    return NextResponse.json({ error: 'Missing companyId, employeeId, or action' }, { status: 400 });
  }

  const employeeRef = admin
    .firestore()
    .collection('companies')
    .doc(companyId)
    .collection('employees')
    .doc(employeeId);

  const snap = await employeeRef.get();
  if (!snap.exists) {
    return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
  }

  if (action === 'register_social_insurance') {
    await employeeRef.update({
      avsStatus: 'valide',
      registrationStatus: 'registered',
      registrationDate: new Date().toISOString(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    return NextResponse.json({ success: true });
  }

  if (action === 'process_payslip') {
    const empData = snap.data()!;
    const month: string = (data?.month as string) || new Date().toISOString().slice(0, 7);

    const typeRemu = empData.typeRemu || 'horaire';
    const semainesVacances = Number(empData.semainesVacances) || 5;
    const tauxActivite = Number(empData.tauxActivite) || 100;
    let grossSalary = 0;
    let breakdown: Record<string, number> = {};

    if (typeRemu === 'horaire') {
      const hourly = Number(empData.salaireHoraire) || 25;
      const pctVac = semainesVacances === 5 ? 0.1064 : semainesVacances === 6 ? 0.1304 : 0.0833;
      const vVac = hourly * pctVac;
      const vFer = hourly * 0.0227;
      const base = hourly + vVac + vFer;
      const v13 = base * 0.0833;
      const brutHoraire = base + v13;
      grossSalary = parseFloat((brutHoraire * 160 * (tauxActivite / 100)).toFixed(2));
      breakdown = {
        hourly, pctVacPct: parseFloat((pctVac * 100).toFixed(2)),
        vVac: parseFloat(vVac.toFixed(2)), vFer: parseFloat(vFer.toFixed(2)),
        base: parseFloat(base.toFixed(2)), v13: parseFloat(v13.toFixed(2)),
        brutHoraire: parseFloat(brutHoraire.toFixed(2)),
        hoursPerMonth: 160, tauxActivite, grossSalary,
      };
    } else {
      const monthly = Number(empData.salaireMensuel) || 5000;
      grossSalary = parseFloat((monthly * (tauxActivite / 100)).toFixed(2));
      breakdown = { monthly, tauxActivite, grossSalary };
    }

    const payslipRef = employeeRef.collection('payslips').doc(month);
    await payslipRef.set({
      month,
      employeeId,
      companyId,
      employeeName: `${empData.firstName} ${empData.lastName}`,
      position: empData.position || '',
      typeRemu,
      salaireHoraire: empData.salaireHoraire || 0,
      salaireMensuel: empData.salaireMensuel || 0,
      tauxActivite,
      semainesVacances,
      grossSalary,
      breakdown,
      generatedAt: admin.firestore.FieldValue.serverTimestamp(),
      generatedByAdminUid: caller.uid,
    });

    await employeeRef.update({
      lastPayslipMonth: month,
      lastPayslipDate: new Date().toISOString(),
      payslipStatus: 'processed',
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ success: true, month, grossSalary });
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}

// DELETE — remove an employee
export async function DELETE(request: NextRequest) {
  const caller = await verifyAdmin(request);
  if (!caller) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const parsed = deleteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', issues: parsed.error.issues }, { status: 400 });
  }

  const { companyId, employeeId } = parsed.data;

  const employeeRef = admin
    .firestore()
    .collection('companies')
    .doc(companyId)
    .collection('employees')
    .doc(employeeId);

  const snap = await employeeRef.get();
  if (!snap.exists) {
    return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
  }

  await employeeRef.delete();

  return NextResponse.json({ success: true });
}
