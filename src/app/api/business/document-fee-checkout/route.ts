import { NextRequest, NextResponse } from 'next/server';
import admin, { ensureAdminInitialized } from '@/firebase/admin-config';
import { IS_GLOBAL_TEST_MODE } from '@/lib/test-mode';
import { z } from 'zod';
import { getStripe, stripeNotConfiguredResponse } from '@/lib/stripe-server';

const bodySchema = z.object({
  amountCents: z.number().int().positive().max(500_000),
  locale: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    if (IS_GLOBAL_TEST_MODE) {
      return NextResponse.json({ testMode: true, sessionId: null });
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
    const json = await request.json();
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input', issues: parsed.error.issues }, { status: 400 });
    }

    const { amountCents, locale } = parsed.data;
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:9002';
    const loc = locale || 'en';

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      line_items: [
        {
          price_data: {
            currency: 'chf',
            product_data: { name: 'Document — PDF/Word download (Lynvia Business)' },
            unit_amount: amountCents,
          },
          quantity: 1,
        },
      ],
      success_url: `${baseUrl}/${loc}/business/document-generator/success?fee_purpose=${purpose}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/${loc}/business/document-generator?fee_cancel=1`,
      metadata: {
        userId: decoded.uid,
        purpose: 'document_pdf',
        amountCents: String(amountCents),
      },
    });

    return NextResponse.json({ sessionId: session.id });
  } catch (err) {
    console.error('business/document-fee-checkout', err);
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
