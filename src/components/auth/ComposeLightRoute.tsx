import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import React from "react";
import ComposeLightPostPage from "@/pages/ComposeLightPostPage";

/**
 * ComposeLightRoute is a simplified route guard specifically for the ComposePostPage
 * It doesn't show any loading states or verification screens, making transitions smoother
 * It only guards against non-authenticated users
 */
export default function ComposeLightRoute() {
  const { user } = useAuth();
  const location = useLocation();

  // If not authenticated, redirect to login
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Immediately render the lightweight compose page without waiting for other checks
  return <ComposeLightPostPage />;
} 