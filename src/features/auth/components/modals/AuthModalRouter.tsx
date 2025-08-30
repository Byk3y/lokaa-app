import { log } from '@/utils/logger';
/**
 * Auth Modal Router
 * 
 * Handles routing and content for auth modals,
 * integrating with the modern modal system.
 * 
 * FIXED: Enhanced debug logging and state management
 */

import React, { useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useOptimizedAuth } from '@/contexts/AuthContext';
import { useModal } from '@/shared/components/modals/hooks/useModal';
import SignupModal from './SignupModal';
import ForgotPasswordModal from './ForgotPasswordModal';
import LoginModalContent from './LoginModalContent';
import BaseModal from '@/shared/components/modals/BaseModal';
import EmailVerificationModal from './EmailVerificationModal';

export default function AuthModalRouter() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useOptimizedAuth();
  const { modalEntries, closeModal: originalCloseModal, closeLoginModal, closeSignupModal, closeForgotPasswordModal } = useModal();

  // SMART close handler that uses specific modal close functions for proper URL management
  const handleAuthModalClose = useCallback((modalId: string) => {
    // Use specific close functions that handle URL resetting
    if (modalId === 'auth-login') {
      closeLoginModal();
    } else if (modalId === 'auth-signup') {
      closeSignupModal();
    } else if (modalId === 'auth-forgot') {
      closeForgotPasswordModal();
    } else {
      // Fallback for any other modals
      originalCloseModal(modalId);
    }
    
    // No need for manual navigation since the specific close functions handle URL updates
  }, [closeLoginModal, closeSignupModal, closeForgotPasswordModal, originalCloseModal]);

  // Render auth modals with proper content
  const renderAuthModals = () => {
    const authModals = Array.from(modalEntries.entries())
      .filter(([id]) => String(id).startsWith('auth-'));

    return authModals.map(([id, modal]) => {
      if (!modal.isOpen) {
        return null;
      }

      // Determine content based on modal ID
      let content = modal.content;
      let config = modal.config;

      if (id === 'auth-login') {
        content = (
          <LoginModalContent
            onSuccess={() => handleAuthModalClose('auth-login')}
            onError={(error) => {
              // Keep modal open to show error
            }}
          />
        );
        config = {
          ...config,
          size: 'sm',
          closable: true,
          backdrop: true
        };
      } else if (id === 'auth-signup') {
        content = (
          <SignupModal
            onSuccess={(data) => {
              handleAuthModalClose('auth-signup');
            }}
            onError={(error) => {
              // Keep modal open to show error
            }}
          />
        );
        config = {
          ...config,
          title: 'Create your Lokaa account',
          size: 'sm'
        };
      } else if (id === 'auth-forgot') {
        content = (
          <ForgotPasswordModal
            onSuccess={() => {
              handleAuthModalClose('auth-forgot');
            }}
            onError={(error: string) => {
              // Keep modal open to show error
            }}
          />
        );
        config = {
          ...config,
          title: 'Reset Password',
          size: 'sm'
        };
      } else if (id === 'auth-verification') {
        content = (
          <EmailVerificationModal
            email={modal.config.email}
            onSuccess={() => {
              handleAuthModalClose('auth-verification');
            }}
            onError={(error: string) => {
              // Keep modal open to show error
            }}
          />
        );
        config = {
          ...config,
          size: 'sm',
          closable: true,
          backdrop: true
        };
      }

      return (
        <BaseModal
          key={id}
          isOpen={modal.isOpen}
          onClose={() => handleAuthModalClose(String(id))}
          config={config}
        >
          {content}
        </BaseModal>
      );
    });
  };

  // Single source of truth for auth modal rendering
  return (
    <>
      {renderAuthModals()}
    </>
  );
} 