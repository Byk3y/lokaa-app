import { Session, User, PostgrestError } from "@supabase/supabase-js";
import { getSupabaseClient } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

// Fetch user details from the users table
export const fetchUserDetails = async (userId: string | undefined) => {
  if (!userId) return null;

  try {
    const { data, error } = await getSupabaseClient()
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Error fetching user details:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error in fetchUserDetails:', error);
    return null;
  }
};

// Handle sign in with email and password
export const handleSignIn = async (email: string, password: string) => {
  try {
    const { error } = await getSupabaseClient().auth.signInWithPassword({ email, password });
    
    if (error) {
      toast({
        title: "Sign in failed",
        description: error.message,
        variant: "destructive"
      });
      return { success: false, error };
    }
    
    toast({
      title: "Signed in successfully",
      description: "Welcome back!",
    });
    return { success: true };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    toast({
      title: "Sign in failed",
      description: message,
      variant: "destructive"
    });
    return { success: false, error: { message } };
  }
};

// Handle sign up with email, password, username and optional full name
export const handleSignUp = async (email: string, password: string, username: string, firstName: string, lastName: string) => {
  try {
    // Check if a profile URL exists for this username
    const { data: profileData, error: profileError } = await getSupabaseClient()
      .from('users')
      .select('profile_url')
      .eq('profile_url', username)
      .maybeSingle();

    if (profileError) {
      console.error("Error checking profile URL during generation:", profileError.message);
      return username; // Fallback to original username if error
    }

    if (profileData) {
      // If user_url is taken, append a random suffix
      const newUsername = `${username}-${Math.random().toString(36).substring(2, 7)}`;
      console.log(`Username ${username} taken, generated new one: ${newUsername}`);
      const potential_profile_url = `/profile/${newUsername}`; // New format
      return newUsername; // Return the suffixed username, not the full path
    }
    
    // If username is not taken, it can be used as is.
    return username;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    toast({
      title: "Sign up failed",
      description: message,
      variant: "destructive"
    });
    return { success: false, error: { message } };
  }
};

// Handle sign out
export const handleSignOut = async () => {
  try {
    await getSupabaseClient().auth.signOut();
    toast({
      title: "Signed out",
      description: "You have been signed out successfully.",
    });
    return { success: true };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    toast({
      title: "Error signing out",
      description: message,
      variant: "destructive"
    });
    return { success: false, error: { message } };
  }
};
