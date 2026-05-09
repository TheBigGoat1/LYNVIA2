"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Loader2 } from "lucide-react";
import { INDIVIDUAL_ACCESS_PRICING } from "@/lib/individual-access-pricing";
import { loadStripe } from "@stripe/stripe-js";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { firestore } from "@/firebase/config";
import { useFirebase } from "@/firebase/firebase-provider";
import { useToast } from "@/hooks/use-toast";
import { finalizeTestModeCheckoutOrder } from "@/lib/checkout-test-mode";
import { IS_GLOBAL_TEST_MODE } from "@/lib/test-mode";

const stripePk = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
const stripePromise =
  !IS_GLOBAL_TEST_MODE && stripePk ? loadStripe(stripePk) : Promise.resolve(null);

type AddOnItem = {
  id: string;
  title: string;
  description: string;
  priceChf: number;
};

export default function IndividualPurchaseServicesPage() {
  const [loadingAddOnId, setLoadingAddOnId] = useState<string | null>(null);
  const { user } = useFirebase();
  const { toast } = useToast();
  const locale = useLocale();
  const t = useTranslations("PurchaseServicesPage");

  const addOns: AddOnItem[] = [
    {
      id: "individual_scenario_addon",
      title: t("addOns.additionalScenario.title"),
      description: t("addOns.additionalScenario.description"),
      priceChf: INDIVIDUAL_ACCESS_PRICING.addOns.extraScenarioPriceChf,
    },
    {
      id: "individual_reviewed_document",
      title: t("addOns.reviewedDocument.title"),
      description: t("addOns.reviewedDocument.description"),
      priceChf: INDIVIDUAL_ACCESS_PRICING.addOns.reviewedDocumentPriceChf,
    },
    {
      id: "individual_instant_pdf",
      title: t("addOns.instantPdf.title"),
      description: t("addOns.instantPdf.description"),
      priceChf: INDIVIDUAL_ACCESS_PRICING.addOns.instantPdfPriceChf,
    },
  ];

  const handleBuyAddOn = async (item: AddOnItem) => {
    if (!user) {
      toast({
        title: t("toasts.loginRequired.title"),
        description: t("toasts.loginRequired.description"),
        variant: "destructive",
      });
      window.location.href = `/${locale}/login`;
      return;
    }

    setLoadingAddOnId(item.id);

    try {
      const orderRef = await addDoc(collection(firestore, "users", user.uid, "orders"), {
        userId: user.uid,
        userEmail: user.email,
        userName: user.displayName || t("fallback.anonymousUser"),
        serviceId: item.id,
        serviceTitle: item.title,
        serviceType: "fixed",
        priceAmount: item.priceChf * 100,
        status: "pending_payment",
        paymentMethod: "card",
        intakeData: {
          additionalInfo: t("fallback.individualAccessAddOn"),
        },
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      if (IS_GLOBAL_TEST_MODE) {
        await finalizeTestModeCheckoutOrder({
          userId: user.uid,
          orderId: orderRef.id,
          serviceTitle: item.title,
        });
        toast({
          title: "Simulated payment",
          description: "Order marked paid without Stripe (audit / simulated test mode).",
        });
        window.location.href = `/${locale}/individual/my-orders`;
        return;
      }

      const response = await fetch(`/api/checkout_sessions?locale=${locale}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: orderRef.id,
          serviceId: item.id,
          serviceName: item.title,
          price: item.priceChf * 100,
          userId: user.uid,
          pricingSummary: `Individual add-on ${item.id}`,
        }),
      });

      if (!response.ok) {
        const errorBody = await response.json();
        throw new Error(errorBody.error || t("toasts.checkoutFailed.fallback"));
      }

      const payload = await response.json();
      if (payload.testMode) {
        await finalizeTestModeCheckoutOrder({
          userId: user.uid,
          orderId: orderRef.id,
          serviceTitle: item.title,
        });
        toast({
          title: "Simulated payment",
          description: "Order marked paid without Stripe (audit / simulated test mode).",
        });
        window.location.href = `/${locale}/individual/my-orders`;
        return;
      }

      const { sessionId } = payload;
      const stripe = await stripePromise;

      if (!stripe) {
        throw new Error(t("toasts.checkoutFailed.stripeNotLoaded"));
      }

      const { error } = await stripe.redirectToCheckout({ sessionId });
      if (error) {
        throw new Error(error.message);
      }
    } catch (error) {
      toast({
        title: t("toasts.checkoutFailed.title"),
        description: error instanceof Error ? error.message : t("toasts.checkoutFailed.retry"),
        variant: "destructive",
      });
    } finally {
      setLoadingAddOnId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">{t("title")}</h1>
        <p className="text-muted-foreground">{t("subtitle")}</p>
      </div>

      {IS_GLOBAL_TEST_MODE && (
        <p className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-100">
          Payments bypass is on: add-on purchases complete in Firestore only (no Stripe Checkout).
        </p>
      )}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-2xl">
            {t("freeVersion.title")}
            <Badge variant="secondary">{t("freeVersion.badge")}</Badge>
          </CardTitle>
          <CardDescription>{t("freeVersion.description")}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm md:grid-cols-2">
          <p className="flex items-start gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />{t("freeVersion.features.aiExchanges")}</p>
          <p className="flex items-start gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />{t("freeVersion.features.scenariosPerMonth")}</p>
          <p className="flex items-start gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />{t("freeVersion.features.pillar3a")}</p>
          <p className="flex items-start gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />{t("freeVersion.features.documentPreview")}</p>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        {addOns.map((item) => (
          <Card key={item.id}>
            <CardHeader className="pb-3">
              <CardTitle className="text-base leading-snug md:text-lg">{item.title}</CardTitle>
              <CardDescription>{item.description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-2xl font-semibold">CHF {item.priceChf}</p>
              <Button
                className="w-full"
                onClick={() => handleBuyAddOn(item)}
                disabled={loadingAddOnId !== null}
              >
                {loadingAddOnId === item.id ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t("buttons.redirecting")}
                  </>
                ) : (
                  t("buttons.buyAddOn")
                )}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="pb-4">
          <CardTitle>{t("compliance.title")}</CardTitle>
          <CardDescription>
            {t("compliance.description")}
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}
