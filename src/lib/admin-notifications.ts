/**
 * Centralised admin notification writer.
 *
 * All notifications destined for the Lynvia admin panel are written to a
 * single top-level `admin_notifications` collection so every admin can read
 * them without per-user fanout.
 *
 * Client-side callers use `notifyAdmin()`.
 * Server-side (API routes using firebase-admin) use `notifyAdminServer()`.
 */

import { firestore } from '@/firebase/config';
import {
  collection,
  addDoc,
  serverTimestamp,
} from 'firebase/firestore';

export type AdminNotificationType =
  | 'document_uploaded'
  | 'employee_created'
  | 'employee_updated'
  | 'document_request_fulfilled'
  | 'client_message'
  | 'document_review'
  | 'scenario_review'
  | 'tax_return_ready'
  | 'system';

export interface AdminNotificationPayload {
  /** Short headline shown in the list */
  title: string;
  /** Longer description / context */
  description: string;
  /** Notification category – drives the icon & filter */
  type: AdminNotificationType;
  /** Deep-link the admin can click to act on the notification */
  link?: string;
  /** Firestore uid of the client who triggered the event */
  clientId?: string;
  /** Human-readable client name */
  clientName?: string;
  /** Optional company id */
  companyId?: string;
  /** Optional company name */
  companyName?: string;
}

/**
 * Write a notification to `admin_notifications` (client-side Firestore SDK).
 * Every admin's notification center listens to this collection.
 */
export async function notifyAdmin(payload: AdminNotificationPayload) {
  try {
    await addDoc(collection(firestore, 'admin_notifications'), {
      ...payload,
      read: false,
      createdAt: serverTimestamp(),
    });
  } catch (err) {
    console.error('[notifyAdmin] Failed to write admin notification:', err);
  }
}

/**
 * Write a notification using firebase-admin (server-side / API routes).
 * Import and call from Next.js API route handlers.
 */
export async function notifyAdminServer(
  adminFirestore: FirebaseFirestore.Firestore,
  payload: AdminNotificationPayload,
) {
  try {
    await adminFirestore.collection('admin_notifications').add({
      ...payload,
      read: false,
      createdAt: new Date(),
    });
  } catch (err) {
    console.error('[notifyAdminServer] Failed to write admin notification:', err);
  }
}
