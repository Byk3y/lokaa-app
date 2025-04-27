import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useCreatorStatus } from "../../hooks/useCreatorStatus";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function ProtectedRoute() {
  const { user, loading } = useAuth();
  const location = useLocation();
  const { data: creatorCommunity, isLoading: isLoadingCreator } = useCreatorStatus();
  const [authRetries, setAuthRetries] = useState(0);
  const [showRecoveryLink, setShowRecoveryLink] = useState(false);
  const { toast } = useToast();

  // Debug logging
  useEffect(() => {
    console.log('ProtectedRoute Debug:', {
      user: !!user,
      userId: user?.id,
      loading,
      creatorCommunity,
      isLoadingCreator,
      currentPath: location.pathname,
      authRetries
    });
  }, [user, loading, creatorCommunity, isLoadingCreator, location.pathname, authRetries]);

  // Handle long loading times
  useEffect(() => {
    let timeoutId: number;
    
    if (loading && authRetries < 2) {
      // Set a timeout to retry auth or show recovery options
      timeoutId = window.setTimeout(() => {
        console.log('Auth is taking too long, incrementing retry counter');
        setAuthRetries(prev => prev + 1);
      }, 5000); // 5 seconds
      
      return () => {
        window.clearTimeout(timeoutId);
      };
    }
    
    // If we've retried too many times, offer recovery options
    if (authRetries >= 2 && loading) {
      console.log('Auth is still loading after retries, showing recovery options');
      setShowRecoveryLink(true);
      
      toast({
        title: "Authentication is taking longer than expected",
        description: "We're having trouble verifying your login. Try the recovery options if this persists.",
        duration: 10000, // 10 seconds
        action: (
          <a 
            href="/fix" 
            className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-background bg-primary text-primary-foreground hover:bg-primary/90 h-10 py-2 px-4"
          >
            Fix Issues
          </a>
        ),
      });
    }
  }, [loading, authRetries, toast]);

  // If the user is not authenticated, redirect to login
  if (!user && !loading) {
    console.log('ProtectedRoute: User not authenticated, redirecting to login');
    return <Navigate to="/login" state={{ from: location, background: location }} replace />;
  }

  // Show loading state with recovery link if taking too long
  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
        <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full">
          <div className="flex items-center justify-center mb-4">
            <Loader2 className="h-8 w-8 animate-spin text-teal-600 mr-2" />
            <h2 className="text-xl font-semibold text-gray-800">
              Verifying your session...
            </h2>
          </div>
          <p className="text-gray-600 text-center mb-6">
            Please wait while we verify your authentication status.
          </p>
          
          {showRecoveryLink && (
            <div className="border-t border-gray-200 pt-4 mt-4 text-center">
              <p className="text-amber-600 mb-2">
                This is taking longer than expected.
              </p>
              <a 
                href="/fix" 
                className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-background bg-teal-600 text-white hover:bg-teal-700 h-10 py-2 px-4"
              >
                Access Recovery Tools
              </a>
            </div>
          )}
        </div>
      </div>
    );
  }

  // User is authenticated - allow access to protected routes
  return <Outlet />;
}
