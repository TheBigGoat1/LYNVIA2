'use client';

import { useFirebase } from '@/firebase/firebase-provider';
import { useRouter } from '@/navigation';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { firestore } from '@/firebase/config';
import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { BrandWordmark } from '@/components/brand/brand-wordmark';
import { useTranslations } from 'next-intl';

export function ProfileCompletionGate({ children }: { children: React.ReactNode }) {
  const { user, userRole, userStatus, loading: authLoading } = useFirebase();
  const [isProfileComplete, setIsProfileComplete] = useState<boolean | null>(null);
  const [isChecking, setIsChecking] = useState(true);
  const router = useRouter();
  const t = useTranslations('ProfileCompletionGate');

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    const checkProfile = async () => {
      if (!user || !userRole || (userRole !== 'business' && userRole !== 'accounting_firm')) {
        setIsProfileComplete(true);
        setIsChecking(false);
        return;
      }

      const userDocRef = doc(firestore, 'users', user.uid);
      const userDocSnap = await getDoc(userDocRef);

      if (!userDocSnap.exists() || !userDocSnap.data().companyId) {
        setIsProfileComplete(true);
        setIsChecking(false);
        return;
      }

      const companyId = userDocSnap.data().companyId;
      const companyDocRef = doc(firestore, 'companies', companyId);

      unsubscribe = onSnapshot(companyDocRef, (docSnap) => {
        if (docSnap.exists()) {
          setIsProfileComplete(docSnap.data().profileCompleted === true);
        } else {
          setIsProfileComplete(true);
        }
        setIsChecking(false);
      });
    };

    if (!authLoading) {
      checkProfile();
    }

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [user, userRole, authLoading]);

  if (authLoading || isChecking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--swiss-mineral-cream)] dark:bg-background">
        <div className="flex flex-col items-center gap-5">
          <BrandWordmark layout="stacked" />
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>{t('verifying')}</span>
          </div>
        </div>
      </div>
    );
  }

  if (userStatus === 'active' && isProfileComplete === false) {
    router.push('/complete-profile');
    return (
        <div className="flex min-h-screen items-center justify-center bg-[var(--swiss-mineral-cream)] dark:bg-background">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>{t('redirecting')}</span>
          </div>
        </div>
    );
  }

  return <>{children}</>;
}
