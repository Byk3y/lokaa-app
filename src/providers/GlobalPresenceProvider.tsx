import React, { createContext, useContext, ReactNode } from 'react';
import { useGlobalPresence } from '@/hooks/useGlobalPresence';

// Context to expose global presence functionality if needed
type GlobalPresenceContextType = {
  // Can be extended with additional presence-related functions if needed
};

const GlobalPresenceContext = createContext<GlobalPresenceContextType | null>(null);

interface GlobalPresenceProviderProps {
  children: ReactNode;
}

export function GlobalPresenceProvider({ children }: GlobalPresenceProviderProps) {
  // Use the hook to set up presence tracking
  useGlobalPresence();
  
  return (
    <GlobalPresenceContext.Provider value={{}}>
      {children}
    </GlobalPresenceContext.Provider>
  );
}

// Hook to use the context (can be extended later) - FIXED: Named function for Fast Refresh compatibility
export function useGlobalPresenceContext() {
  const context = useContext(GlobalPresenceContext);
  if (!context) {
    throw new Error('useGlobalPresenceContext must be used within a GlobalPresenceProvider');
  }
  return context;
} 