import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import admin, { ensureAdminInitialized } from '@/firebase/admin-config';
import { getAccountingPlan } from '@/lib/accounting-subscriptions';
import { getStripe, stripeNotConfiguredResponse } from '@/lib/stripe-server';
import { IS_GLOBAL_TEST_MODE } from '@/lib/test-mode';

const payloadSchema = z.object({
  companyId: z.string().min(1),
  plan: z.enum(['basic', 'pro']),
  locale: z.string().optional(),
});

async function applySimulatedAccountingSubscription(companyId: string, plan: 'basic' | 'pro') {
  const db = admin.firestore();
  const serverTimestamp = admin.firestore.FieldValue.serverTimestamp;
  const planDef = getAccountingPlan(plan);
  const trialDays = planDef.trialDays;
  const trialEndsAt = admin.firestore.Timestamp.fromMillis(
    Date.now() + trialDays * 24 * 60 * 60 * 1000,
  );

  await db.collection('companies').doc(companyId).set(
    {
      subscription: {
        plan,
        status: 'trialing',
        trialDays,
        trialStartedAt: serverTimestamp(),
        trialEndsAt,
        currentPeriodStart: null,
        currentPeriodEnd: null,
        monthlyPriceChf: planDef.monthlyPriceChf,
        currency: 'CHF',
        billingCycle: 'monthly',
        stripeCustomerId: null,
        stripeSubscriptionId: null,
        paymentsBypassed: true,
        updatedAt: serverTimestamp(),
      },
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );

  await db
    .collection('companies')
    .doc(companyId)
    .collection('payments')
    .doc(`sim_sub_${Date.now()}`)
    .set({
      plan,
      amountCents: 0,
      amountChf: 0,
      currency: 'CHF',
      description: 'Simulated subscription activation (payments bypassed)',
      status: 'completed',
      paidAt: serverTimestamp(),
      simulated: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
}

export async function POST(request: NextRequest) {
  try {
    if (!ensureAdminInitialized()) {
      return NextResponse.json(
        { error: 'Firebase Admin is not configured on the server.' },
        { status: 500 },
      );
    }

    const idToken = request.headers.get('Authorization')?.split('Bearer ')[1];
    if (!idToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = await admin.auth().verifyIdToken(idToken);
    const body = await request.json();
    const parsed = payloadSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input', issues: parsed.error.issues }, { status: 400 });
    }

    const { companyId, plan, locale } = parsed.data;

    const userDoc = await admin.firestore().collection('users').doc(decoded.uid).get();
    if (!userDoc.exists) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
    }

    const userData = userDoc.data() || {};
    if (userData.role !== 'accounting_firm') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (userData.companyId !== companyId) {
      return NextResponse.json({ error: 'Forbidden: Company mismatch' }, { status: 403 });
    }

    if (IS_GLOBAL_TEST_MODE) {
      await applySimulatedAccountingSubscription(companyId, plan);
      return NextResponse.json({ testMode: true, sessionId: null });
    }

    const stripe = getStripe();
    if (!stripe) {
      return stripeNotConfiguredResponse();
    }

    const planDef = getAccountingPlan(plan);
    const currency = 'chf';
    const unitAmount = planDef.monthlyPriceChf * 100;
    const trialDays = planDef.trialDays;

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:9002';
    const safeLocale = locale || 'en';

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'subscription',
      line_items: [
        {
          price_data: {
            currency,
            recurring: {
              interval: 'month',
            },
            product_data: {
              name: `Lynvia Fiduciary ${planDef.title} Plan`,
              description: `${planDef.description} (30-day trial)`,
            },
            unit_amount: unitAmount,
          },
          quantity: 1,
        },
      ],
      subscription_data: {
        trial_period_days: trialDays,
        metadata: {
          flow: 'accounting_subscription',
          companyId,
          plan,
          monthlyPriceChf: String(planDef.monthlyPriceChf),
        },
      },
      metadata: {
        flow: 'accounting_subscription',
        companyId,
        plan,
        monthlyPriceChf: String(planDef.monthlyPriceChf),
      },
      success_url: `${baseUrl}/${safeLocale}/payment/success?redirect_to=/accounting-firm/purchase-services&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/${safeLocale}/accounting-firm/purchase-services?canceled=true`,
    });

    return NextResponse.json({ sessionId: session.id });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    console.error('Accounting subscription checkout error:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
