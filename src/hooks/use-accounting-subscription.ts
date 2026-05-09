'use client';

import { useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { firestore } from '@/firebase/config';
import { useFirebase } from '@/firebase/firebase-provider';
import {
  DEFAULT_ACCOUNTING_PLAN,
  type AccountingSubscriptionPlan,
} from '@/lib/accounting-subscriptions';

type SubscriptionState = {
  plan: AccountingSubscriptionPlan;
  status: 'trialing' | 'active' | 'inactive';
  trialEndsAt: Date | null;
  companyId: string | null;
  loading: boolean;
  error: string | null;
};

const toDateSafe = (value: any): Date | null => {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value?.toDate === 'function') return value.toDate();
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

export function useAccountingSubscription(): SubscriptionState {
  const { user, userRole, loading } = useFirebase();
  const [state, setState] = useState<SubscriptionState>({
    plan: DEFAULT_ACCOUNTING_PLAN,
    status: 'inactive',
    trialEndsAt: null,
    companyId: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    if (loading) return;
    if (!user || userRole !== 'accounting_firm') {
      setState({
        plan: DEFAULT_ACCOUNTING_PLAN,
        status: 'inactive',
        trialEndsAt: null,
        companyId: null,
        loading: false,
        error: null,
      });
      return;
    }

    let unsubscribeCompany: (() => void) | undefined;

    const unsubscribeUser = onSnapshot(doc(firestore, 'users', user.uid), (userSnap) => {
      if (!userSnap.exists()) {
        setState({
          plan: DEFAULT_ACCOUNTING_PLAN,
          status: 'inactive',
          trialEndsAt: null,
          companyId: null,
          loading: false,
          error: null,
        });
        return;
      }

      const companyId = (userSnap.data().companyId as string | undefined) ?? null;
      if (!companyId) {
        setState((prev) => ({ ...prev, companyId: null, loading: false, error: null }));
        return;
      }

      if (unsubscribeCompany) unsubscribeCompany();

      unsubscribeCompany = onSnapshot(doc(firestore, 'companies', companyId), (companySnap) => {
        const companyData = companySnap.data() ?? {};
        const subscription = (companyData.subscription ?? {}) as Record<string, any>;

        const plan = (subscription.plan as AccountingSubscriptionPlan | undefined) ?? DEFAULT_ACCOUNTING_PLAN;
        const status = (subscription.status as 'trialing' | 'active' | 'inactive' | undefined) ?? 'inactive';

        setState({
          plan,
          status,
          trialEndsAt: toDateSafe(subscription.trialEndsAt),
          companyId,
          loading: false,
          error: null,
        });
      }, (err) => {
        console.error('Error reading company subscription:', err);
        setState((prev) => ({ ...prev, companyId, loading: false, error: 'Could not load company subscription.' }));
      });
    }, (err) => {
      console.error('Error reading user doc for subscription:', err);
      setState((prev) => ({ ...prev, loading: false, error: 'Could not load user profile.' }));
    });

    return () => {
      unsubscribeUser();
      if (unsubscribeCompany) unsubscribeCompany();
    };
  }, [user, userRole, loading]);

  return state;
}
