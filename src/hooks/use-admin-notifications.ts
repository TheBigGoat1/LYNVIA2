'use client';

import { useState, useEffect } from 'react';
import { firestore } from '@/firebase/config';
import {
  collection,
  query,
  onSnapshot,
  orderBy,
  limit,
  doc,
  updateDoc,
  writeBatch,
  where,
  deleteDoc,
} from 'firebase/firestore';
import type { AdminNotificationType } from '@/lib/admin-notifications';

export interface AdminNotification {
  id: string;
  title: string;
  description: string;
  type: AdminNotificationType;
  read: boolean;
  link?: string;
  clientId?: string;
  clientName?: string;
  companyId?: string;
  companyName?: string;
  createdAt: { seconds: number; nanoseconds: number } | null;
}

export function useAdminNotifications(maxItems = 200, enabled = true) {
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!enabled) {
      setNotifications([]);
      setUnreadCount(0);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const q = query(
      collection(firestore, 'admin_notifications'),
      orderBy('createdAt', 'desc'),
      limit(maxItems),
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const items = snapshot.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<AdminNotification, 'id'>),
        }));
        setNotifications(items);
        setUnreadCount(items.filter((n) => !n.read).length);
        setIsLoading(false);
      },
      (error) => {
        console.error('[useAdminNotifications] snapshot error:', error);
        setIsLoading(false);
      },
    );

    return () => unsubscribe();
  }, [enabled, maxItems]);

  const markAsRead = async (id: string) => {
    await updateDoc(doc(firestore, 'admin_notifications', id), { read: true });
  };

  const markAllAsRead = async () => {
    const unread = notifications.filter((n) => !n.read);
    if (unread.length === 0) return;
    const batch = writeBatch(firestore);
    unread.forEach((n) => {
      batch.update(doc(firestore, 'admin_notifications', n.id), { read: true });
    });
    await batch.commit();
  };

  const archive = async (id: string) => {
    await deleteDoc(doc(firestore, 'admin_notifications', id));
  };

  return { notifications, unreadCount, isLoading, markAsRead, markAllAsRead, archive };
}
