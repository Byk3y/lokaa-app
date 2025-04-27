import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import LoadingIndicator from './LoadingIndicator';
import { checkActiveSession } from '../utils/directAuth';
import { useAuth } from '../contexts/AuthContext';

interface CreateSpaceWrapperProps {
  children: React.ReactNode;
}

const CreateSpaceWrapper: React.FC<CreateSpaceWrapperProps> = ({ children }) => {
  const navigate = useNavigate();
  const { session, user } = useAuth();
  const [isChecking, setIsChecking] = useState(true);
  const [authCheckAttempted, setAuthCheckAttempted] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      setIsChecking(true);
      
      // Set a timeout to prevent infinite loading
      const authTimeout = setTimeout(() => {
        console.log('⚠️ Authentication check timed out');
        handleAuthFailure();
      }, 3000);
      
      try {
        // First check context for session/user
        if (session && user) {
          console.log('✅ User authenticated via context');
          clearTimeout(authTimeout);
          setIsChecking(false);
          return;
        }
        
        // As a fallback, check for an active session directly
        const hasActiveSession = await checkActiveSession();
        clearTimeout(authTimeout);
        
        if (hasActiveSession) {
          console.log('✅ User authenticated via direct session check');
          setIsChecking(false);
        } else {
          console.log('❌ No active session found');
          handleAuthFailure();
        }
      } catch (error) {
        clearTimeout(authTimeout);
        console.error('❌ Error checking authentication', error);
        handleAuthFailure();
      }
    };
    
    const handleAuthFailure = () => {
      console.log('🔑 Redirecting to login from create space');
      setIsChecking(false);
      setAuthCheckAttempted(true);
      
      // Store the current path to redirect back after login
      sessionStorage.setItem('redirect_after_login', window.location.pathname);
      
      // Navigate to login
      navigate('/login', { state: { from: window.location.pathname } });
    };
    
    checkAuth();
  }, [navigate, session, user]);

  if (isChecking) {
    return (
      <div className="flex justify-center items-center h-screen">
        <LoadingIndicator size="large" nonBlocking={false} />
      </div>
    );
  }
  
  // If we've checked authentication and no session is found,
  // but for some reason navigation hasn't happened yet,
  // show a message rather than infinite loading
  if (authCheckAttempted && (!session && !user)) {
    return (
      <div className="flex flex-col justify-center items-center h-screen">
        <p className="text-gray-700 mb-4">Authentication required</p>
        <button 
          className="bg-teal-600 hover:bg-teal-700 text-white font-bold py-2 px-4 rounded"
          onClick={() => navigate('/login')}
        >
          Sign In
        </button>
      </div>
    );
  }

  return <>{children}</>;
};

export default CreateSpaceWrapper; 