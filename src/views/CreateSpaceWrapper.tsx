import { log } from '@/utils/logger';
import { useState, useEffect } from 'react';
import { getSupabaseClient } from '@/integrations/supabase/client';
import CreateYourSpace from './CreateYourSpace';
import LoadingIndicator from '@/components/LoadingIndicator';
import { toast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { checkActiveSession, redirectToLogin } from '@/utils/directAuth';

/**
 * A simple wrapper that checks authentication and shows login modal if needed
 * Does not use React Router to avoid navigation issues
 */
export default function CreateSpaceWrapper() {
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authCheckAttempted, setAuthCheckAttempted] = useState(false);
  const navigate = useNavigate();
  
  useEffect(() => {
    // Set a maximum timeout to prevent infinite loading
    const timeoutId = setTimeout(() => {
      if (loading && !authCheckAttempted) {
        log.debug('Page', "Authentication check timeout - redirecting to login");
        setLoading(false);
        
        // Store redirect path and redirect to login
        sessionStorage.setItem('redirect_after_login', '/create-space');
        
        // Check for session tokens in localStorage before showing error
        const hasSupabaseToken = Object.keys(localStorage).some(key => 
          key.startsWith('sb-') && key.includes('auth.token')
        );
        
        if (hasSupabaseToken) {
          log.debug('Page', "Found auth token but verification timed out, attempting fallback auth check");
          // Try a faster, direct check if we have a token
          checkActiveSession()
            .then(isActive => {
              if (isActive) {
                log.debug('Page', "Fallback check successful, continuing to create space");
                setLoading(false);
                setIsAuthenticated(true);
                return;
              }
              handleAuthFailure();
            })
            .catch(() => handleAuthFailure());
        } else {
          handleAuthFailure();
        }
      }
    }, 15000); // Increased timeout from 5 seconds to 15 seconds
    
    // Direct auth check using the utility function
    const verifyAuthentication = async () => {
      try {
        log.debug('Page', "Checking authentication for Create Space");
        setAuthCheckAttempted(true);
        
        // Use the utility function to check for active session
        const isLoggedIn = await checkActiveSession();
        
        if (!isLoggedIn) {
          log.debug('Page', "No active session detected");
          handleAuthFailure();
          return;
        }
        
        // If we reach here, user is authenticated
        log.debug('Page', "User is authenticated, showing create space form");
        setLoading(false);
        setIsAuthenticated(true);
      } catch (err) {
        log.error('Page', "Authentication check failed:", err);
        handleAuthFailure();
      }
    };
    
    const handleAuthFailure = () => {
      setLoading(false);
      setIsAuthenticated(false);
      
      // Store the redirect path for after login
      sessionStorage.setItem('redirect_after_login', '/create-space');
      
      // Use direct login if available or redirect to login page
      if (typeof window.showDirectLoginModal === 'function') {
        window.showDirectLoginModal();
      } else {
        navigate('/login');
        toast({
          title: "Session Expired",
          description: "Please sign in to continue.",
          variant: "destructive",
        });
      }
    };
    
    verifyAuthentication();
    
    return () => clearTimeout(timeoutId);
  }, [navigate, loading, authCheckAttempted]);
  
  if (loading) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-gray-50">
        <div className="text-center">
          <LoadingIndicator size="large" nonBlocking={false} />
          <p className="mt-4 text-gray-600">Verifying your session...</p>
          <p className="mt-2 text-sm text-gray-500">
            If this takes too long, <button 
              onClick={() => navigate('/login')} 
              className="text-teal-600 hover:underline"
            >click here</button> to log in again.
          </p>
        </div>
      </div>
    );
  }
  
  // Show CreateSpace only when authenticated
  if (!isAuthenticated) {
    // Return a placeholder that will be replaced by the auth modal
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-gray-600">Please sign in to create a space</p>
          <button
            className="mt-4 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-md transition-colors"
            onClick={() => navigate('/login')}
          >
            Sign In
          </button>
        </div>
      </div>
    );
  }
  
  return <CreateYourSpace />;
} 