import { Session, User as SupabaseUser, AuthError } from '@supabase/supabase-js'
import { getSupabaseClient } from '@/integrations/supabase/client'
import { NavigateFunction } from 'react-router-dom'
import { User, SessionStateSetters } from './sessionUtils'
import { clearAuthStorage } from './userUtils'
import { useMembershipStore } from '@/features/spaces/store/membership-store'
// ✅ UPDATED: Use new specialized chat stores instead of old monolithic chat store
import { useConversationStore } from '@/features/chat/store/conversationStore'
import { useMessageStore } from '@/features/chat/store/messageStore'
import { useRealtimeStore } from '@/features/chat/store/realtimeStore'
import { useNavigationStore } from '@/features/chat/store/navigationStore'
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
  
  try {
    // Store the current pathname to determine navigation strategy
    const currentPath = window.location.pathname;
    const isDiscoverPage = currentPath === '/discover';
    
    // Set routing in progress first to prevent UI flashing
    setters.setRoutingInProgress(true);
    
    // Clear auth state immediately to prevent flashing
    setters.setUser(null);
    setters.setSession(null);
    setters.setUserDetails(null);
    
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
      // ✅ UPDATED: Reset all new specialized chat stores instead of old monolithic chat store
      const conversationStore = useConversationStore.getState();
      conversationStore.reset();
      
      const messageStore = useMessageStore.getState();
      messageStore.reset();
      
      const realtimeStore = useRealtimeStore.getState();
      realtimeStore.reset();
      
      const navigationStore = useNavigationStore.getState();
      navigationStore.reset();
      
      const spaceAboutStore = useSpaceAboutStore.getState();
      spaceAboutStore.reset();
      
      const spaceSettingsStore = useSpaceSettingsStore.getState();
      spaceSettingsStore.resetStore();
      
      console.log('🧹 Reset all Zustand stores including specialized chat stores');
    } catch (error) {
      console.warn('Failed to reset Zustand stores:', error);
    }

    // Sign out from Supabase
    console.log('🔑 Calling Supabase signOut method');
    const { error } = await getSupabaseClient().auth.signOut();
    
    if (error) {
      throw error;
    }
    
    console.log('✅ Supabase sign out successful');
    
    // Use smooth navigation instead of hard redirect
    console.log('🚀 Using smooth navigation to landing page');
    navigate('/', { replace: true });
    
    // Clear routing progress after navigation
    setTimeout(() => {
      setters.setRoutingInProgress(false);
    }, 100);
    
  } catch (error) {
    console.error('❌ Sign out error:', error);
    setters.setAuthErrors(prev => [...prev, `Sign out failed: ${error.message || 'Unknown error'}`]);
    
    // On error, still try smooth navigation first
    try {
      navigate('/', { replace: true });
      setters.setRoutingInProgress(false);
    } catch (navError) {
      // Only fall back to hard redirect if navigation fails
      console.warn('Navigation failed, using fallback redirect');
      sessionStorage.setItem('lokaa-signing-out', 'true');
      window.location.replace('/');
    }
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