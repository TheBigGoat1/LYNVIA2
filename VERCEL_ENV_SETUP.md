# Vercel Environment Variables Setup

The Stripe checkout redirect URLs are controlled by `NEXT_PUBLIC_BASE_URL`.

## Required Environment Variable

Set this in your Vercel project settings (Settings → Environment Variables):

```
NEXT_PUBLIC_BASE_URL=https://lynviadigital-nine.vercel.app
```

Add it to: ✓ Production ✓ Preview ✓ Development

## Other Environment Variables Needed

Make sure these are also set in Vercel:

```
# Firebase
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=lynviadigital.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=lynviadigital
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...

# Stripe (for payments)
STRIPE_SECRET_KEY=sk_live_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Groq (AI features)
GROQ_API_KEY=...

# Disable test mode in production
NEXT_PUBLIC_PAYMENTS_DISABLED=false
PAYMENTS_DISABLED=false
```

## Redeploy

After setting the environment variables, trigger a new deployment in Vercel.
