"use client";

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, ExternalLink, CreditCard, CalendarClock, ReceiptText, Sparkles } from 'lucide-react';
import { useAccountingSubscription } from '@/hooks/use-accounting-subscription';
import { getAccountingPlan, type AccountingSubscriptionPlan } from '@/lib/accounting-subscriptions';
import { useToast } from '@/hooks/use-toast';
import { auth, firestore } from '@/firebase/config';
import { useLocale, useTranslations } from 'next-intl';
import { collection, limit, onSnapshot, orderBy, query } from 'firebase/firestore';
import { loadStripe } from '@stripe/stripe-js';

const getStripePromise = () => {
  const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.trim();
  return publishableKey ? loadStripe(publishableKey) : null;
};

type AccountingPaymentEntry = {
  id: string;
  amountChf: number;
  currency: string;
  status: string;
  description: string;
  plan: string | null;
  paidAt: Date | null;
  invoiceHostedUrl: string | null;
  invoicePdfUrl: string | null;
};

const getPaymentStatusLabel = (status: string) => {
  const normalized = status.toLowerCase();
  if (normalized === 'paid') return 'PAID';
  if (normalized === 'completed') return 'COMPLETED';
  if (normalized === 'pending') return 'PENDING';
  return normalized.toUpperCase();
};

const daysUntil = (date: Date | null): number | null => {
  if (!date) return null;
  const diff = date.getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
};

export default function AccountingFirmBillingPage() {
  const subscription = useAccountingSubscription();
  const locale = useLocale();
  const t = useTranslations('AccountingBilling');
  const { toast } = useToast();
  const [isOpeningPortal, setIsOpeningPortal] = useState(false);
  const [isStartingSubscription, setIsStartingSubscription] = useState(false);
  const [payments, setPayments] = useState<AccountingPaymentEntry[]>([]);
  const [paymentsLoading, setPaymentsLoading] = useState(true);

  const plan = useMemo(() => getAccountingPlan(subscription.plan), [subscription.plan]);
  const trialDaysLeft = daysUntil(subscription.trialEndsAt);

  const statusTone =
    subscription.status === 'active'
      ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
      : subscription.status === 'trialing'
        ? 'bg-amber-100 text-amber-800 border-amber-200'
        : 'bg-slate-100 text-slate-700 border-slate-200';

  const startSubscriptionCheckout = async (planId: AccountingSubscriptionPlan) => {
    if (!subscription.companyId) {
      toast({
        title: t('toast.noCompanyTitle'),
        description: t('toast.noCompanyDescription'),
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsStartingSubscription(true);

      if (!auth.currentUser) {
        throw new Error(t('toast.mustLogin'));
      }

      const idToken = await auth.currentUser.getIdToken();
      const response = await fetch('/api/accounting-firm/subscription-checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          companyId: subscription.companyId,
          plan: planId,
          locale,
        }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || t('toast.portalOpenFailedDescription'));
      }

      if (payload.testMode) {
        toast({
          title: 'Subscription activated',
          description: 'Your plan was saved in Firestore (Stripe checkout is off).',
        });
        return;
      }

      if (!payload.sessionId) {
        throw new Error(payload.error || t('toast.portalOpenFailedDescription'));
      }

      const stripePromise = getStripePromise();
      if (!stripePromise) {
        throw new Error(t('toast.stripeNotLoaded'));
      }

      const stripe = await stripePromise;
      if (!stripe) {
        throw new Error(t('toast.stripeNotLoaded'));
      }

      const { error } = await stripe.redirectToCheckout({ sessionId: payload.sessionId });
      if (error) {
        throw new Error(error.message);
      }
    } catch (error) {
      toast({
        title: t('toast.portalOpenFailedTitle'),
        description: error instanceof Error ? error.message : t('toast.tryAgain'),
        variant: 'destructive',
      });
    } finally {
      setIsStartingSubscription(false);
    }
  };

  useEffect(() => {
    if (!subscription.companyId) {
      setPayments([]);
      setPaymentsLoading(false);
      return;
    }

    setPaymentsLoading(true);

    const q = query(
      collection(firestore, 'companies', subscription.companyId, 'payments'),
      orderBy('createdAt', 'desc'),
      limit(20)
    );

    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        const next = snap.docs.map((docSnap) => {
          const row = docSnap.data() as Record<string, any>;
          const paidAtRaw = row.paidAt;
          const paidAt = typeof paidAtRaw?.toDate === 'function' ? paidAtRaw.toDate() : null;

          return {
            id: docSnap.id,
            amountChf: Number(row.amountChf || 0),
            currency: row.currency || 'CHF',
            status: row.status || 'paid',
            description: row.description || t('payments.defaultDescription'),
            plan: row.plan || null,
            paidAt,
            invoiceHostedUrl: row.invoiceHostedUrl || null,
            invoicePdfUrl: row.invoicePdfUrl || null,
          } as AccountingPaymentEntry;
        });

        setPayments(next);
        setPaymentsLoading(false);
      },
      () => {
        setPayments([]);
        setPaymentsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [subscription.companyId, t]);

  const openBillingPortal = async () => {
    if (!subscription.companyId) {
      toast({
        title: t('toast.noCompanyTitle'),
        description: t('toast.noCompanyDescription'),
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsOpeningPortal(true);

      if (!auth.currentUser) {
        throw new Error(t('toast.mustLogin'));
      }

      const idToken = await auth.currentUser.getIdToken();
      const response = await fetch('/api/accounting-firm/billing-portal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          companyId: subscription.companyId,
          locale,
        }),
      });

      const payload = await response.json();
      if (payload.paymentsDisabled) {
        toast({
          title: 'Billing portal unavailable',
          description:
            typeof payload.message === 'string'
              ? payload.message
              : 'Stripe Customer Portal is off while payments are bypassed.',
        });
        return;
      }
      if (!response.ok || !payload.url) {
        if (typeof payload?.error === 'string' && payload.error.toLowerCase().includes('no stripe customer')) {
          await startSubscriptionCheckout(subscription.plan);
          return;
        }
        throw new Error(payload.error || t('toast.portalOpenFailedDescription'));
      }

      window.location.href = payload.url;
    } catch (error) {
      toast({
        title: t('toast.portalOpenFailedTitle'),
        description: error instanceof Error ? error.message : t('toast.tryAgain'),
        variant: 'destructive',
      });
    } finally {
      setIsOpeningPortal(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t('title')}</h1>
        <p className="text-sm text-muted-foreground">{t('subtitle')}</p>
      </div>

      <Card className="overflow-hidden border border-border bg-card shadow-sm">
        <CardHeader className="pb-2 pt-4">
          <CardTitle className="flex items-center gap-2 text-[1.7rem] leading-none">
            <CreditCard className="h-4 w-4" />
            {t('currentSubscriptionTitle')}
          </CardTitle>
          <CardDescription className="text-xs">{t('monthlyOnly')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2.5 pt-0 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted-foreground">{t('planLabel')}:</span>
            <span className="font-semibold">{plan.title}</span>
            <span className="text-xs text-muted-foreground">(CHF {plan.monthlyPriceChf}/{t('month')})</span>
            <Badge className={`${statusTone} text-[11px]`}>{subscription.status.toUpperCase()}</Badge>
          </div>
          {subscription.status === 'trialing' && (
            <p className="flex items-center gap-2 text-sm">
              <CalendarClock className="h-4 w-4 text-muted-foreground" />
              {t('trialEndsLabel')}: <span className="font-semibold">{subscription.trialEndsAt?.toLocaleDateString(locale) || t('na')}</span>
              {trialDaysLeft !== null ? <span className="text-xs text-muted-foreground">({t('trialDaysLeft', { count: trialDaysLeft })})</span> : null}
            </p>
          )}
          {subscription.status === 'inactive' && (
            <div className="rounded-md border border-amber-200 bg-amber-50 p-2.5 text-amber-900">
              <p className="flex items-center gap-2 text-sm font-medium">
                <Sparkles className="h-4 w-4" />
                {t('inactiveNoticeTitle')}
              </p>
              <p className="mt-0.5 text-xs">{t('inactiveNoticeDescription')}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2 pt-4">
          <CardTitle className="text-[1.7rem] leading-none">{t('billingPortalTitle')}</CardTitle>
          <CardDescription className="text-xs">
            {t('billingPortalDescription')}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2 pt-0">
          <Button size="sm" onClick={openBillingPortal} disabled={isOpeningPortal || isStartingSubscription || subscription.loading}>
            {isOpeningPortal || isStartingSubscription ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {isStartingSubscription ? t('startingCheckout') : t('openingPortal')}
              </>
            ) : (
              <>
                {t('manageBillingButton')}
                <ExternalLink className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
          <Button size="sm" asChild variant="outline" disabled={isOpeningPortal || isStartingSubscription || subscription.loading}>
            <Link href={`/${locale}/accounting-firm/purchase-services`}>{t('choosePlan')}</Link>
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2 pt-4">
          <CardTitle className="flex items-center gap-2 text-[1.7rem] leading-none">
            <ReceiptText className="h-5 w-5" />
            {t('payments.title')}
          </CardTitle>
          <CardDescription className="text-xs">{t('payments.description')}</CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          {paymentsLoading ? (
            <div className="flex items-center text-sm text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {t('payments.loading')}
            </div>
          ) : payments.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('payments.empty')}</p>
          ) : (
            <div className="space-y-2">
              {payments.map((payment) => (
                <div key={payment.id} className="flex flex-col gap-2 rounded-lg border bg-white p-2.5 text-sm md:flex-row md:items-center md:justify-between">
                  <div className="space-y-0.5">
                    <p className="font-medium">{payment.description}</p>
                    <p className="text-xs text-muted-foreground">
                      CHF {payment.amountChf.toFixed(2)} • {getPaymentStatusLabel(payment.status)}
                      {payment.plan ? ` • ${payment.plan.toUpperCase()}` : ''}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {payment.paidAt ? payment.paidAt.toLocaleDateString(locale) : t('na')}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {payment.invoiceHostedUrl ? (
                      <Button asChild size="sm" variant="outline">
                        <a href={payment.invoiceHostedUrl} target="_blank" rel="noreferrer">{t('payments.viewInvoice')}</a>
                      </Button>
                    ) : null}
                    {payment.invoicePdfUrl ? (
                      <Button asChild size="sm" variant="outline">
                        <a href={payment.invoicePdfUrl} target="_blank" rel="noreferrer">{t('payments.downloadPdf')}</a>
                      </Button>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
