
import { createContext, useContext } from "react";
import { Session, User } from "@supabase/supabase-js";
import { useNavigate } from "react-router-dom";
import { handleSignIn, handleSignUp, handleSignOut } from "@/utils/authUtils";
import { useAuthState } from "@/hooks/useAuthState";

type AuthContextType = {
  session: Session | null;
  user: User | null;
  userDetails: any | null; // From our 'users' table
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, username: string, fullName?: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const { session, user, userDetails, loading, refreshProfile } = useAuthState();
  const navigate = useNavigate();

  const signIn = async (email: string, password: string) => {
    try {
      const { success } = await handleSignIn(email, password);
      if (success) {
        navigate('/dashboard');
      }
    } catch (error) {
      console.error("Error during sign in:", error);
    }
  };

  const signUp = async (email: string, password: string, username: string, fullName?: string) => {
    try {
      const { success } = await handleSignUp(email, password, username, fullName);
      if (success) {
        // Redirect new users to discover page instead of dashboard
        navigate('/discover');
      }
    } catch (error) {
      console.error("Error during sign up:", error);
    }
  };

  const signOut = async () => {
    const { success } = await handleSignOut();
    if (success) {
      navigate('/');
    }
  };

  return (
    <AuthContext.Provider value={{
      session,
      user,
      userDetails,
      loading,
      signIn,
      signUp,
      signOut,
      refreshProfile
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
