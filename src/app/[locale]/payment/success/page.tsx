"use client"

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Loader2 } from 'lucide-react';

export default function PaymentSuccessPage() {
  const t = useTranslations('ScenarioCalculator'); // Reuse payment keys
  const searchParams = useSearchParams();
  const router = useRouter();
  const [countdown, setCountdown] = useState(5);
  const sessionId = searchParams.get('session_id');
  const redirectTo = searchParams.get('redirect_to') || '/individual/dashboard';

  useEffect(() => {
    if (countdown <= 0) {
      router.push(redirectTo);
      return;
    }

    const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown, router, redirectTo]);

  return (
    <div className="container max-w-lg mx-auto py-20">
      <Card className="text-center">
        <CardHeader>
          <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-green-100 flex items-center justify-center">
            <CheckCircle2 className="h-8 w-8 text-green-600" />
          </div>
          <CardTitle className="text-2xl">{t('access.paymentSuccess.title')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">{t('access.paymentSuccess.description')}</p>

          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Redirecting in {countdown} seconds...</span>
          </div>

          <Button
            onClick={() => router.push(redirectTo)}
            className="w-full"
          >
            Continue
          </Button>

          {sessionId && (
            <p className="text-xs text-muted-foreground">Session: {sessionId}</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
