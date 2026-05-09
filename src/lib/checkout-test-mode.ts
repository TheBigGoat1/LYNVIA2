import { addDoc, collection, doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { firestore } from '@/firebase/config';

/**
 * When payments bypass is active (see `src/lib/test-mode.ts`), /api/checkout_sessions skips Stripe.
 * Call this from the client to mark the order paid (webhook will not run).
 */
export async function finalizeTestModeCheckoutOrder(params: {
  userId: string;
  orderId: string;
  serviceTitle?: string;
}) {
  const { userId, orderId, serviceTitle } = params;
  await updateDoc(doc(firestore, 'users', userId, 'orders', orderId), {
    status: 'paid',
    paidAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    testModeCheckout: true,
  });
  await addDoc(collection(firestore, 'users', userId, 'notifications'), {
    title: 'Simulated payment (audit mode)',
    description: serviceTitle
      ? `Order for “${serviceTitle}” was marked paid without Stripe (simulated / test mode).`
      : 'Order was marked paid without Stripe (simulated / test mode).',
    type: 'system',
    read: false,
    link: '/individual/my-orders',
    createdAt: serverTimestamp(),
  });
}

/** Creates a pending order row then immediately marks it paid (audit trail for document fees, etc.). */
export async function createSimulatedPaidOrder(params: {
  userId: string;
  userEmail?: string | null;
  userName?: string | null;
  serviceTitle: string;
  serviceId?: string;
  priceAmount?: number;
  orderType?: string;
  intakeData?: Record<string, unknown>;
}): Promise<string> {
  const {
    userId,
    userEmail,
    userName,
    serviceTitle,
    serviceId = 'simulated_checkout',
    priceAmount = 0,
    orderType,
    intakeData,
  } = params;

  const orderRef = await addDoc(collection(firestore, 'users', userId, 'orders'), {
    userId,
    userEmail: userEmail ?? null,
    userName: userName ?? null,
    serviceId,
    serviceTitle,
    serviceType: 'fixed',
    priceAmount,
    status: 'pending_payment',
    paymentMethod: 'card',
    ...(orderType ? { orderType } : {}),
    ...(intakeData ? { intakeData } : {}),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  await finalizeTestModeCheckoutOrder({
    userId,
    orderId: orderRef.id,
    serviceTitle,
  });

  return orderRef.id;
}
