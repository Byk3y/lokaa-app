// TEMPORARY FILE - To be completely removed in the next cleanup phase
// This contains minimal implementation to prevent app from breaking

import React from 'react';
import { Navigate } from 'react-router-dom';

// Temporary replacement that just redirects to the home page
export default function CommunityLayout() {
  return <Navigate to="/" replace />;
} 