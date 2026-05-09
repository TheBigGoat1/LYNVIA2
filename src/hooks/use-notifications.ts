
'use client';

import { useState, useEffect } from 'react';
import { useFirebase } from '@/firebase/firebase-provider';
import { firestore } from '@/firebase/config';
import { collection, query, onSnapshot, orderBy, limit, doc, updateDoc, writeBatch, deleteDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { useTranslations } from 'next-intl';

export type Notification = {
    id: string;
    title: string;
    description: string;
    type: 'document' | 'scenario' | 'system' | 'cfo_analysis_ready';
    read: boolean;
    link?: string;
    createdAt: { seconds: number, nanoseconds: number } | null;
};

export function useNotifications(enabled = true, maxItems = 200) {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const { user } = useFirebase();
    const { toast } = useToast();
    const t = useTranslations('Notifications');

    useEffect(() => {
        if (!enabled || !user) {
            setNotifications([]);
            setUnreadCount(0);
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        const q = query(
            collection(firestore, 'users', user.uid, 'notifications'),
            orderBy('createdAt', 'desc'),
            limit(maxItems)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const userNotifications = snapshot.docs.map(doc => ({
                id: doc.id,
                ...(doc.data() as Omit<Notification, 'id'>)
            }));
            setNotifications(userNotifications);
            setUnreadCount(userNotifications.filter(n => !n.read).length);
            setIsLoading(false);
        }, (error) => {
            console.error("Error fetching notifications: ", error);
            toast({
                title: t('fetchErrorTitle'),
                description: t('fetchErrorDescription'),
                variant: "destructive"
            });
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, [enabled, maxItems, user, toast]);

    const markAsRead = async (id: string) => {
        if (!user) return;
        await updateDoc(doc(firestore, 'users', user.uid, 'notifications', id), { read: true });
    };

    const markAllAsRead = async () => {
        if (!user) return;
        const unread = notifications.filter((notification) => !notification.read);
        if (unread.length === 0) return;

        const batch = writeBatch(firestore);
        unread.forEach((notification) => {
            batch.update(doc(firestore, 'users', user.uid, 'notifications', notification.id), { read: true });
        });
        await batch.commit();
    };

    const archive = async (id: string) => {
        if (!user) return;
        await deleteDoc(doc(firestore, 'users', user.uid, 'notifications', id));
    };

    return { notifications, unreadCount, isLoading, markAsRead, markAllAsRead, archive };
}
