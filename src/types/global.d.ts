// Extend global window interface to include our modal functions
interface Window {
  showDirectLoginModal: (event?: React.MouseEvent) => void;
  showDirectSignupModal: (event?: React.MouseEvent) => void;
  showDirectForgotPasswordModal: (event?: React.MouseEvent) => void;
} 