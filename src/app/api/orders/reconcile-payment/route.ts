import { NextRequest, NextResponse } from 'next/server';
import admin, { ensureAdminInitialized } from '@/firebase/admin-config';
import { getStripe, stripeNotConfiguredResponse } from '@/lib/stripe-server';
import { IS_GLOBAL_TEST_MODE } from '@/lib/test-mode';

export async function POST(request: NextRequest) {
  try {
    if (IS_GLOBAL_TEST_MODE) {
      return NextResponse.json({ updated: false, skipped: true });
    }

    const stripe = getStripe();
    if (!stripe) {
      return stripeNotConfiguredResponse();
    }

    if (!ensureAdminInitialized()) {
      return NextResponse.json({ error: 'Firebase Admin is not configured.' }, { status: 500 });
    }

    const idToken = request.headers.get('Authorization')?.split('Bearer ')[1];
    if (!idToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = await admin.auth().verifyIdToken(idToken);
    const { sessionId } = await request.json();

    if (!sessionId || typeof sessionId !== 'string') {
      return NextResponse.json({ error: 'sessionId is required' }, { status: 400 });
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.mode !== 'payment') {
      return NextResponse.json({ error: 'Unsupported session mode' }, { status: 400 });
    }

    const metadata = (session.metadata || {}) as Record<string, string>;
    const orderId = metadata.orderId;
    const userId = metadata.userId;

    if (!orderId || !userId) {
      return NextResponse.json({ error: 'Missing order metadata' }, { status: 400 });
    }

    if (userId !== decoded.uid) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (session.payment_status !== 'paid') {
      return NextResponse.json({ updated: false, status: session.payment_status });
    }

    const db = admin.firestore();
    const orderRef = db.collection('users').doc(userId).collection('orders').doc(orderId);
    const orderSnap = await orderRef.get();

    if (!orderSnap.exists) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const currentStatus = (orderSnap.data()?.status as string | undefined) ?? 'pending_payment';

    await orderRef.set(
      {
        status: 'paid',
        stripeSessionId: session.id,
        stripePaymentIntentId:
          typeof session.payment_intent === 'string' ? session.payment_intent : null,
        paidAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    if (currentStatus !== 'paid') {
      await db.collection('users').doc(userId).collection('notifications').add({
        title: 'Payment Confirmed',
        description: `Your payment for "${metadata.serviceTitle || 'service'}" was confirmed.`,
        type: 'system',
        read: false,
        link: '/individual/my-orders',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }

    return NextResponse.json({ updated: true, status: 'paid' });
  } catch (error: any) {
    console.error('Payment reconciliation error:', error);
    return NextResponse.json({ error: error?.message || 'Internal Server Error' }, { status: 500 });
  }
}
