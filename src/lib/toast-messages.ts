export const AUTH_ERROR_KEYS: Record<string, string> = {
  'auth/invalid-credential': 'auth.invalidCredentials',
  'auth/wrong-password': 'auth.invalidCredentials',
  'auth/invalid-email': 'auth.invalidCredentials',
  'auth/user-not-found': 'auth.userNotFound',
  'auth/user-disabled': 'auth.userDisabled',
  'auth/too-many-requests': 'auth.tooManyRequests',
  'auth/network-request-failed': 'auth.networkError',
  'auth/email-already-in-use': 'auth.emailAlreadyInUse',
  'auth/weak-password': 'auth.weakPassword',
  'auth/requires-recent-login': 'auth.requiresRecentLogin',
  'auth/operation-not-allowed': 'auth.operationNotAllowed',
  'permission-denied': 'auth.permissionDenied',
  'unavailable': 'auth.unavailable',
};

export function authErrorMessage(t: (key: string) => string, error: unknown): string {
  const code =
    typeof error === 'object' && error !== null && 'code' in error
      ? String((error as { code?: string }).code)
      : '';
  const key = AUTH_ERROR_KEYS[code];
  if (key) {
    return t(key);
  }
  return error instanceof Error ? error.message : typeof error === 'string' ? error : t('auth.fallback');
}
