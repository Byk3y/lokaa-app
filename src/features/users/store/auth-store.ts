/**
 * Auth Store
 * 
 * This store manages authentication state using Zustand.
 * It will replace the React Context-based authentication system.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { AuthState, User, AuthCredentials } from '../types';

/**
 * Actions for the auth store
 */
interface AuthActions {
  /**
   * Sign in with email and password
   */
  signIn: (credentials: AuthCredentials) => Promise<void>;
  
  /**
   * Sign out the current user
   */
  signOut: () => Promise<void>;
  
  /**
   * Sign up a new user
   */
  signUp: (credentials: AuthCredentials) => Promise<void>;
  
  /**
   * Refresh the session
   */
  refreshSession: () => Promise<boolean>;
  
  /**
   * Reset the auth state
   */
  reset: () => void;
  
  /**
   * Set the current user
   */
  setUser: (user: User | null) => void;
  
  /**
   * Set the auth loading state
   */
  setLoading: (isLoading: boolean) => void;
  
  /**
   * Set the auth error
   */
  setError: (error: string | null) => void;
}

/**
 * Combined store type
 */
export type AuthStore = AuthState & AuthActions;

/**
 * Initial state
 */
const initialState: AuthState = {
  user: null,
  session: null,
  isLoading: false,
  isAuthenticated: false,
  error: null,
};

/**
 * Store for managing authentication state
 */
export const useOptimizedAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      // Initial state
      ...initialState,
      
      // Actions
      signIn: async (credentials) => {
        set({ isLoading: true, error: null });
        
        try {
          // Will be implemented during migration to call supabase auth
          // const { data, error } = await getSupabaseClient().auth.signInWithPassword(credentials);
          
          // Mock implementation
          const mockUser: User = {
            id: '123',
            email: credentials.email,
            name: 'Test User',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
          
          const mockSession = {
            access_token: 'mock-token',
            refresh_token: 'mock-refresh-token',
            expires_at: Date.now() + 3600 * 1000,
          };
          
          set({ 
            user: mockUser,
            session: mockSession,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch (error) {
          set({ 
            isLoading: false, 
            error: error instanceof Error ? error.message : 'Failed to sign in'
          });
        }
      },
      
      signOut: async () => {
        set({ isLoading: true });
        
        try {
          // Will be implemented during migration
          // await getSupabaseClient().auth.signOut();
          
          set({ 
            user: null,
            session: null,
            isAuthenticated: false,
            isLoading: false,
          });
        } catch (error) {
          set({ 
            isLoading: false, 
            error: error instanceof Error ? error.message : 'Failed to sign out'
          });
        }
      },
      
      signUp: async (credentials) => {
        set({ isLoading: true, error: null });
        
        try {
          // Will be implemented during migration
          // const { data, error } = await getSupabaseClient().auth.signUp(credentials);
          
          // Note: In a real implementation, we would handle the email confirmation flow
          
          set({ 
            isLoading: false,
            // We don't set authenticated here since the user needs to confirm email
          });
        } catch (error) {
          set({ 
            isLoading: false, 
            error: error instanceof Error ? error.message : 'Failed to sign up'
          });
        }
      },
      
      refreshSession: async () => {
        const { session } = get();
        
        if (!session) {
          return false;
        }
        
        // Check if token is expired or about to expire
        const isExpired = session.expires_at < Date.now();
        
        if (isExpired) {
          try {
            // Will be implemented during migration
            // const { data, error } = await getSupabaseClient().auth.refreshSession();
            
            // Mock implementation
            const mockSession = {
              access_token: 'new-mock-token',
              refresh_token: 'new-mock-refresh-token',
              expires_at: Date.now() + 3600 * 1000,
            };
            
            set({ session: mockSession });
            return true;
          } catch (error) {
            // If refresh fails, log the user out
            await get().signOut();
            return false;
          }
        }
        
        return true;
      },
      
      setUser: (user) => {
        set({ 
          user,
          isAuthenticated: !!user,
        });
      },
      
      setLoading: (isLoading) => {
        set({ isLoading });
      },
      
      setError: (error) => {
        set({ error });
      },
      
      reset: () => {
        set(initialState);
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        // Only persist these fields
        user: state.user,
        session: state.session,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
); 