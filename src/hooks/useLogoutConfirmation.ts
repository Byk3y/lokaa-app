import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOptimizedAuth } from '@/contexts/AuthContext';
import { signOut as enhancedSignOut } from '@/utils/auth/authActionsUtils';

interface UseLogoutConfirmationReturn {
  isLogoutModalOpen: boolean;
  isLoggingOut: boolean;
  showLogoutConfirmation: () => void;
  hideLogoutConfirmation: () => void;
  confirmLogout: () => Promise<void>;
}

export const useLogoutConfirmation = (): UseLogoutConfirmationReturn => {
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const navigate = useNavigate();
  const { signOut: authSignOut } = useOptimizedAuth();

  const showLogoutConfirmation = useCallback(() => {
    setIsLogoutModalOpen(true);
    // Close any open dropdowns/modals by dispatching a custom event
    window.dispatchEvent(new CustomEvent('close-dropdowns'));
  }, []);

  const hideLogoutConfirmation = useCallback(() => {
    setIsLogoutModalOpen(false);
  }, []);

  const confirmLogout = useCallback(async () => {
    setIsLoggingOut(true);
    
    try {
      // Use the enhanced signOut function from authActionsUtils
      await enhancedSignOut(navigate, {
        setUser: () => {}, // These will be handled by the auth context
        setSession: () => {},
        setUserDetails: () => {},
        setHasRouted: () => {},
        setEarlyRedirectAttempted: () => {},
        setRoutingInProgress: () => {},
        setAuthErrors: () => {},
      });
      
      // Also call the auth context signOut for consistency
      await authSignOut();
      
      hideLogoutConfirmation();
    } catch (error) {
      console.error('Logout failed:', error);
      // Even if there's an error, close the modal and try to redirect
      hideLogoutConfirmation();
      navigate('/', { replace: true });
    } finally {
      setIsLoggingOut(false);
    }
  }, [navigate, authSignOut, hideLogoutConfirmation]);

  return {
    isLogoutModalOpen,
    isLoggingOut,
    showLogoutConfirmation,
    hideLogoutConfirmation,
    confirmLogout,
  };
};
