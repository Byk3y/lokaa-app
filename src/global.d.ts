import React from 'react';

// Define the global showDirectLoginModal function
interface Window {
  showDirectLoginModal: (event?: React.MouseEvent<Element, MouseEvent>) => void;
} 