/**
 * Modal State Management Hook
 * 
 * Modern React hook for managing modal state,
 * replacing legacy window-based global functions.
 */

import { useContext } from 'react';
import { ModalContext } from '../ModalProvider';
import type { ModalConfig } from '../types/modal';

/**
 * Hook for managing modals
 * Provides clean API to replace window.showDirectLoginModal etc.
 */
export const useModal = () => {
  const context = useContext(ModalContext);
  if (context === undefined) {
    throw new Error('useModal must be used within a ModalProvider');
  }

  const { modals, openModal, closeModal, isModalOpen, closeAllModals } = context;

  // For backward compatibility with components expecting array format
  const modalArray = Array.from(modals.values());

  // For AuthModalRouter compatibility - provide Map format
  const modalEntries = modals;

  return {
    // Legacy array format for backward compatibility
    modals: modalArray,
    
    // Map format for new components
    modalEntries,
    
    // Modal operations
    openModal,
    closeModal,
    isModalOpen,
    closeAllModals,
    
    // Auth-specific convenience functions (replace legacy window functions)
    openLoginModal: () => {
      // Update URL to reflect modal state
      if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
        window.history.pushState(null, '', '/login');
      }
      return openModal('auth-login', null, { title: 'Log in to Lokaa', size: 'sm' });
    },
    openSignupModal: () => {
      // Update URL to reflect modal state
      if (typeof window !== 'undefined' && window.location.pathname !== '/signup') {
        window.history.pushState(null, '', '/signup');
      }
      return openModal('auth-signup', null, { title: 'Create your Lokaa account', size: 'sm' });
    },
    openForgotPasswordModal: () => {
      // Update URL to reflect modal state
      if (typeof window !== 'undefined' && window.location.pathname !== '/forgot-password') {
        window.history.pushState(null, '', '/forgot-password');
      }
      return openModal('auth-forgot', null, { title: 'Reset Password', size: 'sm' });
    },
    closeLoginModal: () => {
      // Reset URL back to home when closing auth modal
      if (typeof window !== 'undefined' && window.location.pathname === '/login') {
        window.history.pushState(null, '', '/');
      }
      return closeModal('auth-login');
    },
    closeSignupModal: () => {
      // Reset URL back to home when closing auth modal
      if (typeof window !== 'undefined' && window.location.pathname === '/signup') {
        window.history.pushState(null, '', '/');
      }
      return closeModal('auth-signup');
    },
    closeForgotPasswordModal: () => {
      // Reset URL back to home when closing auth modal
      if (typeof window !== 'undefined' && window.location.pathname === '/forgot-password') {
        window.history.pushState(null, '', '/');
      }
      return closeModal('auth-forgot');
    },
    
    // Modal state checks
    isLoginModalOpen: () => isModalOpen('auth-login'),
    isSignupModalOpen: () => isModalOpen('auth-signup'),
    isForgotPasswordModalOpen: () => isModalOpen('auth-forgot')
  };
};

/**
 * Hook for modal stack management
 * Handles z-index and focus management for multiple modals
 */
export const useModalStack = () => {
  const { modals, openModal, closeModal } = useModal();
  
  const getModalStack = () => {
    return Array.from(modals.values()).filter(modal => modal.isOpen);
  };
  
  const getTopModal = () => {
    const stack = getModalStack();
    return stack.length > 0 ? stack[stack.length - 1] : null;
  };

  const closeTopModal = () => {
    const topModal = getTopModal();
    if (topModal) {
      closeModal(topModal.config.id);
    }
  };

  const closeAllModals = () => {
    const stack = getModalStack();
    stack.forEach(modal => closeModal(modal.config.id));
  };

  const isAnyModalOpen = () => {
    return getModalStack().length > 0;
  };

  return {
    modals,
    modalStack: getModalStack(),
    topModal: getTopModal(),
    openModal,
    closeModal,
    closeTopModal,
    closeAllModals,
    isAnyModalOpen,
    stackSize: getModalStack().length,
  };
}; 