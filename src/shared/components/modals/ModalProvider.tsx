/**
 * Modal Provider Context
 * 
 * Modern React context for managing modal state,
 * replacing legacy window-based global functions.
 * 
 * FIXED: Optimized for React Fast Refresh compatibility
 */

import React, { createContext, useState, useCallback, useEffect, ReactNode, useMemo, useRef, useContext } from 'react';
import type { ModalContextType, ModalState, ModalConfig } from './types/modal';
import BaseModal from './BaseModal';
import { initializeModalBridge } from './legacy-bridge';

// FIXED: Create the modal context with proper typing for Fast Refresh
const ModalContext = createContext<ModalContextType | undefined>(undefined);

// FIXED: Export as const for Fast Refresh compatibility
export { ModalContext };

interface ModalProviderProps {
  children: ReactNode;
}

// FIXED: Default export as const function for Fast Refresh
const ModalProvider = ({ children }: ModalProviderProps) => {
  const [modals, setModals] = useState<Map<string, ModalState>>(new Map());
  const bridgeInitialized = useRef(false);

  // Open a modal
  const openModal = useCallback((
    id: string, 
    content: ReactNode, 
    config?: Partial<ModalConfig>
  ) => {
    const defaultConfig: ModalConfig = {
      id,
      title: '',
      closable: true,
      backdrop: true,
      size: 'md',
      position: 'center',
      ...config
    };

    setModals(prev => {
      const newModals = new Map(prev);
      newModals.set(id, {
        isOpen: true,
        config: defaultConfig,
        content
      });
      return newModals;
    });
  }, []);

  // Close a modal
  const closeModal = useCallback((id: string) => {
    setModals(prev => {
      const newModals = new Map(prev);
      const modal = newModals.get(id);
      if (modal) {
        newModals.set(id, { ...modal, isOpen: false });
        // Remove after animation completes
        setTimeout(() => {
          setModals(current => {
            const updated = new Map(current);
            updated.delete(id);
            return updated;
          });
        }, 300);
      }
      return newModals;
    });
  }, []);

  // Close all modals
  const closeAllModals = useCallback(() => {
    setModals(prev => {
      const newModals = new Map();
      // Close all modals with animation
      prev.forEach((modal, id) => {
        newModals.set(id, { ...modal, isOpen: false });
      });
      
      // Clear all modals after animation
      setTimeout(() => {
        setModals(new Map());
      }, 300);
      
      return newModals;
    });
  }, []);

  // Check if a modal is open
  const isModalOpen = useCallback((id: string): boolean => {
    const modal = modals.get(id);
    const isOpen = modal?.isOpen ?? false;
    return isOpen;
  }, [modals]);

  // Auth-specific convenience functions for bridge
  const openLoginModal = useCallback((config?: Partial<ModalConfig>) => {
    openModal('auth-login', null, {
      title: 'Log in to Lokaa',
      size: 'sm',
      ...config
    });
  }, [openModal]);

  const openSignupModal = useCallback((config?: Partial<ModalConfig>) => {
    openModal('auth-signup', null, {
      title: 'Create your Lokaa account', 
      size: 'sm',
      ...config
    });
  }, [openModal]);

  const openForgotPasswordModal = useCallback((config?: Partial<ModalConfig>) => {
    openModal('auth-forgot', null, {
      title: 'Reset Password',
      size: 'sm', 
      ...config
    });
  }, [openModal]);

  // FIXED: Memoize context value for stability
  const contextValue: ModalContextType = useMemo(() => ({
    modals,
    openModal,
    closeModal,
    closeAllModals,
    isModalOpen
  }), [modals, openModal, closeModal, closeAllModals, isModalOpen]);

  // FIXED: Memoize bridge context to prevent re-initialization
  const bridgeContext = useMemo(() => ({
    openLoginModal,
    openSignupModal,
    openForgotPasswordModal,
    closeModal,
    isModalOpen
  }), [openLoginModal, openSignupModal, openForgotPasswordModal, closeModal, isModalOpen]);

  // FIXED: Initialize legacy bridge only once when component mounts
  useEffect(() => {
    if (!bridgeInitialized.current) {
      initializeModalBridge(bridgeContext);
      bridgeInitialized.current = true;
    }
  }, []); // Empty dependency array - only run once

  // Handle escape key to close modals
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        // Find the top-most closable modal
        const openModals = Array.from(modals.entries())
          .filter(([, modal]) => modal.isOpen && modal.config.closable)
          .sort((a, b) => {
            // Sort by creation order (last opened is last in array)
            return 0;
          });

        if (openModals.length > 0) {
          const [topModalId] = openModals[openModals.length - 1];
          closeModal(topModalId);
        }
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [modals, closeModal]);

  // Handle body scroll when modals are open
  useEffect(() => {
    const hasOpenModals = Array.from(modals.values()).some(modal => modal.isOpen);
    
    if (hasOpenModals) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    // Cleanup on unmount
    return () => {
      document.body.style.overflow = '';
    };
  }, [modals]);

  return (
    <ModalContext.Provider value={contextValue}>
      {children}
      
      {/* Render all open modals except auth modals (handled by AuthModalRouter) */}
      {Array.from(modals.entries())
        .filter(([id]) => !id.startsWith('auth-'))
        .map(([id, modal]) => {
          if (!modal.isOpen) return null;
          
                      return (
              <BaseModal
                key={id}
                config={modal.config}
                isOpen={modal.isOpen}
                onClose={() => closeModal(id)}
              >
                {modal.content}
              </BaseModal>
            );
        })}
    </ModalContext.Provider>
  );
};

// FIXED: Export as default for compatibility
export default ModalProvider;

// React Fast Refresh compatible export
export const useModal = () => {
  const context = useContext(ModalContext);
  if (context === undefined) {
    throw new Error('useModal must be used within a ModalProvider');
  }
  return context;
}; 