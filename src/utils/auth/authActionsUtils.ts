import { log } from '@/utils/logger';
import { Session, User as SupabaseUser, AuthError } from '@supabase/supabase-js'
import { NavigateFunction } from 'react-router-dom'
import { User, SessionStateSetters } from './sessionUtils'
import { clearAuthStorage } from './userUtils'
import { clearAllAuthTokens, validateAuthSession } from './authTokenUtils'
import { useMembershipStore } from '@/features/spaces/store/membership-store'
import { useConversationStore } from '@/features/chat/store/conversationStore'
import { useMessageStore } from '@/features/chat/store/messageStore'
import { useRealtimeStore } from '@/features/chat/store/realtimeStore'
import { useNavigationStore } from '@/features/chat/store/navigationStore'
import { useSpaceAboutStore } from '@/features/spaces/store/space-about-store'
import useSpaceSettingsStore from '@/hooks/useSpaceSettingsStore'

// Define AppError type for error handling
interface AppError {
  message: string;
}

/**
 * Sign in with email and password
 * Enhanced with session validation
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
  setters.setLoading(true);
  setters.setAuthErrors([]); // Clear previous errors

  try {
    // Clear any problematic auth tokens before sign in
    await clearAllAuthTokens(true); // Preserve valid Supabase tokens
    
    // Lazy load auth module for sign in
    const { signInWithPassword } = await import('@/integrations/supabase/auth');
    const { data, error } = await signInWithPassword(email, password);

    if (error) {
      log.warn('Utils', '⚠️ [AuthActions] Sign in error:', error.message);
      setters.setAuthErrors(prev => [...prev, `Sign in failed: ${error.message}`]);
      const errorToReturn: AppError = { message: error.message };
      return { error: errorToReturn, success: false };
    }

    if (!data.session || !data.user) {
      log.warn('Utils', '⚠️ [AuthActions] Sign in attempt returned no session or user.');
      const noSessionError: AppError = { message: 'Sign in failed: No session or user returned.' };
      setters.setAuthErrors(prev => [...prev, noSessionError.message]);
      return { error: noSessionError, success: false };
    }
    
    // Validate session after successful sign in
    const validationResult = await validateAuthSession();
    
    if (!validationResult.isValid) {
      log.warn('Utils', '⚠️ [AuthActions] Session validation failed after sign in');
      const validationError: AppError = { message: 'Sign in succeeded but session validation failed.' };
      setters.setAuthErrors(prev => [...prev, validationError.message]);
      return { error: validationError, success: false };
    }
    
    setters.setSession(data.session);
    const typedUser = data.user as User; 
    setters.setUser(typedUser);

    return { error: null, success: true };
  } catch (err: unknown) {
    log.error('Utils', '❌ [AuthActions] Exception during sign in:', err);
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
 * Enhanced with session validation and token cleanup
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
  // Prepare metadata if provided
  const metadata = options ? {
    first_name: options.firstName,
    last_name: options.lastName,
    full_name: `${options.firstName} ${options.lastName}`.trim()
  } : undefined;
  
  try {
    // Clear any problematic auth tokens before sign up
    await clearAllAuthTokens(true); // Preserve valid Supabase tokens
    
    // Lazy load auth module for sign up
    const { signOut, signUp: supabaseSignUp } = await import('@/integrations/supabase/auth');
    
    // Clear any existing session
    await signOut();
    setters.setHasRouted(false);
    
    // Attempt to sign up
    const isLocalhost = typeof window !== 'undefined' && window.location.origin.startsWith('http://localhost');
    const redirectTo = isLocalhost
      ? 'https://lokaa.app/auth/confirm' // ensure https link for email clients
      : `${window.location.origin}/auth/confirm`;

    const { data, error } = await supabaseSignUp(email, password, {
      data: metadata,
      emailRedirectTo: redirectTo
    });
    
    if (error) {
      log.error('Utils', '❌ [AuthActions] Sign up error:', error.message);
      setters.setAuthErrors(prev => [...prev, `Sign up error: ${error.message}`]);
      return { error, data: null };
    }
    
    // Supabase automatically sends verification email when signUp is called
    // Using Supabase's built-in email system with custom template
    log.debug('Utils', '🔍 [AuthActions] Supabase will send verification email automatically', {
      hasUser: !!data.user,
      hasSession: !!data.session
    });
    
    // Enhanced success handling with validation
    if (data.session) {
      const validationResult = await validateAuthSession();
      
      if (!validationResult.isValid) {
        log.warn('Utils', '⚠️ [AuthActions] Session validation failed after sign up');
        const validationError: AppError = { message: 'Sign up succeeded but session validation failed.' };
        setters.setAuthErrors(prev => [...prev, validationError.message]);
        return { error: validationError, data: null };
      }
    }
    
    return { error: null, data, success: true };
  } catch (err: unknown) {
    log.error('Utils', '❌ [AuthActions] Exception during sign up:', err);
    const message = err instanceof Error ? err.message : String(err);
    setters.setAuthErrors(prev => [...prev, `Sign up exception: ${message}`]);
    return { error: { message } as AppError, data: null, success: false };
  }
};

/**
 * Sign out user
 * Enhanced with comprehensive cleanup
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
  try {
    // Store the current pathname to determine navigation strategy
    const currentPath = window.location.pathname;
    const isDiscoverPage = currentPath === '/discover';
    
    // Set routing in progress first to prevent UI flashing
    setters.setRoutingInProgress(true);
    
    // Clear all auth tokens immediately using centralized utilities
    await clearAllAuthTokens(false); // Clear all tokens including Supabase during signout
    
    // Clear auth state immediately to prevent flashing
    setters.setUser(null);
    setters.setSession(null);
    setters.setUserDetails(null);
    
    // Clear state and storage immediately using utility (now redundant but safe)
    clearAuthStorage();
    
    // Clear membership store cache to prevent unauthorized access
    try {
      const membershipStore = useMembershipStore.getState();
      membershipStore.clearCache();
      membershipStore.reset();
    } catch (error) {
      log.warn('Utils', '⚠️ [AuthActions] Failed to clear membership store cache:', error);
    }
    
    // Reset all other Zustand stores to prevent stale data
    try {
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
      
    } catch (error) {
      log.warn('Utils', '⚠️ [AuthActions] Failed to reset Zustand stores:', error);
    }

    // Sign out from Supabase
    const { error } = await getSupabaseClient().auth.signOut();
    
    if (error) {
      throw error;
    }
    
    // Final validation that all tokens are cleared
    try {
      const postSignOutValidation = await validateAuthSession();
      if (postSignOutValidation.isValid) {
        log.warn('Utils', '⚠️ [AuthActions] Session still valid after signout, force clearing...');
        await clearAllAuthTokens(false);
      }
    } catch (validationError) {
      // Expected - session validation should fail after signout
    }
    
    // Use smooth navigation to landing page
    navigate('/', { replace: true });
    
    // Clear routing progress after navigation
    setTimeout(() => {
      setters.setRoutingInProgress(false);
    }, 100);
    
  } catch (error) {
    log.error('Utils', '❌ [AuthActions] Enhanced signOut error:', error);
    setters.setAuthErrors(prev => [...prev, `Sign out failed: ${error.message || 'Unknown error'}`]);
    
    // Enhanced error recovery
    try {
      // Emergency cleanup: Force clear everything
      await clearAllAuthTokens(false);
      await getSupabaseClient().auth.signOut();
      navigate('/', { replace: true });
      setters.setRoutingInProgress(false);
    } catch (emergencyError) {
      // Only fall back to hard redirect if everything fails
      log.warn('Utils', '🚨 [AuthActions] Emergency cleanup failed, using fallback redirect');
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
    log.error('Utils', '❌ [AuthActions] Error resetting test account state:', error);
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
  setters.setLoading(true);
  setters.setAuthErrors([]);
  try {
    // Send OTP for password reset using signInWithOtp
    const { error } = await getSupabaseClient().auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: false, // Don't create user if they don't exist
      },
    });
    if (error) {
      log.warn('Utils', '⚠️ [AuthActions] Password reset OTP error:', error.message);
      setters.setAuthErrors(prev => [...prev, `Password reset failed: ${error.message}`]);
      const errorToReturn: AppError = { message: error.message };
      return { error: errorToReturn, success: false };
    }
    return { error: null, success: true };
  } catch (err: unknown) {
    log.error('Utils', '❌ [AuthActions] Exception during password reset OTP:', err);
    const message = err instanceof Error ? err.message : String(err);
    setters.setAuthErrors(prev => [...prev, `Password reset exception: ${message}`]);
    const errorResult: { error: AppError; success: boolean } = { error: { message }, success: false };
    return errorResult;
  } finally {
    setters.setLoading(false);
  }
}; 