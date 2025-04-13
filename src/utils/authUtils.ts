
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

// Fetch user details from the users table
export const fetchUserDetails = async (userId: string | undefined) => {
  if (!userId) return null;

  try {
    const { data, error } = await supabase
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
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    
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
  } catch (error: any) {
    toast({
      title: "Sign in failed",
      description: error.message,
      variant: "destructive"
    });
    return { success: false, error };
  }
};

// Handle sign up with email, password, username and optional full name
export const handleSignUp = async (email: string, password: string, username: string, fullName?: string) => {
  try {
    // First check if username is available
    const { data: existingUser } = await supabase
      .from('users')
      .select('username')
      .eq('username', username)
      .single();
      
    if (existingUser) {
      toast({
        title: "Username taken",
        description: "This username is already in use. Please choose another one.",
        variant: "destructive"
      });
      return { success: false, error: { message: "Username is already taken" } };
    }
    
    const { error } = await supabase.auth.signUp({ 
      email, 
      password,
      options: {
        data: {
          username: username,
          full_name: fullName || username
        }
      }
    });
    
    if (error) {
      toast({
        title: "Sign up failed",
        description: error.message,
        variant: "destructive"
      });
      return { success: false, error };
    }
    
    toast({
      title: "Account created",
      description: "Welcome to Lokaa! Please verify your email if required.",
    });
    
    return { success: true };
  } catch (error: any) {
    toast({
      title: "Sign up failed",
      description: error.message,
      variant: "destructive"
    });
    return { success: false, error };
  }
};

// Handle sign out
export const handleSignOut = async () => {
  try {
    await supabase.auth.signOut();
    toast({
      title: "Signed out",
      description: "You have been signed out successfully.",
    });
    return { success: true };
  } catch (error: any) {
    toast({
      title: "Error signing out",
      description: error.message,
      variant: "destructive"
    });
    return { success: false, error };
  }
};
