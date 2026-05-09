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

function RoleAccessGuardInner({
  children,
  requiredRole,
}: {
  children: ReactNode;
  requiredRole: UserRole;
}) {
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

    if (userRole !== requiredRole) {
      router.replace(homeForRole(userRole));
    }
  }, [loading, user, userRole, userStatus, router, requiredRole]);

  if (loading) {
    return <>{children}</>;
  }

  if (!user || !userRole) {
    return null;
  }

  if (userStatus === 'pending_approval' || userStatus === 'suspended') {
    return null;
  }

  if (userRole !== requiredRole) {
    return null;
  }

  return <>{children}</>;
}

/** `/business/*` — only employer company users (not individuals, not fiduciaries, not admins). */
export function BusinessAccessGuard({ children }: { children: ReactNode }) {
  return <RoleAccessGuardInner requiredRole="business">{children}</RoleAccessGuardInner>;
}

/** `/admin/*` — Lynvia operators only. */
export function AdminAccessGuard({ children }: { children: ReactNode }) {
  return <RoleAccessGuardInner requiredRole="admin">{children}</RoleAccessGuardInner>;
}

/** `/accounting-firm/*` — fiduciary users only. */
export function AccountingFirmAccessGuard({ children }: { children: ReactNode }) {
  return <RoleAccessGuardInner requiredRole="accounting_firm">{children}</RoleAccessGuardInner>;
}
