import { Session, User as SupabaseUser, AuthError } from '@supabase/supabase-js'
import { getSupabaseClient } from '@/integrations/supabase/client'
import { NavigateFunction } from 'react-router-dom'
import { User, SessionStateSetters } from './sessionUtils'
import { clearAuthStorage } from './userUtils'
import { useMembershipStore } from '@/features/spaces/store/membership-store'
import { useChatStore } from '@/features/chat/store/chat-store'
import { useSpaceAboutStore } from '@/features/spaces/store/space-about-store'
import useSpaceSettingsStore from '@/hooks/useSpaceSettingsStore'
import { globalTabComponentManager } from "@/utils/globalTabComponentManager";

// Define AppError type for error handling
interface AppError {
  message: string;
}

/**
 * Sign in with email and password
 */
export const signIn = async (
  email: string,
  password: string,
  setters: {
    setLoading: (loading: boolean) => void;
    setAuthErrors: (errors: string[] | ((prev: string[]) => string[])) => void;
    setSession: (session: Session | null) => void;
    setUser: (user: User | null) => void;
  }
): Promise<{ error: AuthError | AppError | null; success?: boolean; }> => {
  console.log('🔑 Signing in user:', email);
  setters.setLoading(true);
  setters.setAuthErrors([]); // Clear previous errors

  try {
    const { data, error } = await getSupabaseClient().auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.warn('⚠️ Sign in error:', error.message);
      setters.setAuthErrors(prev => [...prev, `Sign in failed: ${error.message}`]);
      // Ensure the returned error object matches AppError (message only)
      const errorToReturn: AppError = { message: error.message };
      return { error: errorToReturn, success: false };
    }

    if (!data.session || !data.user) {
      console.warn('🤔 Sign in attempt returned no session or no user, but no explicit error.');
      const noSessionError: AppError = { message: 'Sign in failed: No session or user returned.' };
      setters.setAuthErrors(prev => [...prev, noSessionError.message]);
      return { error: noSessionError, success: false };
    }
    
    console.log('✅ Sign in successful. Session:', data.session, 'User:', data.user);
    setters.setSession(data.session);
    const typedUser = data.user as User; 
    setters.setUser(typedUser);

    return { error: null, success: true };
  } catch (err: unknown) {
    console.error('❌ Exception during sign in:', err);
    const message = err instanceof Error ? err.message : String(err);
    setters.setAuthErrors(prev => [...prev, `Sign in exception: ${message}`]);
    const errorResult: { error: AppError; success: boolean } = { error: { message }, success: false };
    return errorResult;
  } finally {
    setters.setLoading(false);
  }
};

/**
 * Sign up with email and password
 */
export const signUp = async (
  email: string,
  password: string,
  options: { username?: string; firstName?: string; lastName?: string } | undefined,
  setters: {
    setAuthErrors: (errors: string[] | ((prev: string[]) => string[])) => void;
    setHasRouted: (hasRouted: boolean) => void;
    setUser: (user: User | null | ((prevUser: User | null) => User | null)) => void;
  }
): Promise<{ data?: { user: SupabaseUser | null; session: Session | null; } | null; error: AuthError | AppError | null; success?: boolean; }> => {
  console.log('📝 Signing up user:', email, options ? 'with metadata' : 'without metadata');
  // Prepare metadata if provided
  const metadata = options ? {
    first_name: options.firstName,
    last_name: options.lastName,
    full_name: `${options.firstName} ${options.lastName}`.trim()
  } : undefined;
  try {
    // Clear any existing session
    console.log('🧹 Clearing any existing session before sign up');
    await getSupabaseClient().auth.signOut();
    setters.setHasRouted(false);
    // Attempt to sign up
    const { data, error } = await getSupabaseClient().auth.signUp({ 
      email, 
      password,
      options: {
        data: metadata
      }
    });
    if (error) {
      console.error('❌ Sign up error:', error.message);
      setters.setAuthErrors(prev => [...prev, `Sign up error: ${error.message}`]);
      return { error, data: null };
    }
    console.log('✅ Sign up successful', {
      user: data.user?.email,
      id: data.user?.id,
      hasSession: !!data.session
    });
    return { error: null, data, success: true };
  } catch (err: unknown) {
    console.error('❌ Exception during sign up:', err);
    const message = err instanceof Error ? err.message : String(err);
    setters.setAuthErrors(prev => [...prev, `Sign up exception: ${message}`]);
    return { error: { message } as AppError, data: null, success: false };
  }
};

/**
 * Sign out user
 */
export const signOut = async (
  navigate: NavigateFunction,
  setters: {
    setUser: (user: User | null) => void;
    setSession: (session: Session | null) => void;
    setUserDetails: (details: any) => void;
    setHasRouted: (hasRouted: boolean) => void;
    setEarlyRedirectAttempted: (attempted: boolean) => void;
    setRoutingInProgress: (inProgress: boolean) => void;
    setAuthErrors: (errors: string[] | ((prev: string[]) => string[])) => void;
  }
): Promise<void> => {
  console.log('🚪 Signing out user');
  
  // Clear state and storage immediately using utility
  clearAuthStorage();
  
  // CRITICAL: Clear membership store cache to prevent unauthorized access
  try {
    const membershipStore = useMembershipStore.getState();
    membershipStore.clearCache();
    membershipStore.reset();
    console.log('🧹 Cleared and reset membership store');
  } catch (error) {
    console.warn('Failed to clear membership store cache:', error);
  }
  
  // CRITICAL: Reset all other Zustand stores to prevent stale data
  try {
    const chatStore = useChatStore.getState();
    chatStore.reset();
    
    const spaceAboutStore = useSpaceAboutStore.getState();
    spaceAboutStore.reset();
    
    const spaceSettingsStore = useSpaceSettingsStore.getState();
    spaceSettingsStore.resetStore();
    
    console.log('🧹 Reset all Zustand stores');
  } catch (error) {
    console.warn('Failed to reset Zustand stores:', error);
  }
  
  // Space state management is now handled by individual components
  
  // **CRITICAL SECURITY FIX**: Clear Unified Presence cache to prevent cross-user data contamination
  try {
    const { clearUnifiedPresenceCache } = await import('@/hooks/useUnifiedPresence');
    clearUnifiedPresenceCache();
    console.log('🧹 SECURITY: Cleared Unified Presence cache');
  } catch (error) {
    console.warn('Failed to clear Unified Presence cache:', error);
  }
  
  // Space component cache cleanup is now handled by individual components
  
  // **CRITICAL SECURITY FIX**: Clear Global Cache Coordinator to prevent cross-user data contamination
  try {
    const { clearGlobalCache } = await import('@/utils/globalCacheCoordinator');
    clearGlobalCache();
    console.log('🧹 SECURITY: Cleared Global Cache Coordinator');
  } catch (error) {
    console.warn('Failed to clear Global Cache Coordinator:', error);
  }
  
  // **CRITICAL SECURITY FIX**: Clear Fast Path cache and other utility caches
  try {
    const { clearFastPathCache } = await import('@/utils/simpleFastPath');
    const { clearSpaceCache } = await import('@/utils/cacheUtils');
    clearFastPathCache();
    clearSpaceCache();
    console.log('🧹 SECURITY: Cleared FastPath and utility caches');
  } catch (error) {
    console.warn('Failed to clear FastPath and utility caches:', error);
  }
  
  // **CRITICAL SECURITY FIX**: Clear Global Tab Components to prevent cross-user data contamination
  try {
    globalTabComponentManager.clearAllComponents();
    console.log('🧹 SECURITY: Cleared global tab components');
  } catch (error) {
    console.warn('Failed to clear global tab components:', error);
  }
  
  // Feed DOM state is now managed by components directly
  
  setters.setUser(null);
  setters.setSession(null);
  setters.setUserDetails(null);
  setters.setHasRouted(false);
  setters.setEarlyRedirectAttempted(false);
  setters.setRoutingInProgress(false);
  
  try {
    // Store the current pathname to determine if we need to manually refresh
    const currentPath = window.location.pathname;
    const isDiscoverPage = currentPath === '/discover';
    
    // Sign out from Supabase
    console.log('🔑 Calling Supabase signOut method');
    const { error } = await getSupabaseClient().auth.signOut();
    
    if (error) {
      throw error;
    }
    
    console.log('✅ Supabase sign out successful');
    
    // Safari-specific fix for Discover page - force redirect with page reload
    if (isDiscoverPage) {
      console.log('📱 Detected sign out from Discover page, using hard redirect');
      // Use replace to avoid back button issues, and add timestamp to bust cache
      window.location.replace(`/?t=${Date.now()}`);
      return; // Exit early to allow the redirect to happen
    }
    
    // For non-Discover pages, use React Router if possible, fallback to location
    console.log('🔀 Navigating to landing page after sign out');
    try {
      // Navigate with replace to avoid back button issues
      navigate('/', { replace: true });
      
      // Double-check with a delayed fallback for Safari
      setTimeout(() => {
        if (window.location.pathname !== '/') {
          console.log('⚠️ Navigation may have failed, using fallback redirect');
          window.location.replace('/');
        }
      }, 500);
    } catch (navError) {
      console.error('❌ Navigation error:', navError);
      // Fallback to direct location change
      window.location.replace('/');
    }
  } catch (error: unknown) {
    console.error('❌ Error signing out:', error);
    setters.setAuthErrors(prev => [...prev, `Sign out error: ${error instanceof Error ? error.message : String(error)}`]);
    
    // Even on error, make sure we reset the app state
    setters.setUser(null);
    setters.setSession(null);
    
    // Force a hard redirect on error
    console.log('⚠️ Error during sign out, using fallback redirect');
    window.location.replace(`/?error=signout&t=${Date.now()}`);
  }
};

/**
 * Reset test account state
 */
export const resetTestAccountState = async (
  navigate: NavigateFunction,
  setters: {
    setHasRouted: (hasRouted: boolean) => void;
    setAuthErrors: (errors: string[] | ((prev: string[]) => string[])) => void;
  }
): Promise<void> => {
  console.log('🔄 Resetting test account state');
  
  try {
    // Clear all storage
    localStorage.clear();
    sessionStorage.clear();
    
    // Reset routing flag
    setters.setHasRouted(false);
    
    // Navigate to discover
    navigate('/discover', { replace: true });
    
    return Promise.resolve();
  } catch (error: unknown) {
    console.error('❌ Error resetting test account state:', error);
    const message = error instanceof Error ? error.message : String(error);
    setters.setAuthErrors(prev => [...prev, `Reset test account error: ${message || 'Unknown error'}`]);
    return Promise.reject({ message });
  }
};

/**
 * Reset password
 */
export const resetPassword = async (
  email: string,
  setters: {
    setLoading: (loading: boolean) => void;
    setAuthErrors: (errors: string[] | ((prev: string[]) => string[])) => void;
  }
): Promise<{ error: AuthError | AppError | null; success?: boolean; }> => {
  console.log('🔑 Requesting password reset for:', email);
  setters.setLoading(true);
  setters.setAuthErrors([]);
  try {
    const { error } = await getSupabaseClient().auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/update-password`, // Corrected redirect, was /reset-password
    });
    if (error) {
      console.warn('⚠️ Password reset error:', error.message);
      setters.setAuthErrors(prev => [...prev, `Password reset failed: ${error.message}`]);
      // Ensure the returned error object matches AppError (message only)
      const errorToReturn: AppError = { message: error.message };
      return { error: errorToReturn, success: false };
    }
    console.log('✅ Password reset email sent successfully.');
    return { error: null, success: true };
  } catch (err: unknown) {
    console.error('❌ Exception during password reset:', err);
    const message = err instanceof Error ? err.message : String(err);
    setters.setAuthErrors(prev => [...prev, `Password reset exception: ${message}`]);
    const errorResult: { error: AppError; success: boolean } = { error: { message }, success: false };
    return errorResult;
  } finally {
    setters.setLoading(false);
  }
}; 