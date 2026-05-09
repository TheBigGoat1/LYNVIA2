'use client';

import { useEffect, type ReactNode } from 'react';
import { signOut } from 'firebase/auth';
import { auth } from '@/firebase/config';
import { useFirebase } from '@/firebase/firebase-provider';
import { useRouter } from '@/navigation';
import type { UserRole } from '@/lib/types';

function homeForRole(role: UserRole): string {
  switch (role) {
    case 'admin':
      return '/admin/dashboard';
    case 'business':
      return '/business/dashboard';
    case 'accounting_firm':
      return '/accounting-firm/dashboard';
    case 'individual':
      return '/individual/dashboard';
    default:
      return '/';
  }
}

/**
 * Restricts `/individual/*` to signed-in users with role `individual` and allowed status.
 */
export function IndividualAccessGuard({ children }: { children: ReactNode }) {
  const { user, loading, userRole, userStatus } = useFirebase();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    if (!user) {
      router.replace('/login');
      return;
    }

    if (!userRole) {
      router.replace('/login');
      return;
    }

    if (userStatus === 'pending_approval') {
      router.replace('/pending-approval');
      return;
    }

    if (userStatus === 'suspended') {
      void signOut(auth).finally(() => {
        router.replace('/login');
      });
      return;
    }

    if (userRole !== 'individual') {
      router.replace(homeForRole(userRole));
    }
  }, [loading, user, userRole, userStatus, router]);

  if (loading) {
    return <>{children}</>;
  }

  if (!user || !userRole) {
    return null;
  }

  if (userStatus === 'pending_approval' || userStatus === 'suspended') {
    return null;
  }

  if (userRole !== 'individual') {
    return null;
  }

  return <>{children}</>;
}
