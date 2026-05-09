import { NextRequest, NextResponse } from 'next/server';
import admin, { ensureAdminInitialized } from '@/firebase/admin-config';
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
    const { sessionId } = await request.json();
    if (!sessionId || typeof sessionId !== 'string') {
      return NextResponse.json({ error: 'sessionId is required' }, { status: 400 });
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (session.mode !== 'payment') {
      return NextResponse.json({ error: 'Unsupported session mode' }, { status: 400 });
    }

    const metadata = (session.metadata || {}) as Record<string, string>;
    if (metadata.userId !== decoded.uid) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const purpose = metadata.purpose;
    if (purpose !== 'document_review' && purpose !== 'document_pdf') {
      return NextResponse.json({ error: 'Invalid fee purpose' }, { status: 400 });
    }

    if (session.payment_status !== 'paid') {
      return NextResponse.json({ paid: false, status: session.payment_status });
    }

    return NextResponse.json({ paid: true, purpose });
  } catch (err) {
    console.error('document-fee-reconcile', err);
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
