import { NextResponse } from 'next/server';
import admin from '@/firebase/admin-config';

export type VerifiedCompanyCaller =
  | { ok: true; uid: string; companyId: string; displayName: string }
  | { ok: false; response: NextResponse };

export async function verifyCompanyEmployeeCaller(request: Request): Promise<VerifiedCompanyCaller> {
  const idToken = request.headers.get('Authorization')?.split('Bearer ')[1];
  if (!idToken) {
    return { ok: false, response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }

  let decoded: { uid: string };
  try {
    decoded = await admin.auth().verifyIdToken(idToken);
  } catch {
    return { ok: false, response: NextResponse.json({ error: 'Invalid token' }, { status: 401 }) };
  }

  const userSnap = await admin.firestore().collection('users').doc(decoded.uid).get();
  if (!userSnap.exists) {
    return { ok: false, response: NextResponse.json({ error: 'User not found' }, { status: 403 }) };
  }

  const data = userSnap.data()!;
  const companyId = data.companyId as string | undefined;
  const role = data.role as string | undefined;
  if (!companyId || (role !== 'business' && role !== 'accounting_firm')) {
    return { ok: false, response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  }

  let displayName = '';
  try {
    const authUser = await admin.auth().getUser(decoded.uid);
    displayName = authUser.displayName || authUser.email || decoded.uid;
  } catch {
    displayName = decoded.uid;
  }

  return { ok: true, uid: decoded.uid, companyId, displayName };
}
