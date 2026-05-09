'use client';

import type { ReactNode } from 'react';
import { PrivacyModeProvider } from '@/components/privacy-mode-context';

/**
 * Client-side shell: privacy mode for the whole app + future global chrome.
 */
export function LocaleChrome({ children }: { children: ReactNode }) {
  return <PrivacyModeProvider>{children}</PrivacyModeProvider>;
}
