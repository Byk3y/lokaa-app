import { log } from '@/utils/logger';
import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { getSupabaseClient } from '@/integrations/supabase/client';

import { useUserSpacesStore } from '@/hooks/useUserSpacesStore';
import { authMigrationHelper } from '@/utils/auth/authMigrationHelper';
// import { simpleMobileManager } from '@/utils/SimpleMobileManager' // ✅ Simplified mobile manager


interface AuthContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
  routingInProgress: boolean;
  signOut: (path?: string) => Promise<void>;
  // Enhanced authentication utilities
  refreshSession: () => Promise<boolean>;
  validateSession: () => Promise<boolean>;
}

interface AuthProviderProps {
  children: React.ReactNode;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [routingInProgress, setRoutingInProgress] = useState(false);
  const preloadSpaces = useUserSpacesStore(state => state.preloadSpaces);

  // Initialize auth state
  const initializeAuth = useCallback(async (maxRetries = 3) => {
    let retryCount = 0;
    
    while (retryCount < maxRetries) {
      try {
        const { data, error } = await getSupabaseClient().auth.getSession();
        
        if (error) {
          log.error('Context', '[AuthProvider] Session retrieval error:', error);
          throw error;
        }

        setSession(data.session);
        setUser(data.session?.user || null);
        setLoading(false);
        return;
        
      } catch (error) {
        retryCount++;
        if (retryCount >= maxRetries) {
          log.error('Context', '[AuthProvider] Failed to initialize auth after', maxRetries, 'attempts:', error);
          setLoading(false);
          return;
        }
        
        await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
      }
    }
  }, []);

  useEffect(() => {
    const location = window.location;
    
    // Check for sign out redirect scenario
    if (location.pathname === '/' && !location.search) {
      setLoading(false);
      return;
    }

    const initializeWithMigration = async () => {
      try {
        // Run authentication migration helper
        const migrationResult = await authMigrationHelper.runMigration({
          retries: 2,
          emergencyFallback: true
        });
        
        if (migrationResult.success && migrationResult.keysCleared.length > 0) {
          // Migration cleaned up problematic keys
        }
        
      } catch (error) {
        log.warn('Context', '[AuthProvider] Migration helper failed:', error);
      }
      
      // Initialize auth regardless of migration result
      await initializeAuth();
    };

    initializeWithMigration();
  }, [initializeAuth]);

  useEffect(() => {
    let retryCount = 0;
    const maxRetries = 3;

    const checkSession = async () => {
      try {
        const { data, error } = await getSupabaseClient().auth.getSession();
        
        if (error) throw error;
        
        setSession(data.session);
        setUser(data.session?.user || null);
        
        if (data.session?.user) {
          preloadSpaces(data.session.user.id);
          // Mobile manager disabled - handled by comprehensive fix
        }
        
        // Mobile manager disabled - handled by comprehensive fix
      } catch (error) {
        retryCount++;
        if (retryCount < maxRetries) {
          setTimeout(() => checkSession(), 1000);
        } else {
          log.error('Context', '[AuthProvider] Session check failed after retries:', error);
        }
      }
    };

    const { data: { subscription } } = getSupabaseClient().auth.onAuthStateChange(
      async (event, session) => {
        // Handle auth state changes directly in AuthContext
        setSession(session);
        setUser(session?.user || null);
        
        if (event === 'SIGNED_IN' && session?.user) {
          preloadSpaces(session.user.id);
          setLoading(false);
          setRoutingInProgress(false);
          // Mobile manager disabled - handled by comprehensive fix
        } else if (event === 'SIGNED_OUT') {
          setLoading(false);
          setRoutingInProgress(false);
          // Mobile manager disabled - handled by comprehensive fix
        }
      }
    );

    checkSession();

    // Return a cleanup function to unsubscribe from the listener on unmount
    return () => subscription.unsubscribe();
  }, [preloadSpaces]);

  useEffect(() => {
    if (loading && session === null) {
      let retryCount = 0;
      const maxRetries = 3;

      const retryInit = () => {
        retryCount++;
        if (retryCount <= maxRetries) {
          setTimeout(() => {
            initializeAuth(maxRetries - retryCount + 1);
          }, 1000 * retryCount);
        }
      };

      retryInit();
    }
  }, [loading, session, initializeAuth]);

  // Enhanced session refresh functionality
  const refreshSession = useCallback(async (): Promise<boolean> => {
    try {
      const { data, error } = await getSupabaseClient().auth.refreshSession();
      
      if (error) {
        log.warn('Context', '[AuthProvider] Session refresh error:', error);
        return false;
      }
      
      if (data.session) {
        setSession(data.session);
        setUser(data.session.user);
        return true;
      }
      
      return false;
    } catch (error) {
      log.error('Context', '[AuthProvider] Session refresh failed:', error);
      return false;
    }
  }, []);

  // Enhanced session validation functionality
  const validateSession = useCallback(async (): Promise<boolean> => {
    try {
      const { clearAllAuthTokens, validateAuthSession } = await import('@/utils/auth/authTokenUtils');
      
      // Use enhanced validation from authTokenUtils
      const validation = await validateAuthSession();
      
      if (validation.hasInconsistentKeys) {
        // Clean up inconsistent auth keys during validation
        clearAllAuthTokens();
      }
      
      if (validation.isValid) {
        setSession(validation.session);
        setUser(validation.session?.user || null);
        return true;
      }
      
      return false;
    } catch (error) {
      log.error('Context', '[AuthProvider] Session validation failed:', error);
      return false;
    }
  }, []);

  // Enhanced signOut with direct clearAllAuthTokens integration
  const signOut = useCallback(async (path?: string) => {
    try {
      // Use direct clearAllAuthTokens integration for immediate cleanup
      const { clearAllAuthTokens } = await import('@/utils/auth/authTokenUtils');
      
      // Clear auth tokens immediately
      clearAllAuthTokens();

      // Sign out from Supabase
      const { error } = await getSupabaseClient().auth.signOut();
      
      if (error) {
        log.error('Context', '[AuthProvider] Supabase signOut error:', error);
      }

      // Clear auth state
      setSession(null);
      setUser(null);
      setLoading(false);
      setRoutingInProgress(false);

      // Navigate to specified path or landing page
      const targetPath = path || '/';
      window.location.href = targetPath;

    } catch (error) {
      log.error('Context', '[AuthProvider] Enhanced signOut error:', error);
      
      // Fallback: Basic Supabase signOut
      try {
        await getSupabaseClient().auth.signOut();
        setSession(null);
        setUser(null);
        setLoading(false);
        setRoutingInProgress(false);
        window.location.href = '/';
      } catch (fallbackError) {
        log.error('Context', '[AuthProvider] Fallback signOut failed:', fallbackError);
        window.location.href = '/';
      }
    }
  }, []);

  const contextValue = useMemo(() => ({
    session,
    user,
    loading,
    routingInProgress,
    signOut,
    // Enhanced authentication utilities
    refreshSession,
    validateSession
  }), [session, user, loading, routingInProgress, signOut, refreshSession, validateSession]);

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const useOptimizedAuth = useAuth;
