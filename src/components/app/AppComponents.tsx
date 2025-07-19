import { log } from '@/utils/logger';
// App Components Service - extracted from App.tsx
// Consolidates utility components and higher-order components used in App.tsx

import React, { useEffect } from 'react';
import { useOptimizedAuth } from "@/contexts/AuthContext";
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
        log.warn('Component', `🔒 [${componentName}] Auth context not ready yet, skipping render`);
        return null;
      }
      // Re-throw other errors
      throw error;
    }
  };
}

// Simple Presence Initializer - no complex initialization needed with new system
export const UnifiedPresenceInitializer = withAuthSafety(function UnifiedPresenceInitializer() {
  const { user } = useOptimizedAuth();
  
  useEffect(() => {
    if (user?.id) {
      log.debug('Component', '🌐 [SimplePresence] User authenticated for presence system:', user.id);
    }
  }, [user?.id]);
  
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