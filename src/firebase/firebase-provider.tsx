'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth, firestore } from './config';
import { doc, onSnapshot } from 'firebase/firestore';
import { useLocale, useTranslations } from 'next-intl';
import { Loader2 } from 'lucide-react';
import { BrandWordmark } from '@/components/brand/brand-wordmark';
import { usePathname } from '@/navigation';
import type { UserRole } from '@/lib/types';
import type { AppLocale } from '@/lib/user-locale';

export type UserStatus = 'active' | 'pending_approval' | 'suspended' | null;

export type UserProfileSnapshot = {
  firstName?: string;
  lastName?: string;
  phone?: string;
  /** Street / line 1 (maps to `profile.address` in Firestore) */
  address?: string;
  addressLine1?: string;
  city?: string;
  postalCode?: string;
  dateOfBirth?: string;
  canton?: string | null;
  language?: AppLocale;
  accountingFirmId?: string;
} | null;

type FirebaseContextType = {
  user: User | null;
  loading: boolean;
  userRole: UserRole | null;
  userStatus: UserStatus;
  userProfile: UserProfileSnapshot;
};

const FirebaseContext = createContext<FirebaseContextType>({
  user: null,
  loading: true,
  userRole: null,
  userStatus: null,
  userProfile: null,
});

export const useFirebase = () => useContext(FirebaseContext);

export function FirebaseProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [userStatus, setUserStatus] = useState<UserStatus>(null);
  const [userProfile, setUserProfile] = useState<UserProfileSnapshot>(null);
  const [loading, setLoading] = useState(true);
  const locale = useLocale();
  const t = useTranslations('AppLoading');
  const pathname = usePathname();

  const isLandingPage = pathname === '/';

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  useEffect(() => {
    let unsubscribeUserDoc: (() => void) | undefined;

    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      
      if (unsubscribeUserDoc) {
        unsubscribeUserDoc();
        unsubscribeUserDoc = undefined;
      }

      if (currentUser) {
        const userDocRef = doc(firestore, 'users', currentUser.uid);
        unsubscribeUserDoc = onSnapshot(userDocRef, (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data();
            setUserRole(data.role as UserRole);
            setUserStatus((data.status as UserStatus) ?? 'active');
            const p = data.profile as Record<string, unknown> | undefined;
            if (p && typeof p === 'object') {
              setUserProfile({
                firstName: typeof p.firstName === 'string' ? p.firstName : undefined,
                lastName: typeof p.lastName === 'string' ? p.lastName : undefined,
                phone: typeof p.phone === 'string' ? p.phone : undefined,
                address: typeof p.address === 'string' ? p.address : undefined,
                addressLine1:
                  typeof p.addressLine1 === 'string'
                    ? p.addressLine1
                    : typeof p.address === 'string'
                      ? p.address
                      : undefined,
                city: typeof p.city === 'string' ? p.city : undefined,
                postalCode: typeof p.postalCode === 'string' ? p.postalCode : undefined,
                dateOfBirth: typeof p.dateOfBirth === 'string' ? p.dateOfBirth : undefined,
                canton: typeof p.canton === 'string' ? p.canton : p.canton === null ? null : undefined,
                language:
                  typeof p.language === 'string' && ['en', 'de', 'fr', 'es', 'it'].includes(p.language)
                    ? (p.language as AppLocale)
                    : undefined,
              });
            } else {
              setUserProfile(null);
            }
          } else {
            setUserRole(null);
            setUserStatus(null);
            setUserProfile(null);
          }
          setLoading(false);
        }, (error) => {
            console.error("Error fetching user document:", error);
            setUserRole(null);
            setUserStatus(null);
            setUserProfile(null);
            setLoading(false);
        });
      } else {
        setUserRole(null);
        setUserStatus(null);
        setUserProfile(null);
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeUserDoc) {
        unsubscribeUserDoc();
      }
    };
  }, []);

  if (loading && !isLandingPage) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--swiss-mineral-cream)] dark:bg-background">
        <div className="flex flex-col items-center gap-5">
          <BrandWordmark layout="stacked" />
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>{t('initializing')}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <FirebaseContext.Provider value={{ user, loading, userRole, userStatus, userProfile }}>
      {children}
    </FirebaseContext.Provider>
  );
}
