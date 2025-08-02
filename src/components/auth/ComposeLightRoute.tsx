import { Navigate, useLocation } from "react-router-dom";
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';
import React from "react";
import ComposeLightPostPage from "@/views/ComposeLightPostPage";

/**
 * ComposeLightRoute is a simplified route guard specifically for the ComposePostPage
 * It doesn't show any loading states or verification screens, making transitions smoother
 * It only guards against non-authenticated users
 */
export default function ComposeLightRoute() {
  const { user } = useOptimizedAuth();
  const location = useLocation();

  // If not authenticated, redirect to login
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Immediately render the lightweight compose page without waiting for other checks
  return <ComposeLightPostPage />;
} 