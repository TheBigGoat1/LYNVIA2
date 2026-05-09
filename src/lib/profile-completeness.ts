import type { UserProfileSnapshot } from '@/firebase/firebase-provider';

/**
 * Weighted completion score from Firestore `profile` (not Auth displayName).
 * Max 100 when core + extended fields are present.
 */
export function computeProfileCompletenessPercent(profile: UserProfileSnapshot | null): number {
  if (!profile) return 0;
  let s = 0;
  if (profile.firstName?.trim()) s += 15;
  if (profile.lastName?.trim()) s += 15;
  if (profile.phone?.trim()) s += 15;
  if (profile.canton) s += 15;
  const line = profile.addressLine1 ?? profile.address;
  if (line?.trim()) s += 10;
  if (profile.city?.trim()) s += 10;
  if (profile.postalCode?.trim()) s += 10;
  if (profile.dateOfBirth?.trim()) s += 10;
  return Math.min(100, s);
}
