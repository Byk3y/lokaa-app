import React, { createContext, useContext, ReactNode } from 'react';
import { SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseClient } from '@/integrations/supabase/client';
import type { Database } from '@/types/database.types';

// Create context for Supabase client
const SupabaseContext = createContext<SupabaseClient<Database> | null>(null);

interface SupabaseProviderProps {
  children: ReactNode;
}

/**
 * Supabase Context Provider - Ensures singleton client instance
 * Based on research recommendations to prevent "Multiple GoTrueClient instances"
 */
export function SupabaseProvider({ children }: SupabaseProviderProps) {
  return (
    <SupabaseContext.Provider value={getSupabaseClient()}>
      {children}
    </SupabaseContext.Provider>
  );
}

/**
 * Hook to access the singleton Supabase client
 * Throws error if used outside provider to ensure proper usage
 */
export function useSupabase(): SupabaseClient<Database> {
  const client = useContext(SupabaseContext);
  
  if (!client) {
    throw new Error('useSupabase must be used within a SupabaseProvider');
  }
  
  return client;
}

/**
 * Optional hook that returns null if no client (for conditional usage)
 */
export function useSupabaseOptional(): SupabaseClient<Database> | null {
  return useContext(SupabaseContext);
} 