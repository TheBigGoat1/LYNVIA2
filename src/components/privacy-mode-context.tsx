'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

interface PrivacyModeContextValue {
  isPrivacyMode: boolean;
  togglePrivacyMode: () => void;
}

const PrivacyModeContext = createContext<PrivacyModeContextValue>({
  isPrivacyMode: false,
  togglePrivacyMode: () => {},
});

export function PrivacyModeProvider({ children }: { children: React.ReactNode }) {
  const [isPrivacyMode, setIsPrivacyMode] = useState(false);
  const togglePrivacyMode = () => setIsPrivacyMode((prev) => !prev);

  useEffect(() => {
    document.documentElement.dataset.privacyMode = isPrivacyMode ? 'true' : 'false';
    return () => {
      document.documentElement.removeAttribute('data-privacy-mode');
    };
  }, [isPrivacyMode]);

  return (
    <PrivacyModeContext.Provider value={{ isPrivacyMode, togglePrivacyMode }}>
      {children}
    </PrivacyModeContext.Provider>
  );
}

export function usePrivacyMode() {
  return useContext(PrivacyModeContext);
}
