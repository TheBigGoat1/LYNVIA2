import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { headers } from 'next/headers';
import admin, { ensureAdminInitialized } from '@/firebase/admin-config';
import { creditWalletTopupFromCheckoutSession } from '@/lib/wallet-topup-from-checkout';
import { getStripe } from '@/lib/stripe-server';

const mapSubscriptionStatus = (status?: string): 'trialing' | 'active' | 'inactive' => {
  if (status === 'trialing') return 'trialing';
  if (status === 'active') return 'active';
  return 'inactive';
};

const toTimestamp = (unixSeconds?: number | null) => {
  if (!unixSeconds) return null;
  return admin.firestore.Timestamp.fromMillis(unixSeconds * 1000);
};

async function resolveCompanyIdFromStripeCustomer(customerId?: string | null): Promise<string | null> {
  if (!customerId) return null;

  const db = admin.firestore();
  const companySnapshot = await db
    .collection('companies')
    .where('subscription.stripeCustomerId', '==', customerId)
    .limit(1)
    .get();

  if (companySnapshot.empty) return null;
  return companySnapshot.docs[0].id;
}

async function writeAccountingPaymentHistoryEntry(params: {
  companyId: string;
  stripeInvoiceId?: string | null;
  stripeSessionId?: string | null;
  stripeSubscriptionId?: string | null;
  plan?: string | null;
  amountCents: number;
  currency?: string | null;
  description?: string | null;
  status: 'paid' | 'completed';
  paidAtUnixSeconds?: number | null;
  invoiceHostedUrl?: string | null;
  invoicePdfUrl?: string | null;
  receiptUrl?: string | null;
}) {
  const db = admin.firestore();
  const serverTimestamp = admin.firestore.FieldValue.serverTimestamp;
  const paymentDocId = params.stripeInvoiceId || params.stripeSessionId || `${Date.now()}`;

  await db.collection('companies').doc(params.companyId).collection('payments').doc(paymentDocId).set(
    {
      stripeInvoiceId: params.stripeInvoiceId || null,
      stripeSessionId: params.stripeSessionId || null,
      stripeSubscriptionId: params.stripeSubscriptionId || null,
      plan: params.plan || null,
      amountCents: params.amountCents,
      amountChf: Number((params.amountCents / 100).toFixed(2)),
      currency: (params.currency || 'chf').toUpperCase(),
      description: params.description || 'Accounting subscription payment',
      status: params.status,
      paidAt: toTimestamp(params.paidAtUnixSeconds) || serverTimestamp(),
      invoiceHostedUrl: params.invoiceHostedUrl || null,
      invoicePdfUrl: params.invoicePdfUrl || null,
      receiptUrl: params.receiptUrl || null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}

async function upsertCompanySubscriptionFromStripeSubscription(
  subscription: Stripe.Subscription,
  fallbackMeta?: Record<string, string>
) {
  const db = admin.firestore();
  const serverTimestamp = admin.firestore.FieldValue.serverTimestamp;

  const meta = subscription.metadata || {};
  const mergedMeta = { ...fallbackMeta, ...meta };
  const companyId = mergedMeta.companyId;
  const plan = mergedMeta.plan || 'basic';
  const monthlyPriceChf = Number(mergedMeta.monthlyPriceChf || 0);

  if (!companyId) {
    throw new Error('Missing companyId in subscription metadata');
  }

  await db.collection('companies').doc(companyId).set(
    {
      subscription: {
        plan,
        status: mapSubscriptionStatus(subscription.status),
        trialDays: 30,
        trialStartedAt: subscription.trial_start ? toTimestamp(subscription.trial_start) : null,
        trialEndsAt: toTimestamp(subscription.trial_end),
        currentPeriodStart: toTimestamp(subscription.current_period_start),
        currentPeriodEnd: toTimestamp(subscription.current_period_end),
        monthlyPriceChf,
        currency: 'CHF',
        billingCycle: 'monthly',
        stripeCustomerId: typeof subscription.customer === 'string' ? subscription.customer : null,
        stripeSubscriptionId: subscription.id,
        updatedAt: serverTimestamp(),
      },
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}

export async function POST(request: NextRequest) {
  const stripe = getStripe();
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  const sig = headers().get('stripe-signature');
  const body = await request.text();

  if (!stripe || !endpointSecret) {
    return NextResponse.json(
      {
        error: 'Stripe webhook is not configured on the server.',
        hint: 'Set STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET in .env.local. Local dev: run `stripe listen --forward-to localhost:9002/api/webhooks/stripe` and paste the webhook signing secret.',
      },
      { status: 500 },
    );
  }

  if (!sig) {
    return NextResponse.json({ error: 'Missing stripe-signature header.' }, { status: 400 });
  }

  if (!ensureAdminInitialized()) {
    return NextResponse.json(
      { error: 'Firebase Admin is not configured on the server.' },
      { status: 500 }
    );
  }

  const db = admin.firestore();
  const serverTimestamp = admin.firestore.FieldValue.serverTimestamp;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, sig, endpointSecret);
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    console.error(`Webhook Error: ${errorMessage}`);
    return NextResponse.json({ error: `Webhook Error: ${errorMessage}` }, { status: 400 });
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      const metadata = (session.metadata || {}) as Record<string, string>;

      if (metadata.flow === 'wallet_topup') {
        try {
          await creditWalletTopupFromCheckoutSession(session);
        } catch (error) {
          console.error('Error processing wallet top-up webhook:', error);
          return NextResponse.json({ error: 'Wallet credit failed' }, { status: 500 });
        }

        break;
      }

      if (metadata.flow === 'accounting_subscription') {
        try {
          const subscriptionId = typeof session.subscription === 'string' ? session.subscription : null;

          if (!subscriptionId) {
            throw new Error('Missing subscription id on accounting subscription checkout session');
          }

          const subscription = await stripe.subscriptions.retrieve(subscriptionId);
          await upsertCompanySubscriptionFromStripeSubscription(subscription, metadata);

          const companyId = metadata.companyId || subscription.metadata?.companyId;
          if (companyId && (session.amount_total || 0) > 0) {
            await writeAccountingPaymentHistoryEntry({
              companyId,
              stripeSessionId: session.id,
              stripeSubscriptionId: subscription.id,
              plan: metadata.plan || subscription.metadata?.plan,
              amountCents: session.amount_total || 0,
              currency: session.currency,
              description: 'Subscription checkout payment',
              status: 'completed',
              paidAtUnixSeconds: session.created,
            });
          }
        } catch (error) {
          console.error('Error processing accounting subscription checkout:', error);
          return NextResponse.json({ error: 'Subscription update failed' }, { status: 500 });
        }
        break;
      }

      // Document generator fee checkouts are reconciled client-side after redirect.
      // Acknowledge these sessions to avoid webhook retries due to missing order metadata.
      if (metadata.purpose === 'document_pdf' || metadata.purpose === 'document_review') {
        break;
      }

      const { orderId, userId, serviceTitle } = metadata;
      if (!orderId || !userId) {
        console.error('Webhook Error: Missing orderId or userId in metadata');
        return NextResponse.json({ error: 'Missing metadata' }, { status: 400 });
      }

      try {
        await db.collection('users').doc(userId).collection('orders').doc(orderId).set(
          {
            status: 'paid',
            stripePaymentIntentId: session.payment_intent || null,
            stripeSessionId: session.id,
            paidAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );

        await db.collection('users').doc(userId).collection('notifications').add({
          title: 'Service Purchased',
          description: `Your payment for "${serviceTitle}" was successful.`,
          type: 'system',
          read: false,
          link: '/individual/my-orders',
          createdAt: serverTimestamp(),
        });

        const orderDoc = await db.collection('users').doc(userId).collection('orders').doc(orderId).get();
        const orderData = orderDoc.data();
        const isTaxReturn = orderData?.orderType === 'tax';

        if (isTaxReturn) {
          await db.collection('admin_notifications').add({
            title: 'New Tax Return Order',
            description: `${orderData?.userName || userId} purchased "${serviceTitle}". Required documents need to be requested.`,
            type: 'new_tax_return',
            link: '/admin/order-management',
            clientId: userId,
            clientName: orderData?.userName || 'Unknown',
            orderId: orderId,
            createdAt: serverTimestamp(),
            read: false,
          });
        }
      } catch (error) {
        console.error(`Error updating order ${orderId}:`, error);
        return NextResponse.json({ error: 'Database update failed' }, { status: 500 });
      }
      break;
    }

    case 'invoice.paid': {
      const invoice = event.data.object as Stripe.Invoice;
      const stripeSubscriptionId =
        typeof invoice.subscription === 'string' ? invoice.subscription : invoice.subscription?.id || null;

      if (!stripeSubscriptionId) {
        break;
      }

      let subscription: Stripe.Subscription;
      try {
        subscription = await stripe.subscriptions.retrieve(stripeSubscriptionId);
      } catch (error) {
        console.error('Error retrieving subscription for invoice:', error);
        break;
      }

      if (subscription.metadata?.flow !== 'accounting_subscription') {
        break;
      }

      const companyId =
        subscription.metadata?.companyId ||
        (typeof invoice.customer === 'string' ? await resolveCompanyIdFromStripeCustomer(invoice.customer) : null);

      if (!companyId) {
        console.error('Accounting invoice.paid without companyId metadata');
        break;
      }

      try {
        await writeAccountingPaymentHistoryEntry({
          companyId,
          stripeInvoiceId: invoice.id,
          stripeSubscriptionId,
          plan: subscription.metadata?.plan || null,
          amountCents: invoice.amount_paid || 0,
          currency: invoice.currency,
          description: invoice.description || invoice.lines.data[0]?.description || 'Subscription invoice payment',
          status: 'paid',
          paidAtUnixSeconds: invoice.status_transitions?.paid_at || invoice.created,
          invoiceHostedUrl: invoice.hosted_invoice_url,
          invoicePdfUrl: invoice.invoice_pdf,
        });
      } catch (error) {
        console.error('Error writing accounting payment history entry:', error);
        return NextResponse.json({ error: 'Payment history sync failed' }, { status: 500 });
      }

      break;
    }

    case 'customer.subscription.updated': {
      const subscription = event.data.object as Stripe.Subscription;
      if (subscription.metadata?.flow === 'accounting_subscription') {
        try {
          await upsertCompanySubscriptionFromStripeSubscription(subscription);
        } catch (error) {
          console.error('Error updating accounting subscription state:', error);
          return NextResponse.json({ error: 'Subscription sync failed' }, { status: 500 });
        }
      }
      break;
    }

    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription;
      if (subscription.metadata?.flow === 'accounting_subscription') {
        const companyId = subscription.metadata.companyId;
        if (!companyId) {
          return NextResponse.json({ error: 'Missing companyId' }, { status: 400 });
        }
        try {
          await db.collection('companies').doc(companyId).set(
            {
              subscription: {
                status: 'inactive',
                stripeSubscriptionId: subscription.id,
                updatedAt: serverTimestamp(),
              },
              updatedAt: serverTimestamp(),
            },
            { merge: true }
          );
        } catch (error) {
          console.error('Error deactivating accounting subscription:', error);
          return NextResponse.json({ error: 'Subscription deactivation failed' }, { status: 500 });
        }
      }
      break;
    }

    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  return NextResponse.json({ received: true });
}
