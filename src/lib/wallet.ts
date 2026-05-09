import {
  addDoc,
  collection,
  doc,
  runTransaction,
  serverTimestamp,
} from 'firebase/firestore';
import { firestore } from '@/firebase/config';

type WalletTxType = 'deposit' | 'debit';

const walletDocRef = (userId: string) => doc(firestore, 'users', userId, 'wallet', 'main');
const walletTxRef = (userId: string) => collection(firestore, 'users', userId, 'walletTransactions');

const updateWalletBalance = async (
  userId: string,
  amountCents: number,
  txType: WalletTxType,
  metadata?: Record<string, unknown>,
) => {
  if (!Number.isFinite(amountCents) || amountCents <= 0) {
    throw new Error('Amount must be greater than zero.');
  }

  const ref = walletDocRef(userId);

  const newBalanceCents = await runTransaction(firestore, async (tx) => {
    const snap = await tx.get(ref);
    const currentBalance = (snap.data()?.balanceCents as number | undefined) ?? 0;

    if (txType === 'debit' && currentBalance < amountCents) {
      throw new Error('Insufficient wallet balance.');
    }

    const nextBalance = txType === 'deposit' ? currentBalance + amountCents : currentBalance - amountCents;

    tx.set(
      ref,
      {
        balanceCents: nextBalance,
        currency: 'CHF',
        updatedAt: serverTimestamp(),
        ...(snap.exists() ? {} : { createdAt: serverTimestamp() }),
      },
      { merge: true },
    );

    return nextBalance;
  });

  await addDoc(walletTxRef(userId), {
    type: txType,
    amountCents,
    balanceAfterCents: newBalanceCents,
    currency: 'CHF',
    metadata: metadata ?? null,
    createdAt: serverTimestamp(),
  });

  return newBalanceCents;
};

export const depositToWallet = (
  userId: string,
  amountCents: number,
  metadata?: Record<string, unknown>,
) => updateWalletBalance(userId, amountCents, 'deposit', metadata);

export const payWithWallet = (
  userId: string,
  amountCents: number,
  metadata?: Record<string, unknown>,
) => updateWalletBalance(userId, amountCents, 'debit', metadata);
