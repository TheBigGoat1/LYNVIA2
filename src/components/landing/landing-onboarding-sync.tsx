'use client';

import { useEffect, useRef } from 'react';
import { useSearchParams, usePathname, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useToast } from '@/hooks/use-toast';

/**
 * After company profile completion, user is sent to `/?onboarding=complete`.
 * Shows a confirmation toast once and cleans the URL.
 */
export function LandingOnboardingSync() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const { toast } = useToast();
  const t = useTranslations('HomeLanding');
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    if (searchParams.get('onboarding') !== 'complete') return;
    ran.current = true;
    toast({
      title: t('onboardingCompleteTitle'),
      description: t('onboardingCompleteDescription'),
    });
    router.replace(pathname);
  }, [searchParams, pathname, router, toast, t]);

  return null;
}
