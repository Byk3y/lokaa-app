import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { Session, User as SupabaseUser } from '@supabase/supabase-js'
import { supabase } from '@/integrations/supabase/client'

// Simple user interface
export interface User extends SupabaseUser {}

// Define the shape of the context
interface AuthContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
  fastPathEnabled: boolean;
  lastFastPathResult: any;
}

// Create the context with a clear undefined default value
const AuthContext = createContext<AuthContextType | undefined>(undefined)

// Provider component that wraps your app and makes auth object available to any
// child component that calls useAuth().
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // This effect runs only once on mount to set up the auth state listener.
    
    // Immediately check for an existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)

      // Set up the listener for future auth events
      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        (_event, session) => {
          console.log(`[AuthContext] Auth state changed: ${_event}`, session)
          setSession(session)
          setUser(session?.user ?? null)
        }
      )
  
      // Return a cleanup function to unsubscribe from the listener on unmount
      return () => {
        subscription.unsubscribe()
      }
    })
  }, []) // Empty dependency array ensures this runs only once.

  const signOut = async () => {
    await supabase.auth.signOut()
    // The onAuthStateChange listener will automatically update user and session to null
  }
  
  // The value provided to the context consumers
  const value = {
    session,
    user,
    loading,
    signOut,
    fastPathEnabled: !!user,
    lastFastPathResult: null,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// Custom hook to use the auth context
export const useOptimizedAuth = (): AuthContextType => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useOptimizedAuth must be used within an AuthProvider')
  }
  return context
}
