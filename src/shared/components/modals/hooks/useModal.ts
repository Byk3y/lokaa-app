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
    openLoginModal: () => openModal('auth-login', false),
    openSignupModal: () => openModal('auth-signup', false),
    openForgotPasswordModal: () => openModal('auth-forgot', false),
    closeLoginModal: () => closeModal('auth-login'),
    closeSignupModal: () => closeModal('auth-signup'),
    closeForgotPasswordModal: () => closeModal('auth-forgot'),
    
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