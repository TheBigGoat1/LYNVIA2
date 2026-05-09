import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import admin, { ensureAdminInitialized } from '@/firebase/admin-config';
import { getStripe, stripeNotConfiguredResponse } from '@/lib/stripe-server';
import { IS_GLOBAL_TEST_MODE } from '@/lib/test-mode';

const payloadSchema = z.object({
  companyId: z.string().min(1),
  locale: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    if (!ensureAdminInitialized()) {
      return NextResponse.json(
        { error: 'Firebase Admin is not configured on the server.' },
        { status: 500 }
      );
    }

    if (IS_GLOBAL_TEST_MODE) {
      return NextResponse.json({
        paymentsDisabled: true,
        message: 'Stripe Customer Portal is unavailable while payments are bypassed.',
      });
    }

    const stripe = getStripe();
    if (!stripe) {
      return stripeNotConfiguredResponse();
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

    const { companyId, locale } = parsed.data;

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

    const companyDoc = await admin.firestore().collection('companies').doc(companyId).get();
    if (!companyDoc.exists) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    const companyData = companyDoc.data() || {};
    const subscription = (companyData.subscription || {}) as Record<string, any>;
    const stripeSubscriptionId = subscription.stripeSubscriptionId as string | undefined;
    let stripeCustomerId = subscription.stripeCustomerId as string | undefined;

    if (!stripeCustomerId && stripeSubscriptionId) {
      const stripeSubscription = await stripe.subscriptions.retrieve(stripeSubscriptionId);
      stripeCustomerId = typeof stripeSubscription.customer === 'string' ? stripeSubscription.customer : undefined;

      if (stripeCustomerId) {
        await admin.firestore().collection('companies').doc(companyId).set(
          {
            subscription: {
              stripeCustomerId,
              updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            },
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          },
          { merge: true }
        );
      }
    }

    if (!stripeCustomerId) {
      return NextResponse.json(
        { error: 'No Stripe customer is linked yet. Start a subscription first.' },
        { status: 400 }
      );
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:9002';
    const safeLocale = locale || 'en';

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: stripeCustomerId,
      return_url: `${baseUrl}/${safeLocale}/accounting-firm/billing`,
    });

    return NextResponse.json({ url: portalSession.url });
  } catch (error: any) {
    console.error('Accounting billing portal error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
