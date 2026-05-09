import { firestore } from '@/firebase/config';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';

export type UserNotificationType = 'document' | 'scenario' | 'system';

export interface UserNotificationPayload {
  title: string;
  description: string;
  type: UserNotificationType;
  read?: boolean;
  link?: string;
}

export async function createUserNotification(userId: string, payload: UserNotificationPayload) {
  await addDoc(collection(firestore, 'users', userId, 'notifications'), {
    ...payload,
    read: payload.read ?? false,
    createdAt: serverTimestamp(),
  });
}