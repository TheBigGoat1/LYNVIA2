'use client';

import { useEffect, useMemo, useState } from 'react';
import { Link, useRouter } from '@/navigation';
import { notFound } from 'next/navigation';
import { taxServices } from '@/data/tax-services';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { ArrowLeft, Loader2, Send } from 'lucide-react';
import { useFirebase } from '@/firebase/firebase-provider';
import { loadStripe } from '@stripe/stripe-js';
import { useToast } from '@/hooks/use-toast';
import { useLocale, useTranslations } from 'next-intl';
import { addDoc, collection, doc, getDoc, onSnapshot, orderBy, query, serverTimestamp } from 'firebase/firestore';
import { firestore } from '@/firebase/config';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { finalizeTestModeCheckoutOrder } from '@/lib/checkout-test-mode';
import { IS_GLOBAL_TEST_MODE } from '@/lib/test-mode';
import { notifyAdmin } from '@/lib/admin-notifications';
import {
  getMandatoryTaxDocuments,
  isYearlyTaxReturnOrder,
  type TaxMasterProfileLite,
} from '@/lib/tax-mandatory-documents';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  BANK_ASSETS_OPTIONS,
  CHILDREN_OPTIONS,
  DEFAULT_TAX_SERVICE_SELECTIONS,
  DEPENDENTS_OPTIONS,
  PROPERTIES_OPTIONS,
  formatTaxServiceSelectionsForAudit,
  getTaxServicePricingBreakdown,
  type BankAssetsOption,
  type ChildrenOption,
  type DependentsOption,
  type PropertiesOption,
} from '@/lib/tax-service-pricing';

const stripePublishable = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
const stripePromise = stripePublishable ? loadStripe(stripePublishable) : Promise.resolve(null);

export default function ServiceCheckoutPage({ params }: { params: { serviceId: string } }) {
  const [isLoading, setIsLoading] = useState(false);
  const [notes, setNotes] = useState('');
  const [children, setChildren] = useState<ChildrenOption>(DEFAULT_TAX_SERVICE_SELECTIONS.children);
  const [properties, setProperties] = useState<PropertiesOption>(DEFAULT_TAX_SERVICE_SELECTIONS.properties);
  const [bankAssets, setBankAssets] = useState<BankAssetsOption>(DEFAULT_TAX_SERVICE_SELECTIONS.bankAssets);
  const [dependents, setDependents] = useState<DependentsOption>(DEFAULT_TAX_SERVICE_SELECTIONS.dependents);
  const [hasActivePurchase, setHasActivePurchase] = useState(false);

  const router = useRouter();
  const { user } = useFirebase();
  const { toast } = useToast();
  const locale = useLocale();
  const t = useTranslations('TaxServices');

  const selectedService = useMemo(
    () => taxServices.find((entry) => entry.id === params.serviceId),
    [params.serviceId],
  );

  useEffect(() => {
    if (!user || !selectedService) {
      setHasActivePurchase(false);
      return;
    }
    const q = query(collection(firestore, 'users', user.uid, 'orders'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Record<string, unknown>);
      const hit = list.some(
        (o) =>
          isYearlyTaxReturnOrder(o as { serviceId?: string; orderType?: string }) &&
          o.serviceId === selectedService.id &&
          ['paid', 'in_progress', 'pending_review'].includes(String(o.status)),
      );
      setHasActivePurchase(hit);
    });
    return () => unsub();
  }, [user, selectedService]);

  if (!selectedService) {
    notFound();
  }

  const service = selectedService;
  const serviceTitle = t(`catalog.${service.id}.title`);
  const serviceDescription = t(`catalog.${service.id}.description`);
  const serviceActionText = t(`catalog.${service.id}.actionText`);

  const pricingBreakdown = useMemo(() => {
    return getTaxServicePricingBreakdown(service.id, {
      children,
      properties,
      bankAssets,
      dependents,
    });
  }, [service.id, children, properties, bankAssets, dependents]);

  const priceAmount = pricingBreakdown.totalPriceCents;

  const handleCheckout = async () => {
    if (!user) {
      toast({
        variant: 'destructive',
        title: t('toast.notLoggedIn.title'),
        description: t('toast.notLoggedIn.description'),
      });
      router.push('/login');
      return;
    }

    setIsLoading(true);

    try {
      const mpSnap = await getDoc(doc(firestore, 'users', user.uid, 'masterProfile', 'baseline'));
      const mp = mpSnap.exists() ? (mpSnap.data() as TaxMasterProfileLite) : null;
      const selections = service.hasVariants
        ? { children, properties, bankAssets, dependents }
        : undefined;
      const mandatory = getMandatoryTaxDocuments(service.id, mp, selections);
      const documentsRequired = mandatory.length;

      const orderRef = await addDoc(collection(firestore, 'users', user.uid, 'orders'), {
        userId: user.uid,
        userEmail: user.email,
        userName: user.displayName || t('fallback.anonymousUser'),
        serviceId: service.id,
        serviceTitle,
        orderType: 'tax',
        serviceType: service.requiresContact ? 'quote' : 'fixed',
        priceAmount,
        status: service.requiresContact ? 'quote_requested' : 'pending_payment',
        paymentMethod: service.requiresContact ? 'quote' : 'card',
        intakeData: {
          additionalInfo: notes,
          documentsRequired,
          pricingSelections: service.hasVariants
            ? {
                children,
                properties,
                bankAssets,
                dependents,
              }
            : null,
          pricingSelectionsText: service.hasVariants
            ? formatTaxServiceSelectionsForAudit({
                children,
                properties,
                bankAssets,
                dependents,
              })
            : 'no-variants',
          pricingBreakdown,
        },
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      const orderId = orderRef.id;

      if (service.requiresContact) {
        toast({
          title: t('toast.quoteSent.title'),
          description: t('toast.quoteSent.description'),
        });
        router.push('/individual/my-orders');
        return;
      }

      if (IS_GLOBAL_TEST_MODE) {
        await finalizeTestModeCheckoutOrder({
          userId: user.uid,
          orderId,
          serviceTitle,
        });
        toast({
          title: 'Simulated payment',
          description: 'Order marked paid immediately (audit / simulated test mode).',
        });
        setIsLoading(false);
        setHasActivePurchase(true);
        router.push('/individual/tax-services');
        return;
      }

      const response = await fetch(`/api/checkout_sessions?locale=${locale}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          orderId: orderId,
          serviceId: service.id,
          serviceName: serviceTitle,
          price: priceAmount,
          userId: user.uid,
          pricingSummary: service.hasVariants
            ? formatTaxServiceSelectionsForAudit({
                children,
                properties,
                bankAssets,
                dependents,
              })
            : 'no-variants',
          // After tax service payment, redirect back to the tax return module
          successRedirectPath: '/individual/tax-services',
        }),
      });

      if (!response.ok) {
        const errorBody = await response.json();
        throw new Error(errorBody.error || t('checkout.errors.checkoutSession'));
      }

      const payload = await response.json();
      if (payload.testMode) {
        await finalizeTestModeCheckoutOrder({
          userId: user.uid,
          orderId,
          serviceTitle,
        });
        toast({
          title: 'Simulated payment',
          description: 'Order marked paid immediately (audit / simulated test mode).',
        });
        setIsLoading(false);
        router.push('/individual/tax-services');
        return;
      }

      const { sessionId } = payload;
      const stripe = await stripePromise;

      if (!stripe) {
        throw new Error(t('checkout.errors.stripeNotLoaded'));
      }

      const { error } = await stripe.redirectToCheckout({ sessionId });

      if (error) {
        throw new Error(error.message);
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : t('toast.requestFailed.description');
      toast({
        variant: 'destructive',
        title: t('toast.requestFailed.title'),
        description: message,
      });
      setIsLoading(false);
    }
  };

  if (hasActivePurchase) {
    return (
      <div className="mx-auto max-w-4xl">
        <Button variant="ghost" onClick={() => router.push('/individual/tax-services')} className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          {t('checkout.backButton')}
        </Button>
        <Card>
          <CardHeader>
            <CardTitle>{t('checkout.postPurchaseTitle')}</CardTitle>
            <CardDescription>{t('checkout.postPurchaseDescription')}</CardDescription>
          </CardHeader>
          <CardFooter>
            <Button asChild className="w-full sm:w-auto">
              <Link href="/individual/tax-services">{t('checkout.goToHub')}</Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl">
      <Button variant="ghost" onClick={() => router.back()} className="mb-4">
        <ArrowLeft className="mr-2 h-4 w-4" />
        {t('checkout.backButton')}
      </Button>
      <Card>
        <CardHeader className="flex flex-col items-start gap-6 md:flex-row">
          <div className="rounded-lg bg-primary/10 p-4">
            <service.icon className="h-12 w-12 text-primary" />
          </div>
          <div className="flex-1">
            <CardTitle className="text-3xl">{serviceTitle}</CardTitle>
            <CardDescription className="mt-2 text-lg">
              {service.hasVariants
                ? t('checkout.calculatedTotal', { price: (priceAmount / 100).toFixed(2) })
                : t('checkout.fixedPrice', { price: (priceAmount / 100).toFixed(2) })}
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <p className="mb-6 text-muted-foreground">{serviceDescription}</p>

          {service.hasVariants ? (
            <div className="mb-6 space-y-4">
              <div>
                <Label htmlFor="children">{t('checkout.fields.children.label')}</Label>
                <Select value={children} onValueChange={(value: string) => setChildren(value as ChildrenOption)}>
                  <SelectTrigger id="children">
                    <SelectValue placeholder={t('checkout.fields.children.placeholder')} />
                  </SelectTrigger>
                  <SelectContent>
                    {CHILDREN_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="properties">{t('checkout.fields.properties.label')}</Label>
                <Select value={properties} onValueChange={(value: string) => setProperties(value as PropertiesOption)}>
                  <SelectTrigger id="properties">
                    <SelectValue placeholder={t('checkout.fields.properties.placeholder')} />
                  </SelectTrigger>
                  <SelectContent>
                    {PROPERTIES_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="bank-assets">{t('checkout.fields.bankAssets.label')}</Label>
                <Select value={bankAssets} onValueChange={(value: string) => setBankAssets(value as BankAssetsOption)}>
                  <SelectTrigger id="bank-assets">
                    <SelectValue placeholder={t('checkout.fields.bankAssets.placeholder')} />
                  </SelectTrigger>
                  <SelectContent>
                    {BANK_ASSETS_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="dependents">{t('checkout.fields.dependents.label')}</Label>
                <Select value={dependents} onValueChange={(value: string) => setDependents(value as DependentsOption)}>
                  <SelectTrigger id="dependents">
                    <SelectValue placeholder={t('checkout.fields.dependents.placeholder')} />
                  </SelectTrigger>
                  <SelectContent>
                    {DEPENDENTS_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1 rounded-md border p-4 text-sm">
                <p className="font-semibold">{t('checkout.pricingBreakdown.title')}</p>
                <p>{t('checkout.pricingBreakdown.base', { price: (pricingBreakdown.basePriceCents / 100).toFixed(2) })}</p>
                <p>{t('checkout.pricingBreakdown.children', { price: (pricingBreakdown.childrenSurchargeCents / 100).toFixed(2) })}</p>
                <p>{t('checkout.pricingBreakdown.properties', { price: (pricingBreakdown.propertiesSurchargeCents / 100).toFixed(2) })}</p>
                <p>{t('checkout.pricingBreakdown.bankAssets', { price: (pricingBreakdown.bankAssetsSurchargeCents / 100).toFixed(2) })}</p>
                <p>{t('checkout.pricingBreakdown.dependents', { price: (pricingBreakdown.dependentsSurchargeCents / 100).toFixed(2) })}</p>
                <p className="pt-1 font-semibold">
                  {t('checkout.pricingBreakdown.total', { price: (pricingBreakdown.totalPriceCents / 100).toFixed(2) })}
                </p>
              </div>
            </div>
          ) : null}

          <div className="space-y-4">
            <Label htmlFor="notes">{t('checkout.additionalInfoLabel')}</Label>
            <Textarea
              id="notes"
              placeholder={t('checkout.additionalInfoPlaceholder')}
              className="min-h-[150px]"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </CardContent>
        <CardFooter>
          <Button onClick={handleCheckout} disabled={isLoading} size="lg" className="w-full md:w-auto">
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t('checkout.processingButton')}
              </>
            ) : (
              <>
                {service.requiresContact ? <Send className="mr-2 h-4 w-4" /> : null}
                {serviceActionText}
              </>
            )}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
