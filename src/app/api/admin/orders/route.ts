import { NextResponse } from 'next/server';
import { z } from 'zod';
import admin from '@/firebase/admin-config';

const updateOrderSchema = z.object({
  path: z.string().min(1),
  status: z.enum([
    'quote_requested',
    'invoice_sent',
    'paid',
    'in_progress',
    'pending_review',
    'completed',
    'cancelled',
    'pending_payment',
  ]),
});

const getBearerToken = (request: Request) => request.headers.get('Authorization')?.split('Bearer ')[1];

const verifyAdmin = async (request: Request) => {
  const idToken = getBearerToken(request);
  if (!idToken) {
    return { ok: false as const, response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }

  const decoded = await admin.auth().verifyIdToken(idToken);
  if (decoded.role !== 'admin') {
    return { ok: false as const, response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  }

  return { ok: true as const };
};

export async function GET(request: Request) {
  try {
    const authz = await verifyAdmin(request);
    if (!authz.ok) return authz.response;

    const snapshot = await admin.firestore().collectionGroup('orders').orderBy('createdAt', 'desc').get();

    const orders = snapshot.docs.map((d) => {
      const data = d.data() as Record<string, any>;
      // Extract userId from path: users/{userId}/orders/{orderId}
      const pathParts = d.ref.path.split('/');
      const userId = pathParts.length >= 2 ? pathParts[1] : '';
      return {
        id: d.id,
        path: d.ref.path,
        userId,
        userName: String(data.userName ?? ''),
        userEmail: String(data.userEmail ?? ''),
        serviceTitle: String(data.serviceTitle ?? ''),
        serviceDescription: String(data.serviceDescription ?? ''),
        status: String(data.status ?? 'quote_requested'),
        createdAt: data.createdAt
          ? { seconds: data.createdAt.seconds ?? 0, nanoseconds: data.createdAt.nanoseconds ?? 0 }
          : null,
        priceAmount: Number(data.priceAmount ?? 0),
        notes: String(data.notes ?? ''),
      };
    });

    return NextResponse.json({ orders });
  } catch (error: any) {
    console.error('Error fetching admin orders:', error);
    return NextResponse.json({ error: error?.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const authz = await verifyAdmin(request);
    if (!authz.ok) return authz.response;

    const body = await request.json();
    const parsed = updateOrderSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input', issues: parsed.error.issues }, { status: 400 });
    }

    const { path, status } = parsed.data;
    if (!/^users\/[^/]+\/orders\/[^/]+$/.test(path)) {
      return NextResponse.json({ error: 'Invalid order path' }, { status: 400 });
    }

    const db = admin.firestore();
    const orderRef = db.doc(path);
    const before = await orderRef.get();
    const prevStatus = before.exists ? String(before.data()?.status ?? '') : '';
    const userId = path.split('/')[1];
    const orderId = path.split('/')[3];
    const serviceTitle = before.exists ? String(before.data()?.serviceTitle ?? 'Your order') : 'Your order';

    await orderRef.update({
      status,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    if (userId && prevStatus !== status) {
      await db.collection('users').doc(userId).collection('notifications').add({
        title: 'Tax order updated',
        description: `Your order "${serviceTitle}" is now: ${status.replace(/_/g, ' ')}.`,
        type: 'order',
        read: false,
        link: `/individual/my-orders/${orderId}`,
        orderId,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error updating admin order:', error);
    return NextResponse.json({ error: error?.message || 'Internal Server Error' }, { status: 500 });
  }
}
