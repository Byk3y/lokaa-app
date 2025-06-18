// App Components Service - extracted from App.tsx
// Consolidates utility components and higher-order components used in App.tsx

import React, { useEffect } from 'react';
import { useOptimizedAuth } from "@/contexts/AuthContext";
import { useUnifiedPresence } from '@/hooks/useUnifiedPresence';

// Higher-order component to safely handle auth context
export function withAuthSafety<P extends object>(
  Component: React.ComponentType<P>,
  componentName: string
) {
  return function SafeAuthComponent(props: P) {
    try {
      return <Component {...props} />;
    } catch (error) {
      if (error instanceof Error && error.message.includes('useOptimizedAuth must be used within an AuthProvider')) {
        console.warn(`🔒 [${componentName}] Auth context not ready yet, skipping render`);
        return null;
      }
      // Re-throw other errors
      throw error;
    }
  };
}

// Unified Presence Initializer - ensures global presence system is active
export const UnifiedPresenceInitializer = withAuthSafety(function UnifiedPresenceInitializer() {
  const { user } = useOptimizedAuth();
  const { isInitialized } = useUnifiedPresence();
  
  useEffect(() => {
    if (user?.id && isInitialized) {
      console.log('🌐 [UnifiedPresence] Global presence system initialized for user:', user.id);
    }
  }, [user?.id, isInitialized]);
  
  return null;
}, 'UnifiedPresenceInitializer');

// Simple loading screen component to prevent white screen
export function AppLoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50" style={{ minHeight: '100vh' }}>
      <div className="flex flex-col items-center">
        <div className="animate-spin h-8 w-8 rounded-full border-t-2 border-b-2 border-teal-500 mb-3"></div>
        <p className="text-gray-600 text-base font-medium">Loading Lokaa...</p>
        <p className="text-gray-400 text-sm mt-1">Setting up your workspace</p>
      </div>
    </div>
  );
} 