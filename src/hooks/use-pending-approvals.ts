
'use client';

import { useState, useEffect } from 'react';
import { useFirebase } from '@/firebase/firebase-provider';
import { firestore } from '@/firebase/config';
import { collectionGroup, query, where, onSnapshot } from 'firebase/firestore';

export function usePendingApprovals() {
    const [pendingApprovalsCount, setPendingApprovalsCount] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const { userRole } = useFirebase();

    useEffect(() => {
        if (userRole !== 'admin') {
            setPendingApprovalsCount(0);
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        const q = query(collectionGroup(firestore, 'documents'), where('status', '==', 'Pending Review'));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            setPendingApprovalsCount(snapshot.size);
            setIsLoading(false);
        }, (error) => {
            console.error("Error fetching pending approvals: ", error);
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, [userRole]);

    return { pendingApprovalsCount, isLoading };
}
