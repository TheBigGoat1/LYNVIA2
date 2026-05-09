'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

export const INDIVIDUAL_ENTRY_ANIMATION_FLAG = 'lynvia-individual-enter';

export function IndividualEntryShell({ children }: { children: React.ReactNode }) {
  const [play, setPlay] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (sessionStorage.getItem(INDIVIDUAL_ENTRY_ANIMATION_FLAG) === '1') {
      sessionStorage.removeItem(INDIVIDUAL_ENTRY_ANIMATION_FLAG);
      setPlay(true);
      const t = window.setTimeout(() => setPlay(false), 520);
      return () => window.clearTimeout(t);
    }
  }, []);

  return (
    <div
      className={cn(
        'min-h-0 min-w-0 w-full max-w-full flex-1',
        play && 'origin-top animate-dashboard-enter motion-reduce:animate-none',
      )}
    >
      {children}
    </div>
  );
}
