import { NextRequest, NextResponse } from 'next/server';
import admin, { ensureAdminInitialized } from '@/firebase/admin-config';
import { creditWalletTopupFromCheckoutSession } from '@/lib/wallet-topup-from-checkout';
import { getStripe, stripeNotConfiguredResponse } from '@/lib/stripe-server';

export async function POST(request: NextRequest) {
  try {
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
    const body = await request.json();
    const sessionId = typeof body?.sessionId === 'string' ? body.sessionId : '';
    if (!sessionId) {
      return NextResponse.json({ error: 'sessionId is required' }, { status: 400 });
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId);
    const metadata = (session.metadata || {}) as Record<string, string>;

    if (metadata.flow !== 'wallet_topup') {
      return NextResponse.json({ error: 'Not a wallet top-up session' }, { status: 400 });
    }
    if (metadata.userId !== decoded.uid) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (session.payment_status !== 'paid') {
      return NextResponse.json({
        ok: true,
        paid: false,
        paymentStatus: session.payment_status,
      });
    }

    const result = await creditWalletTopupFromCheckoutSession(session);

    return NextResponse.json({
      ok: true,
      paid: true,
      credited: result.credited,
      duplicate: result.duplicate,
      amountCents: result.amountCents,
    });
  } catch (err) {
    console.error('wallet reconcile-topup', err);
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
