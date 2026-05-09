'use client';

import { useEffect, useState } from 'react';
import { useFirebase } from '@/firebase/firebase-provider';
import { firestore } from '@/firebase/config';
import { collection, doc, getDoc, getDocs, onSnapshot, query, where } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2, Loader2, ShieldAlert } from 'lucide-react';
import { useTranslations } from 'next-intl';

export function FiduciaryClientAccessGate({ children }: { children: React.ReactNode }) {
  const { user, userRole, loading } = useFirebase();
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const t = useTranslations('FiduciaryClientAccessGate');

  useEffect(() => {
    let unsubscribeCompany: (() => void) | undefined;

    const verifyAccess = async () => {
      if (loading) return;

      if (!user || userRole !== 'business') {
        setAllowed(true);
        return;
      }

      const userDoc = await getDoc(doc(firestore, 'users', user.uid));
      if (!userDoc.exists()) {
        setAllowed(false);
        return;
      }

      const userCompanyId = String(userDoc.data().companyId ?? '');
      let resolvedCompanyId = userCompanyId;

      if (!resolvedCompanyId) {
        const companyQuery = query(
          collection(firestore, 'companies'),
          where('adminUserId', '==', user.uid),
          where('type', '==', 'business')
        );
        const companySnap = await getDocs(companyQuery);
        if (!companySnap.empty) {
          resolvedCompanyId = companySnap.docs[0].id;
        }
      }

      if (!resolvedCompanyId) {
        setAllowed(false);
        return;
      }

      unsubscribeCompany = onSnapshot(doc(firestore, 'companies', resolvedCompanyId), (companySnap) => {
        if (!companySnap.exists()) {
          setAllowed(false);
          return;
        }
        setAllowed(true);
      });
    };

    verifyAccess();

    return () => {
      if (unsubscribeCompany) unsubscribeCompany();
    };
  }, [loading, user, userRole]);

  if (loading || allowed === null) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>{t('verifying')}</span>
        </div>
      </div>
    );
  }

  if (!allowed) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4 bg-background">
        <Card className="w-full max-w-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-amber-500" />
              {t('accessRestricted')}
            </CardTitle>
            <CardDescription>
              {t('accessRestrictedDesc')}
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            <p className="flex items-start gap-2">
              <Building2 className="h-4 w-4 mt-0.5" />
              {t('notLinked')}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}
