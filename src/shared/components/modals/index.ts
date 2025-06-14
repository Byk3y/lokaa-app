/**
 * Modern Modal System Exports
 * 
 * Clean exports for the new React-based modal system,
 * replacing legacy window-based modal functions.
 */

// Core modal components
export { default as ModalProvider } from './ModalProvider';
export { default as BaseModal } from './BaseModal';

// Modal hooks
export { useModal, useModalStack } from './hooks/useModal';

// Modal types
export type {
  ModalConfig,
  ModalProps,
  ModalState,
  ModalContextType,
  AuthModalProps,
  LoginFormData,
  SignupFormData,
  ForgotPasswordFormData,
  ModalAnimationState,
  ModalStackItem
} from './types/modal';

// Legacy bridge functions (temporary during migration)
export {
  modalBridge,
  setupGlobalBridge,
  removeGlobalBridge,
  isModernModalSystemReady
} from './legacy-bridge'; 