// Extend global window interface to include our modal functions
interface Window {
  showDirectLoginModal: (event?: React.MouseEvent) => void;
  showDirectSignupModal: (event?: React.MouseEvent) => void;
  showDirectForgotPasswordModal: (event?: React.MouseEvent) => void;
}

interface ValidationHooks {
  validateData: (type: string, data: any) => Promise<{
    isValid: boolean;
    errors: Record<string, string[]>;
  }>;
}

declare global {
  interface Window {
    __lokaa_validation_hooks?: ValidationHooks;
  }
} 