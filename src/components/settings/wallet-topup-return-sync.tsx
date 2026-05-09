'use client';

import { useEffect, useRef } from 'react';
import { useSearchParams, usePathname, useRouter } from 'next/navigation';
import { useFirebase } from '@/firebase/firebase-provider';
import { useToast } from '@/hooks/use-toast';

/**
 * After Stripe Checkout redirects back with ?wallet_topup=success&session_id=…,
 * credits the wallet if the webhook has not run yet (same idempotency as webhook).
 */
export function WalletTopupReturnSync() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useFirebase();
  const { toast } = useToast();
  const ranRef = useRef(false);

  useEffect(() => {
    if (ranRef.current) return;
    const flag = searchParams.get('wallet_topup');
    const sessionId = searchParams.get('session_id');

    if (flag === 'canceled') {
      ranRef.current = true;
      toast({
        title: 'Top-up canceled',
        description: 'No payment was taken.',
      });
      router.replace(pathname);
      return;
    }

    if (flag !== 'success' || !sessionId || !user) {
      return;
    }

    ranRef.current = true;

    (async () => {
      try {
        const token = await user.getIdToken();
        const res = await fetch('/api/wallet/reconcile-topup', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ sessionId }),
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data?.error || 'Could not confirm top-up.');
        }
        if (!data.paid) {
          toast({
            variant: 'destructive',
            title: 'Payment not completed',
            description: 'Your wallet was not charged.',
          });
          router.replace(pathname);
          return;
        }
        const chf = typeof data.amountCents === 'number' ? (data.amountCents / 100).toFixed(2) : '?';
        if (data.credited) {
          toast({
            title: 'Wallet credited',
            description: `CHF ${chf} added to your wallet.`,
          });
        } else if (data.duplicate) {
          toast({
            title: 'Wallet up to date',
            description: `This payment was already applied (CHF ${chf}).`,
          });
        }
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : 'Please try again or check Settings → Wallet.';
        toast({
          variant: 'destructive',
          title: 'Could not confirm top-up',
          description: msg,
        });
      } finally {
        router.replace(pathname);
      }
    })();
  }, [searchParams, pathname, router, user, toast]);

  return null;
}
