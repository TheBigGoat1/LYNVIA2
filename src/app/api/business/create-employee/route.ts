import { NextResponse } from 'next/server';
import admin from '@/firebase/admin-config';
import { z } from 'zod';
import { notifyAdminServer } from '@/lib/admin-notifications';

const createEmployeeSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  position: z.string().min(1),
  department: z.string().min(1),
  grossSalary: z.number().min(1),
  municipality: z.string().min(2),
  canton: z.string().min(2),
  employmentRate: z.string().min(1),
  startDate: z.string().min(1),
  status: z.enum(['Active', 'On Leave', 'Terminated']),
  avatar: z.string().url().optional().or(z.literal('')),
});

export async function POST(request: Request) {
  try {
    // 1. Verify caller is an authenticated user
    const idToken = request.headers.get('Authorization')?.split('Bearer ')[1];
    if (!idToken) {
      return NextResponse.json({ error: 'Unauthorized: No token provided.' }, { status: 401 });
    }
    
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const callerUid = decodedToken.uid;

    // 2. Get caller's company ID from Firestore
    const callerUserDoc = await admin.firestore().collection('users').doc(callerUid).get();
    if (!callerUserDoc.exists) {
        return NextResponse.json({ error: 'Unauthorized: Calling user not found.' }, { status: 403 });
    }
    const companyId = callerUserDoc.data()?.companyId;
    const callerRole = callerUserDoc.data()?.role;

    if (!companyId || (callerRole !== 'business' && callerRole !== 'accounting_firm')) {
        return NextResponse.json({ error: 'Forbidden: User is not a company admin.' }, { status: 403 });
    }

    // 3. Validate request body
    const body = await request.json();
    const validation = createEmployeeSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ error: 'Invalid input', issues: validation.error.issues }, { status: 400 });
    }
    const employeeData = validation.data;
    // Only store employee data in the company's subcollection
    const employeeCollectionRef = admin.firestore().collection('companies').doc(companyId).collection('employees');
    await employeeCollectionRef.add({
        ...employeeData,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Notify Lynvia admin: new employee must be declared to social insurance
    try {
      const companySnap = await admin.firestore().collection('companies').doc(companyId).get();
      const companyData = companySnap.data();
      const companyName = companyData?.companyName || companyData?.name || companyId;
      const callerAuthRecord = await admin.auth().getUser(callerUid);
      const callerName = callerAuthRecord.displayName || callerAuthRecord.email || callerUid;
      await notifyAdminServer(admin.firestore(), {
        title: 'New employee added \u2014 social insurance declaration required',
        description: `${employeeData.firstName} ${employeeData.lastName} (${employeeData.position}) was added to ${companyName}. Please declare to the relevant social insurance bodies.`,
        type: 'employee_created',
        link: '/admin/employee-management',
        clientId: callerUid,
        clientName: callerName,
        companyId,
        companyName,
      });
    } catch (notifErr) {
      console.error('Failed to send admin notification:', notifErr);
    }

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error('Error creating employee:', error);
    let message = 'Internal Server Error';
    if (error.code === 'auth/email-already-exists') {
        message = 'This email address is already in use by another account.';
    } else if (error.message) {
        message = error.message;
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
