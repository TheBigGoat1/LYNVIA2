'use client';

import { useMemo, useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check, Loader2, AlertCircle, ArrowRight } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { auth } from '@/firebase/config';
import { loadStripe } from '@stripe/stripe-js';
import { useToast } from '@/hooks/use-toast';
import { useFirebase } from '@/firebase/firebase-provider';
import { useAccountingSubscription } from '@/hooks/use-accounting-subscription';
import { ACCOUNTING_PLANS, getAccountingPlan, type AccountingSubscriptionPlan } from '@/lib/accounting-subscriptions';
import { ProfileSettingsForm } from '@/components/settings/profile-settings-form';
import { PasswordSettingsForm } from '@/components/settings/password-settings-form';
import { DangerZone } from '@/components/settings/danger-zone';

const getStripePromise = () => {
  const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.trim();
  return publishableKey ? loadStripe(publishableKey) : null;
};

export default function AccountingFirmProfilePage() {
  const t = useTranslations('AccountingPurchase');
  const tSettings = useTranslations('Settings');
  const { toast } = useToast();
  const { user } = useFirebase();
  const locale = useLocale();
  const subscription = useAccountingSubscription();
  const [isSubmitting, setIsSubmitting] = useState<AccountingSubscriptionPlan | null>(null);

  const currentPlan = useMemo(() => getAccountingPlan(subscription.plan), [subscription.plan]);
  const currentPlanTitle = t(`plans.${currentPlan.id}.title`);
  const upgradablePlans = ACCOUNTING_PLANS.filter((p) => p.id !== subscription.plan);

  const trialEndsLabel = subscription.trialEndsAt
    ? subscription.trialEndsAt.toLocaleDateString('en-CH')
    : null;

  const handleUpgrade = async (planId: AccountingSubscriptionPlan) => {
    if (!subscription.companyId) {
      toast({
        title: t('toast.noCompanyTitle'),
        description: t('toast.noCompanyDescription'),
        variant: 'destructive',
      });
      return;
    }
    try {
      setIsSubmitting(planId);
      if (!user || !auth.currentUser) throw new Error(t('toast.mustLogin'));
      const idToken = await auth.currentUser.getIdToken();
      const response = await fetch('/api/accounting-firm/subscription-checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ companyId: subscription.companyId, plan: planId, locale }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || t('toast.checkoutCreateFailed'));
      }
      if (payload.testMode) {
        toast({
          title: 'Subscription activated',
          description: 'Your plan was saved in Firestore (Stripe checkout is off).',
        });
        return;
      }
      if (!payload.sessionId) {
        throw new Error(payload.error || t('toast.checkoutCreateFailed'));
      }
      const stripePromise = getStripePromise();
      if (!stripePromise) throw new Error(t('toast.stripeUnavailable'));
      const stripe = await stripePromise;
      if (!stripe) throw new Error(t('toast.stripeUnavailable'));
      const { error } = await stripe.redirectToCheckout({ sessionId: payload.sessionId });
      if (error) throw new Error(error.message);
    } catch (error) {
      toast({
        title: t('toast.checkoutFailedTitle'),
        description: error instanceof Error ? error.message : t('toast.tryAgain'),
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(null);
    }
  };

  return (
    <div className="space-y-10">
      {/* ── Subscription section ── */}
      <div className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold">{t('title')}</h2>
          <p className="text-sm text-muted-foreground">{t('subtitle')}</p>
        </div>

        {subscription.loading ? (
          <Skeleton className="h-40 w-full" />
        ) : subscription.error ? (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>{t('errorTitle')}</AlertTitle>
            <AlertDescription>{subscription.error}</AlertDescription>
          </Alert>
        ) : (
          <Card>
            <CardHeader className="flex flex-row items-start justify-between gap-4">
              <div>
                <CardTitle className="text-lg">{currentPlanTitle}</CardTitle>
                <CardDescription>
                  {t('currentPlan')}
                  {subscription.status === 'trialing' && trialEndsLabel
                    ? ` · ${t('trialingUntil', { date: trialEndsLabel })}`
                    : ''}
                </CardDescription>
              </div>
              <Badge
                variant={
                  subscription.status === 'active'
                    ? 'default'
                    : subscription.status === 'trialing'
                    ? 'secondary'
                    : 'outline'
                }
                className="capitalize"
              >
                {subscription.status}
              </Badge>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="space-y-2 text-sm text-muted-foreground">
                {currentPlan.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-2">
                    <Check className="h-4 w-4 flex-shrink-0 text-primary" />
                    {t(`features.${feature}`)}
                  </li>
                ))}
              </ul>

              {upgradablePlans.length > 0 && (
                <div className="space-y-2 border-t pt-4">
                  {upgradablePlans.map((plan) => (
                    <Button
                      key={plan.id}
                      variant="outline"
                      className="w-full"
                      disabled={isSubmitting === plan.id || subscription.loading}
                      onClick={() => handleUpgrade(plan.id)}
                    >
                      {isSubmitting === plan.id ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          {t('activating')}
                        </>
                      ) : (
                        <>
                          {t('startTrialButton')} — {t(`plans.${plan.id}.title`)} (CHF{' '}
                          {plan.monthlyPriceChf}/mo)
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </>
                      )}
                    </Button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* ── Profile settings section ── */}
      <div className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold">{tSettings('title')}</h2>
          <p className="text-sm text-muted-foreground">{tSettings('subtitle')}</p>
        </div>
        <div className="space-y-8">
          <ProfileSettingsForm />
          <PasswordSettingsForm />
          <DangerZone />
        </div>
      </div>
    </div>
  );
}
