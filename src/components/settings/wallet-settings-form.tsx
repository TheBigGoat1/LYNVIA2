'use client';

import { useMemo, useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Wallet, Loader2 } from 'lucide-react';
import { useFirebase } from '@/firebase/firebase-provider';
import { useToast } from '@/hooks/use-toast';
import { doc, onSnapshot } from 'firebase/firestore';
import { firestore } from '@/firebase/config';
import { loadStripe } from '@stripe/stripe-js';
import { useLocale } from 'next-intl';
import { IS_GLOBAL_TEST_MODE } from '@/lib/test-mode';

const stripePublishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
const stripePromise = stripePublishableKey ? loadStripe(stripePublishableKey) : Promise.resolve(null);

export function WalletSettingsForm() {
  const { user } = useFirebase();
  const { toast } = useToast();
  const locale = useLocale();

  const [walletBalanceCents, setWalletBalanceCents] = useState(0);
  const [isBusy, setIsBusy] = useState(false);
  const [customAmountChf, setCustomAmountChf] = useState('50');

  useEffect(() => {
    if (!user) return;
    const walletRef = doc(firestore, 'users', user.uid, 'wallet', 'main');
    const unsub = onSnapshot(walletRef, (snap) => {
      setWalletBalanceCents((snap.data()?.balanceCents as number | undefined) ?? 0);
    });
    return () => unsub();
  }, [user]);

  const formattedBalance = useMemo(() => `CHF ${(walletBalanceCents / 100).toFixed(2)}`, [walletBalanceCents]);

  const MIN_TOPUP_CENTS = 500;
  const MAX_TOPUP_CENTS = 500_000;

  const startTopup = async (amountCents: number) => {
    if (!user) return;

    if (!Number.isFinite(amountCents) || amountCents < MIN_TOPUP_CENTS || amountCents > MAX_TOPUP_CENTS) {
      toast({
        variant: 'destructive',
        title: 'Invalid amount',
        description: 'Top-up must be between CHF 5 and CHF 5,000.',
      });
      return;
    }

    setIsBusy(true);
    try {
      const token = await user.getIdToken();
      const res = await fetch('/api/wallet/topup-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ amountCents, locale }),
      });

      const payload = await res.json();
      if (!res.ok) {
        throw new Error(payload?.error || 'Could not initialize wallet top-up.');
      }

      if (payload.testMode || IS_GLOBAL_TEST_MODE) {
        const chf = (amountCents / 100).toFixed(2);
        toast({
          title: 'Wallet credited',
          description: `CHF ${chf} added (payments bypassed — no Stripe).`,
        });
        return;
      }

      if (!stripePublishableKey) {
        throw new Error('Stripe publishable key is missing.');
      }

      const stripe = await stripePromise;
      if (!stripe) {
        throw new Error('Stripe is not available.');
      }

      toast({
        variant: 'info',
        title: 'Redirecting to checkout',
        description: 'Complete payment in the secure Stripe window.',
      });

      const { error } = await stripe.redirectToCheckout({ sessionId: payload.sessionId });
      if (error) {
        throw new Error(error.message);
      }
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Wallet top-up failed',
        description: error?.message || 'Please try again.',
      });
    } finally {
      setIsBusy(false);
    }
  };

  const handleCustomTopup = async () => {
    const parsed = Number(String(customAmountChf).replace(',', '.'));
    if (!Number.isFinite(parsed)) {
      toast({
        variant: 'destructive',
        title: 'Invalid amount',
        description: 'Enter a number in CHF.',
      });
      return;
    }
    const amountCents = Math.round(parsed * 100);
    await startTopup(amountCents);
  };

  return (
    <Card id="wallet">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wallet className="h-5 w-5 text-primary" />
          Wallet
        </CardTitle>
        <CardDescription>Deposit funds and pay services directly from your wallet.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-lg border bg-muted/40 p-3">
          <p className="text-xs text-muted-foreground">Current Balance</p>
          <p className="text-2xl font-bold leading-none mt-1">{formattedBalance}</p>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Button type="button" variant="outline" disabled={isBusy} onClick={() => startTopup(5000)}>
            + CHF 50
          </Button>
          <Button type="button" variant="outline" disabled={isBusy} onClick={() => startTopup(10000)}>
            + CHF 100
          </Button>
        </div>

        <div className="space-y-2">
          <Label htmlFor="custom-wallet-amount">Custom Amount (CHF)</Label>
          <div className="flex gap-2">
            <Input
              id="custom-wallet-amount"
              type="number"
              min={5}
              step="1"
              value={customAmountChf}
              onChange={(e) => setCustomAmountChf(e.target.value)}
              disabled={isBusy}
            />
            <Button type="button" onClick={handleCustomTopup} disabled={isBusy}>
              {isBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Deposit'}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">Between CHF 5 and CHF 5,000 per top-up.</p>
        </div>
      </CardContent>
      <CardFooter>
        <p className="text-xs text-muted-foreground">
          {IS_GLOBAL_TEST_MODE
            ? 'Payments are bypassed: deposits credit your wallet in Firestore only (no card).'
            : 'Secure payment is processed by Stripe.'}
        </p>
      </CardFooter>
    </Card>
  );
}
