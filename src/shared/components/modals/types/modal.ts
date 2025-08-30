/**
 * Modal System Types
 * 
 * Modern TypeScript interfaces for the modal system,
 * replacing legacy window-based global functions.
 */

import React from 'react';

// Modal configuration interface
export interface ModalConfig {
  id: string;
  title?: string;
  closable?: boolean;
  backdrop?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  position?: 'center' | 'top';
  className?: string;
  email?: string; // Add support for passing email to verification modal
}

// Modal content props
export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  config?: Partial<ModalConfig>;
  children?: React.ReactNode;
}

// Modal state management
export interface ModalState {
  isOpen: boolean;
  config: ModalConfig;
  content?: React.ReactNode;
}

// Modal context interface
export interface ModalContextType {
  modals: Map<string, ModalState>;
  openModal: (id: string, content: React.ReactNode, config?: Partial<ModalConfig>) => void;
  closeModal: (id: string) => void;
  closeAllModals: () => void;
  isModalOpen: (id: string) => boolean;
}

// Auth modal specific types
export interface AuthModalProps {
  onSuccess?: (data?: any) => void;
  onError?: (error: string) => void;
  redirectTo?: string;
}

// Login form data
export interface LoginFormData {
  email: string;
  password: string;
}

// Signup form data
export interface SignupFormData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
}

// Forgot password form data
export interface ForgotPasswordFormData {
  email: string;
}

// Modal animation states
export type ModalAnimationState = 'entering' | 'entered' | 'exiting' | 'exited';

// Modal stack management
export interface ModalStackItem {
  id: string;
  zIndex: number;
  config: ModalConfig;
} 