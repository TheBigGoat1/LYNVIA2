'use client';

import { useState, useEffect } from 'react';
import { useFirebase } from '@/firebase/firebase-provider';
import { firestore } from '@/firebase/config';
import { collection, query, where, onSnapshot } from 'firebase/firestore';

export function useDocumentInbox() {
    const [pendingCount, setPendingCount] = useState(0);
    const { user } = useFirebase();

    useEffect(() => {
        if (!user) {
            setPendingCount(0);
            return;
        }

        const q = query(
            collection(firestore, 'document_exchanges'),
            where('recipientId', '==', user.uid),
            where('status', '==', 'pending')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            setPendingCount(snapshot.size);
        }, (error) => {
            console.error('Error fetching document inbox count:', error);
        });

        return () => unsubscribe();
    }, [user]);

    return { pendingCount };
}
