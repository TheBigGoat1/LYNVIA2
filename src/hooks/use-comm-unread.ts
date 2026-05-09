'use client';

import { useEffect, useState } from 'react';
import { useFirebase } from '@/firebase/firebase-provider';
import { firestore } from '@/firebase/config';
import {
  collection,
  collectionGroup,
  doc,
  getDoc,
  onSnapshot,
  query,
  where,
} from 'firebase/firestore';

/**
 * For business users: counts threads in their company where unreadClient === true
 * For admin users: counts threads across ALL companies where unreadAdmin === true
 */
export function useCommUnread() {
  const { user, userRole } = useFirebase();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user || !userRole) return;

    if (userRole === 'business' || userRole === 'accounting_firm') {
      // First get the companyId for this user
      let companyUnsubscribe: (() => void) | undefined;

      getDoc(doc(firestore, 'users', user.uid)).then((snap) => {
        const companyId = snap.data()?.companyId as string | undefined;
        if (!companyId) return;

        const q = query(
          collection(firestore, 'companies', companyId, 'comm_threads'),
          where('unreadClient', '==', true),
        );
        companyUnsubscribe = onSnapshot(q, (snapshot) => {
          setUnreadCount(snapshot.size);
        });
      });

      return () => {
        if (companyUnsubscribe) companyUnsubscribe();
      };
    }

    if (userRole === 'admin') {
      // Watch comm_threads across all companies using collectionGroup
      const q = query(
        collectionGroup(firestore, 'comm_threads'),
        where('unreadAdmin', '==', true),
      );
      const unsub = onSnapshot(q, (snapshot) => {
        setUnreadCount(snapshot.size);
      });
      return unsub;
    }
  }, [user, userRole]);

  return { unreadCount };
}
