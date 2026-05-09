import Stripe from 'stripe';
import { NextResponse } from 'next/server';

export const STRIPE_API_VERSION = '2024-06-20' as const;

/**
 * Reads the Stripe secret key. Supports STRIPE_SECRET_KEY (primary) and STRIPE_KEY (alias).
 * Trims whitespace — common copy/paste issue from Dashboard.
 */
function readStripeSecretKey(): string | undefined {
  const raw =
    process.env.STRIPE_SECRET_KEY?.trim() ||
    process.env.STRIPE_KEY?.trim();
  if (!raw) return undefined;
  if (!raw.startsWith('sk_test_') && !raw.startsWith('sk_live_')) {
    if (process.env.NODE_ENV === 'development') {
      console.warn(
        '[stripe-server] STRIPE_SECRET_KEY should start with sk_test_ or sk_live_. Check .env.local for typos or quotes.',
      );
    }
  }
  return raw;
}

let stripeSingleton: Stripe | null | undefined;

/**
 * Server-side Stripe client. Returns null if STRIPE_SECRET_KEY is missing or empty.
 */
export function getStripe(): Stripe | null {
  if (stripeSingleton !== undefined) {
    return stripeSingleton;
  }
  const secret = readStripeSecretKey();
  if (!secret) {
    stripeSingleton = null;
    return null;
  }
  stripeSingleton = new Stripe(secret, { apiVersion: STRIPE_API_VERSION });
  return stripeSingleton;
}

export function isStripeConfigured(): boolean {
  return getStripe() !== null;
}

/**
 * Standard JSON response when the secret key is not set (local .env or hosting env).
 */
export function stripeNotConfiguredResponse() {
  return NextResponse.json(
    {
      error: 'Stripe is not configured on the server.',
      hint: 'Create .env.local in the project root, set STRIPE_SECRET_KEY=sk_test_… (and NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_…), then restart the dev server. See .env.example. On Vercel/Netlify, add the same variables in the dashboard.',
    },
    { status: 500 },
  );
}
