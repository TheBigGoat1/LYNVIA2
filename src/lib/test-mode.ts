/**
 * Payments bypass & QA mode.
 *
 * When active, Stripe Checkout and card wallet top-ups are not used; flows still
 * write orders, subscriptions, and wallet balances in Firestore so the app stays usable.
 *
 * Enable for local / staging functional work:
 *   NEXT_PUBLIC_PAYMENTS_DISABLED=true
 *
 * Legacy env vars (still honored for back-compat):
 *   NEXT_PUBLIC_TEST_MODE, NEXT_PUBLIC_IS_TEST_MODE, NEXT_PUBLIC_SIMULATED_TEST_MODE
 */

const envTruthy = (key: string): boolean => {
  const v = process.env[key]?.trim().toLowerCase();
  return v === 'true' || v === '1' || v === 'yes';
};

/** Primary switch: no Stripe, Firestore-only settlement. */
export const PAYMENTS_DISABLED =
  envTruthy('NEXT_PUBLIC_PAYMENTS_DISABLED') || envTruthy('PAYMENTS_DISABLED');

const LEGACY_QA_BYPASS =
  envTruthy('NEXT_PUBLIC_TEST_MODE') ||
  envTruthy('NEXT_PUBLIC_IS_TEST_MODE') ||
  envTruthy('NEXT_PUBLIC_SIMULATED_TEST_MODE');

/**
 * True when any bypass is on (explicit payments-off or legacy test env flags).
 * Used across client + API routes.
 */
export const IS_GLOBAL_TEST_MODE = PAYMENTS_DISABLED || LEGACY_QA_BYPASS;
