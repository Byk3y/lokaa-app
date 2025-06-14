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
import StandaloneLoginModal from '@/components/auth/StandaloneLoginModal';
import BaseModal from '@/shared/components/modals/BaseModal';

export default function AuthModalRouter() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useOptimizedAuth();
  const { modalEntries, closeModal: originalCloseModal } = useModal();

  // SMART close handler that navigates back to home for auth routes
  const handleAuthModalClose = useCallback((modalId: string) => {
    originalCloseModal(modalId);
    
    // If we're on an auth route, navigate back to home
    const currentPath = location.pathname;
    if (currentPath === '/login' || currentPath === '/signup' || currentPath === '/forgot-password') {
      navigate('/');
    }
  }, [originalCloseModal, location.pathname, navigate]);

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
          <StandaloneLoginModal
            disableBackdrop={true}
            onClose={() => handleAuthModalClose('auth-login')}
          />
        );
        config = {
          ...config,
          size: 'sm',
          closable: true,
          backdrop: true,
          className: 'p-0 border-none shadow-none bg-transparent [&>div:first-child]:hidden'
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
            onError={(error) => {
              // Keep modal open to show error
            }}
          />
        );
        config = {
          ...config,
          title: 'Reset Password',
          size: 'sm'
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