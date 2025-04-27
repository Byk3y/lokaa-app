/**
 * IMPORTANT: This file is maintained for backward compatibility.
 * New code should import directly from '@/integrations/supabase/client'
 */

import { supabase } from '@/integrations/supabase/client';

// Re-export the supabase client
export { supabase };

// Re-export helper functions for backward compatibility

// Helper function to get user session
export const getSession = async () => {
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error) {
    console.error('Error getting session:', error.message);
    return null;
  }
  return session;
};

// Helper function to get current user
export const getCurrentUser = async () => {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error) {
    console.error('Error getting user:', error.message);
    return null;
  }
  return user;
}; 