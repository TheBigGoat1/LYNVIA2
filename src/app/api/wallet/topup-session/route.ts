import { NextRequest, NextResponse } from 'next/server';
import admin, { ensureAdminInitialized } from '@/firebase/admin-config';
import { getStripe, stripeNotConfiguredResponse } from '@/lib/stripe-server';
import { IS_GLOBAL_TEST_MODE } from '@/lib/test-mode';

export async function POST(request: NextRequest) {
  try {
    if (!ensureAdminInitialized()) {
      return NextResponse.json({ error: 'Firebase Admin is not configured.' }, { status: 500 });
    }

    const idToken = request.headers.get('Authorization')?.split('Bearer ')[1];
    if (!idToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = await admin.auth().verifyIdToken(idToken);
    const { amountCents, locale } = await request.json();

    if (!Number.isFinite(amountCents) || amountCents <= 0) {
      return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });
    }

    const safeAmount = Math.round(Number(amountCents));
    if (safeAmount < 500 || safeAmount > 500000) {
      return NextResponse.json({ error: 'Amount outside allowed range' }, { status: 400 });
    }

    if (IS_GLOBAL_TEST_MODE) {
      const walletRef = admin.firestore().doc(`users/${decoded.uid}/wallet/main`);
      await walletRef.set(
        {
          balanceCents: admin.firestore.FieldValue.increment(safeAmount),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
      const snap = await walletRef.get();
      const balanceCents = (snap.data()?.balanceCents as number | undefined) ?? safeAmount;
      return NextResponse.json({
        testMode: true,
        sessionId: null,
        creditedCents: safeAmount,
        balanceCents,
      });
    }

    const stripe = getStripe();
    if (!stripe) {
      return stripeNotConfiguredResponse();
    }

    const safeLocale = typeof locale === 'string' && locale.length > 0 ? locale : 'en';
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:9002';

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      line_items: [
        {
          price_data: {
            currency: 'chf',
            product_data: {
              name: `Wallet Top-up (CHF ${(safeAmount / 100).toFixed(2)})`,
            },
            unit_amount: safeAmount,
          },
          quantity: 1,
        },
      ],
      success_url: `${baseUrl}/${safeLocale}/payment/success?redirect_to=/individual/dashboard&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/${safeLocale}/individual/dashboard?wallet_topup=canceled`,
      metadata: {
        flow: 'wallet_topup',
        userId: decoded.uid,
        topupAmountCents: String(safeAmount),
      },
    });

    return NextResponse.json({ sessionId: session.id });
  } catch (error: any) {
    console.error('Wallet top-up session error:', error);
    return NextResponse.json({ error: error?.message || 'Internal server error' }, { status: 500 });
  }
}
