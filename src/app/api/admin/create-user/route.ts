import { NextResponse } from 'next/server';
import admin from '@/firebase/admin-config';
import { z } from 'zod';

const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  role: z.enum(['individual', 'business', 'accounting_firm', 'admin']),
  status: z.enum(['active', 'pending_approval', 'suspended']),
  companyId: z.string().nullable().optional(),
});

export async function POST(request: Request) {
  try {
    const idToken = request.headers.get('Authorization')?.split('Bearer ')[1];
    if (!idToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decodedToken = await admin.auth().verifyIdToken(idToken);
    if (decodedToken.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const validation = createUserSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ error: 'Invalid input', issues: validation.error.issues }, { status: 400 });
    }

    const { email, password, firstName, lastName, role, status, companyId } = validation.data;

    const userRecord = await admin.auth().createUser({
      email,
      password,
      displayName: `${firstName} ${lastName}`,
    });

    await admin.auth().setCustomUserClaims(userRecord.uid, { role });

    await admin.firestore().collection('users').doc(userRecord.uid).set({
      email,
      role,
      companyId: companyId || null,
      profile: {
        firstName,
        lastName,
      },
      status,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ success: true, uid: userRecord.uid });
  } catch (error: any) {
    console.error('Error creating user:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
