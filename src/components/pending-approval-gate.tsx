'use client';

import { useFirebase } from '@/firebase/firebase-provider';
import { auth } from '@/firebase/config';
import { signOut } from 'firebase/auth';
import { useRouter } from '@/navigation';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Clock, LogOut, Mail } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { BrandWordmark } from '@/components/brand/brand-wordmark';

interface PendingApprovalGateProps {
  children: React.ReactNode;
}

export function PendingApprovalGate({ children }: PendingApprovalGateProps) {
  const { userStatus, loading } = useFirebase();
  const t = useTranslations('PendingApproval');
  const router = useRouter();
  const { toast } = useToast();

  if (loading) return null;

  if (userStatus === 'pending_approval') {
    const handleSignOut = async () => {
      await signOut(auth);
      router.push('/login');
      toast({ title: t('logoutButton') });
    };

    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--swiss-mineral-cream)] p-4 dark:bg-background">
        <Card className="w-full max-w-md border-border shadow-md">
          <CardHeader className="space-y-4 pb-2 text-center">
            <BrandWordmark layout="stacked" className="pt-1" />
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/25">
              <Clock className="h-8 w-8 text-amber-700 dark:text-amber-400" />
            </div>
            <h1 className="text-xl font-semibold text-foreground">{t('title')}</h1>
          </CardHeader>
          <CardContent className="space-y-6 text-center">
            <p className="text-sm text-muted-foreground leading-relaxed">
              {t('subtitle')}
            </p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {t('description')}
            </p>
            <div className="rounded-lg bg-muted p-4 text-sm text-left space-y-2">
              <p className="font-medium flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                {t('contactLabel')}
              </p>
              <p className="text-muted-foreground pl-6">
                {t('contactDescription')}{' '}
                <a
                  href="mailto:support@lynviadigital.com"
                  className="text-primary underline"
                >
                  support@lynviadigital.com
                </a>
              </p>
            </div>
            <Button
              variant="outline"
              className="w-full"
              onClick={handleSignOut}
            >
              <LogOut className="mr-2 h-4 w-4" />
              {t('logoutButton')}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}
