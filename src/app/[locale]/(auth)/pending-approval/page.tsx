'use client';

import { useEffect } from 'react';
import { useFirebase } from '@/firebase/firebase-provider';
import { auth } from '@/firebase/config';
import { signOut } from 'firebase/auth';
import { useRouter } from '@/navigation';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Clock, Loader2, LogOut, Mail } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { BrandWordmark } from '@/components/brand/brand-wordmark';

export default function PendingApprovalPage() {
  const { user, userRole, userStatus, loading } = useFirebase();
  const t = useTranslations('PendingApproval');
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace('/login');
      return;
    }
    if (userStatus !== 'pending_approval') {
      if (userRole === 'business') router.replace('/business/dashboard');
      else if (userRole === 'accounting_firm') router.replace('/accounting-firm/dashboard');
      else if (userRole === 'admin') router.replace('/admin/dashboard');
      else router.replace('/individual/dashboard');
    }
  }, [loading, user, userRole, userStatus, router]);

  const handleSignOut = async () => {
    await signOut(auth);
    router.push('/login');
    toast({ title: t('logoutButton') });
  };

  if (loading || !user || userStatus !== 'pending_approval') {
    return (
      <div className="flex min-h-[50vh] w-full flex-col items-center justify-center gap-3 text-muted-foreground">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="text-sm">Loading…</span>
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col items-stretch justify-center py-4 sm:py-6">
      <div className="mx-auto flex w-full max-w-lg flex-col items-stretch gap-6 sm:max-w-xl sm:gap-8">
        <div className="flex justify-center px-2">
          <BrandWordmark layout="stacked" className="max-w-full" />
        </div>

        <Card className="border-border bg-card/95 shadow-md backdrop-blur-sm">
          <CardHeader className="space-y-4 px-4 pb-2 pt-6 text-center sm:px-6 sm:pt-8">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/20 sm:h-16 sm:w-16">
              <Clock className="h-7 w-7 text-amber-600 dark:text-amber-400 sm:h-8 sm:w-8" />
            </div>
            <h1 className="text-balance text-lg font-semibold sm:text-xl">{t('title')}</h1>
            <p className="text-balance text-sm font-medium text-muted-foreground">{t('subtitle')}</p>
          </CardHeader>
          <CardContent className="space-y-6 px-4 pb-6 text-center sm:px-6 sm:pb-8">
            <p className="text-balance text-sm leading-relaxed text-muted-foreground">{t('description')}</p>
            <div className="rounded-lg bg-muted p-4 text-left text-sm sm:p-5">
              <p className="font-medium flex items-center gap-2">
                <Mail className="h-4 w-4 shrink-0 text-muted-foreground" />
                {t('contactLabel')}
              </p>
              <p className="mt-2 text-muted-foreground sm:pl-6">
                {t('contactDescription')}{' '}
                <a href="mailto:support@lynviadigital.com" className="break-all text-primary underline">
                  support@lynviadigital.com
                </a>
              </p>
            </div>
            <Button variant="outline" className="min-h-11 w-full" onClick={handleSignOut}>
              <LogOut className="mr-2 h-4 w-4" />
              {t('logoutButton')}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
