import type Stripe from 'stripe';
import admin from '@/firebase/admin-config';

export type WalletTopupCreditResult = {
  credited: boolean;
  duplicate: boolean;
  amountCents: number;
};

/**
 * Idempotently credits the user's wallet from a paid Checkout session
 * (metadata.flow === wallet_topup). Safe to call from webhooks and from
 * the client-triggered reconcile route after redirect.
 */
export async function creditWalletTopupFromCheckoutSession(
  session: Stripe.Checkout.Session
): Promise<WalletTopupCreditResult> {
  const metadata = (session.metadata || {}) as Record<string, string>;

  if (metadata.flow !== 'wallet_topup') {
    return { credited: false, duplicate: false, amountCents: 0 };
  }

  if (session.payment_status !== 'paid') {
    return { credited: false, duplicate: false, amountCents: 0 };
  }

  const userId = metadata.userId;
  const topupAmountCents = Number(metadata.topupAmountCents || session.amount_total || 0);

  if (!userId || !Number.isFinite(topupAmountCents) || topupAmountCents <= 0) {
    throw new Error('Invalid wallet top-up metadata');
  }

  const stripeTotal =
    typeof session.amount_total === 'number' && session.amount_total > 0
      ? session.amount_total
      : topupAmountCents;
  if (stripeTotal !== topupAmountCents) {
    console.warn('wallet_topup: metadata amount differs from Stripe total; using Stripe total', {
      sessionId: session.id,
      metadataCents: topupAmountCents,
      stripeTotal,
    });
  }
  const creditCents = stripeTotal;

  const db = admin.firestore();
  const serverTimestamp = admin.firestore.FieldValue.serverTimestamp;
  const walletRef = db.collection('users').doc(userId).collection('wallet').doc('main');
  const txRef = db.collection('users').doc(userId).collection('walletTransactions').doc(`topup_${session.id}`);

  let credited = false;
  let duplicate = false;

  await db.runTransaction(async (tx) => {
    const txSnap = await tx.get(txRef);
    if (txSnap.exists) {
      duplicate = true;
      return;
    }

    const walletSnap = await tx.get(walletRef);
    const currentBalance = (walletSnap.data()?.balanceCents as number | undefined) ?? 0;
    const nextBalance = currentBalance + creditCents;

    tx.set(
      walletRef,
      {
        balanceCents: nextBalance,
        currency: 'CHF',
        updatedAt: serverTimestamp(),
        ...(walletSnap.exists ? {} : { createdAt: serverTimestamp() }),
      },
      { merge: true }
    );

    tx.set(txRef, {
      type: 'deposit',
      amountCents: creditCents,
      balanceAfterCents: nextBalance,
      currency: 'CHF',
      stripeSessionId: session.id,
      stripePaymentIntentId: typeof session.payment_intent === 'string' ? session.payment_intent : null,
      metadata: { source: 'stripe_wallet_topup' },
      createdAt: serverTimestamp(),
    });

    credited = true;
  });

  if (credited) {
    await db.collection('users').doc(userId).collection('notifications').add({
      title: 'Wallet Top-up Successful',
      description: `Your wallet was credited with CHF ${(creditCents / 100).toFixed(2)}.`,
      type: 'system',
      read: false,
      link: '/individual/dashboard',
      createdAt: serverTimestamp(),
    });
  }

  return { credited, duplicate, amountCents: creditCents };
}
