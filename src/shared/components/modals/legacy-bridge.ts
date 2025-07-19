import { log } from '@/utils/logger';
/**
 * Legacy Modal Bridge Functions
 * 
 * Maintains backward compatibility during migration from legacy
 * window-based modal functions to modern React component system.
 * 
 * These functions will be removed after complete migration.
 */

// Store modal context reference for bridge functions
let modalContext: any = null;

/**
 * Initialize the bridge with modal context
 */
export function initializeModalBridge(context: any) {
  modalContext = context;
  setupGlobalBridge();
  log.debug('Component', "Modal bridge initialized successfully");
}

/**
 * Bridge function to replace window.showDirectLoginModal
 * Maintains exact same signature as legacy function
 */
export function showDirectLoginModal(event?: React.MouseEvent) {
  log.debug('Component', "Bridge: showDirectLoginModal called");
  
  // Prevent any event bubbling (legacy behavior)
  if (event) {
    event.preventDefault();
    event.stopPropagation();
  }

  // Use the modern modal system
  if (modalContext) {
    modalContext.openLoginModal();
  } else {
    log.error('Component', "Modal bridge not initialized - modal context not available");
  }
}

/**
 * Bridge function to replace window.showDirectSignupModal
 * Maintains exact same signature as legacy function
 */
export function showDirectSignupModal(event?: React.MouseEvent) {
  log.debug('Component', "Bridge: showDirectSignupModal called");
  
  // Prevent any event bubbling (legacy behavior)
  if (event) {
    event.preventDefault();
    event.stopPropagation();
  }

  // Use the modern modal system
  if (modalContext) {
    modalContext.openSignupModal();
  } else {
    log.error('Component', "Modal bridge not initialized - modal context not available");
  }
}

/**
 * Bridge function to replace window.showDirectForgotPasswordModal
 * Maintains exact same signature as legacy function
 */
export function showDirectForgotPasswordModal(event?: React.MouseEvent) {
  log.debug('Component', "Bridge: showDirectForgotPasswordModal called");
  
  // Prevent any event bubbling (legacy behavior)
  if (event) {
    event.preventDefault();
    event.stopPropagation();
  }

  // Use the modern modal system
  if (modalContext) {
    modalContext.openForgotPasswordModal();
  } else {
    log.error('Component', "Modal bridge not initialized - modal context not available");
  }
}

/**
 * Setup global bridge functions on window object
 * Replaces the legacy window attachments temporarily
 */
export function setupGlobalBridge() {
  if (typeof window !== 'undefined') {
    // Replace with bridge functions
    (window as any).showDirectLoginModal = showDirectLoginModal;
    (window as any).showDirectSignupModal = showDirectSignupModal;
    (window as any).showDirectForgotPasswordModal = showDirectForgotPasswordModal;

    log.debug('Component', "Modal bridge functions attached to window object");
  }
}

/**
 * Remove global bridge functions (cleanup)
 * Called when legacy migration is complete
 */
export function removeGlobalBridge() {
  if (typeof window !== 'undefined') {
    delete (window as any).showDirectLoginModal;
    delete (window as any).showDirectSignupModal;
    delete (window as any).showDirectForgotPasswordModal;
    
    log.debug('Component', "Modal bridge functions removed from window object");
  }
}

/**
 * Check if modern modal system is available
 */
export function isModernModalSystemReady(): boolean {
  return modalContext !== null;
}

// Export the bridge functions for direct use
export const modalBridge = {
  initializeModalBridge,
  showDirectLoginModal,
  showDirectSignupModal,
  showDirectForgotPasswordModal,
  setupGlobalBridge,
  removeGlobalBridge,
  isModernModalSystemReady
}; 