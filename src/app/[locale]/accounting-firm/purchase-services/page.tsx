"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from "@/components/ui/card";
import { Check, ArrowRight, Loader2, AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { auth } from "@/firebase/config";
import { useToast } from "@/hooks/use-toast";
import { useAccountingSubscription } from "@/hooks/use-accounting-subscription";
import { ACCOUNTING_PLANS, getAccountingPlan, type AccountingSubscriptionPlan } from "@/lib/accounting-subscriptions";
import { loadStripe } from "@stripe/stripe-js";
import { useLocale, useTranslations } from "next-intl";
import { useFirebase } from "@/firebase/firebase-provider";
import { IS_GLOBAL_TEST_MODE } from "@/lib/test-mode";

const getStripePromise = () => {
  const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.trim();
  return publishableKey ? loadStripe(publishableKey) : null;
};

export default function PurchaseServicesPage() {
  const t = useTranslations('AccountingPurchase');
  const { toast } = useToast();
  const { user } = useFirebase();
  const locale = useLocale();
  const subscription = useAccountingSubscription();
  const [isSubmitting, setIsSubmitting] = useState<AccountingSubscriptionPlan | null>(null);

  const currentPlan = useMemo(() => getAccountingPlan(subscription.plan), [subscription.plan]);
  const currentPlanTitle = t(`plans.${currentPlan.id}.title`);

  const handleStartTrial = async (planId: AccountingSubscriptionPlan) => {
    if (!subscription.companyId) {
      toast({
        title: t('toast.noCompanyTitle'),
        description: t('toast.noCompanyDescription'),
        variant: "destructive",
      });
      return;
    }

    try {
      setIsSubmitting(planId);
      if (!user || !auth.currentUser) {
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
      if (!stripePromise) {
        throw new Error(t('toast.stripeUnavailable'));
      }

      const stripe = await stripePromise;
      if (!stripe) throw new Error(t('toast.stripeUnavailable'));

      const { error } = await stripe.redirectToCheckout({ sessionId: payload.sessionId });
      if (error) throw new Error(error.message);
    } catch (error) {
      console.error("Failed to activate accounting subscription trial:", error);
      toast({
        title: t('toast.checkoutFailedTitle'),
        description: error instanceof Error ? error.message : t('toast.tryAgain'),
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(null);
    }
  };

  const trialEndsLabel = subscription.trialEndsAt
    ? subscription.trialEndsAt.toLocaleDateString("en-CH")
    : null;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">{t('title')}</h1>
        <p className="text-muted-foreground">
          {t('subtitle')}
        </p>
      </div>

      <Card className="border-dashed">
        <CardContent className="pt-6 text-sm text-muted-foreground">
          {subscription.loading ? (
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>{t('loadingSubscription')}</span>
            </div>
          ) : subscription.error ? (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>{t('errorTitle')}</AlertTitle>
              <AlertDescription>{subscription.error}</AlertDescription>
            </Alert>
          ) : (
            <p>
              {t('currentPlan')}: <span className="font-semibold text-foreground">{currentPlanTitle}</span>
              {subscription.status === "trialing" && trialEndsLabel ? ` (${t('trialingUntil', { date: trialEndsLabel })})` : ""}
            </p>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-8 lg:grid-cols-3">
        {ACCOUNTING_PLANS.map((plan) => {
          const isCurrent = subscription.plan === plan.id;
          const loadingThis = isSubmitting === plan.id;
          const planTitle = t(`plans.${plan.id}.title`);
          const planDescription = t(`plans.${plan.id}.description`);

          return (
            <Card key={plan.id} className="flex flex-col">
              <CardHeader className="text-center">
                <CardTitle className="text-2xl">{planTitle}</CardTitle>
                <CardDescription>{planDescription}</CardDescription>
              </CardHeader>
              <CardContent className="flex-grow space-y-6">
                <div className="text-center">
                  <span className="text-4xl font-bold">CHF {plan.monthlyPriceChf}</span>
                  <span className="text-muted-foreground"> / {t('month')}</span>
                </div>

                <div className="rounded-md bg-muted p-3 text-center text-sm font-medium">
                  {t('trialIncluded')}
                </div>

                <ul className="space-y-3 text-muted-foreground">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start">
                      <Check className="mr-2 mt-0.5 h-5 w-5 flex-shrink-0 text-primary" />
                      <span>{t(`features.${feature}`)}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
              <CardFooter>
                <Button
                  className="w-full"
                  disabled={loadingThis || isCurrent || subscription.loading}
                  onClick={() => handleStartTrial(plan.id)}
                >
                  {loadingThis ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {t('activating')}
                    </>
                  ) : isCurrent ? (
                    t('currentPlanButton')
                  ) : (
                    <>
                      {t('startTrialButton')}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              </CardFooter>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
