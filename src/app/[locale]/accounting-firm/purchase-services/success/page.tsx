"use client";

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { CheckCircle2, Loader2, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useFirebase } from '@/firebase/firebase-provider';

type ReconcileState = 'loading' | 'paid' | 'completed' | 'pending' | 'error';

export default function AccountingCheckoutSuccessPage() {
  const t = useTranslations('AccountingCheckoutSuccess');
  const locale = useLocale();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const { user, loading } = useFirebase();

  const [state, setState] = useState<ReconcileState>('loading');
  const [message, setMessage] = useState<string>('');

  const sessionId = useMemo(() => searchParams.get('session_id'), [searchParams]);

  useEffect(() => {
    const reconcile = async () => {
      if (loading) {
        return;
      }

      if (!sessionId) {
        setState('error');
        setMessage(t('missingSession'));
        return;
      }

      if (!user) {
        setState('error');
        setMessage(t('mustLogin'));
        return;
      }

      try {
        const token = await user.getIdToken();
        const response = await fetch('/api/accounting-firm/reconcile-payment', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ sessionId }),
        });

        const payload = await response.json();
        if (!response.ok) {
          throw new Error(payload.error || t('reconcileFailed'));
        }

        if (payload.status === 'paid') {
          setState('paid');
          setMessage(t('paidDescription'));
        } else if (payload.status === 'completed') {
          setState('completed');
          setMessage(t('completedDescription'));
        } else {
          setState('pending');
          setMessage(t('pendingDescription'));
        }

        window.history.replaceState({}, '', `/${locale}/accounting-firm/purchase-services/success`);
      } catch (error) {
        const msg = error instanceof Error ? error.message : t('reconcileFailed');
        setState('error');
        setMessage(msg);
        toast({
          title: t('errorTitle'),
          description: msg,
          variant: 'destructive',
        });
      }
    };

    void reconcile();
  }, [loading, locale, sessionId, t, toast, user]);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-2xl">
            {state === 'loading' ? <Loader2 className="h-6 w-6 animate-spin" /> : <CheckCircle2 className="h-6 w-6 text-green-600" />}
            {t('title')}
          </CardTitle>
          <CardDescription>{t('subtitle')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {state === 'loading' ? (
            <p className="text-sm text-muted-foreground">{t('verifying')}</p>
          ) : state === 'error' ? (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>{t('errorTitle')}</AlertTitle>
              <AlertDescription>{message}</AlertDescription>
            </Alert>
          ) : (
            <Alert>
              <CheckCircle2 className="h-4 w-4" />
              <AlertTitle>{state === 'pending' ? t('pendingTitle') : t('successTitle')}</AlertTitle>
              <AlertDescription>{message}</AlertDescription>
            </Alert>
          )}

          <div className="flex flex-wrap gap-3">
            <Button onClick={() => (window.location.href = `/${locale}/accounting-firm/billing`)}>{t('okButton')}</Button>
            {state === 'error' || state === 'pending' ? (
              <Button variant="outline" onClick={() => window.location.reload()}>
                {t('retryButton')}
              </Button>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
