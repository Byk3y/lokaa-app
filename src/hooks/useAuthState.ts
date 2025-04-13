
import { useState, useEffect } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { fetchUserDetails } from "@/utils/authUtils";

export function useAuthState() {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [userDetails, setUserDetails] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  // Function to refresh user profile data
  const refreshProfile = async () => {
    if (!user?.id) return;
    const details = await fetchUserDetails(user.id);
    if (details) {
      setUserDetails(details);
    }
  };

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, newSession) => {
        setSession(newSession);
        setUser(newSession?.user ?? null);
        
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          // Use setTimeout to prevent async deadlocks
          setTimeout(() => {
            fetchUserDetails(newSession?.user?.id).then(details => {
              if (details) setUserDetails(details);
            });
          }, 0);
        } else if (event === 'SIGNED_OUT') {
          setUserDetails(null);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      setSession(currentSession);
      setUser(currentSession?.user ?? null);
      
      if (currentSession?.user) {
        fetchUserDetails(currentSession.user.id).then(details => {
          if (details) setUserDetails(details);
          setLoading(false);
        });
      } else {
        setLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return {
    session,
    user,
    userDetails,
    loading,
    refreshProfile
  };
}
