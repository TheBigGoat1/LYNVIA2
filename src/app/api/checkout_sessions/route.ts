import { NextRequest, NextResponse } from 'next/server';
import { IS_GLOBAL_TEST_MODE } from '@/lib/test-mode';
import { getStripe, stripeNotConfiguredResponse } from '@/lib/stripe-server';

export async function POST(request: NextRequest) {
  try {
    const { serviceName, price, userId, serviceId, orderId, pricingSummary, successRedirectPath } = await request.json();
    const locale = request.nextUrl.searchParams.get('locale') || 'en';

    if (IS_GLOBAL_TEST_MODE) {
      return NextResponse.json({
        testMode: true,
        sessionId: null,
        message:
          'Checkout simulated (NEXT_PUBLIC_PAYMENTS_DISABLED or legacy test env). Client should mark order paid.',
      });
    }

    const stripe = getStripe();
    if (!stripe) {
      return stripeNotConfiguredResponse();
    }
    
    if (
      !serviceName ||
      typeof price !== 'number' ||
      !Number.isFinite(price) ||
      price <= 0 ||
      !userId ||
      !serviceId ||
      !orderId
    ) {
      return NextResponse.json({ error: 'Missing required session parameters' }, { status: 400 });
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:9002';
    // Use caller-supplied redirect path, or fall back to my-orders
    const resolvedSuccessPath =
      typeof successRedirectPath === 'string' && successRedirectPath.startsWith('/individual/')
        ? successRedirectPath
        : '/individual/my-orders';
    
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'chf',
            product_data: {
              name: serviceName,
            },
            unit_amount: price,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${baseUrl}/${locale}${resolvedSuccessPath}?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/${locale}/individual/my-orders?canceled=true`,
      metadata: {
        userId,
        serviceId,
        orderId,
        serviceTitle: serviceName,
        pricingSummary: typeof pricingSummary === 'string' ? pricingSummary.slice(0, 500) : 'N/A',
      }
    });

    return NextResponse.json({ sessionId: session.id });
  } catch (err) {
    console.error(err);
    const errorMessage = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
