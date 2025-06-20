import React from 'react';

// Define the global showDirectLoginModal function
interface Window {
  showDirectLoginModal: (event?: React.MouseEvent<Element, MouseEvent>) => void;
  
  // Auth state exposure for cross-browser fix scripts
  useOptimizedAuth: {
    getState: () => {
      session: any;
      user: any;
      loading: boolean;
      signOut: () => Promise<void>;
      fastPathEnabled: boolean;
      lastFastPathResult: any;
    };
  };
  
  authContext: {
    user: any;
    session: any;
    loading: boolean;
    signOut: () => Promise<void>;
  };
} 