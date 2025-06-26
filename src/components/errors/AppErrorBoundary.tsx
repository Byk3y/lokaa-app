import React, { useEffect } from 'react';
import { ErrorBoundary } from 'react-error-boundary';

// Mobile detection utility - centralized
export const isMobileBrowser = () => {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
};

// HMR Error Recovery System - REMOVED EXPORT to fix Fast Refresh compatibility
const initializeHMRErrorRecovery = () => {
  if (import.meta.env?.DEV && typeof window !== 'undefined') {
    const originalError = window.onerror;
    window.onerror = (message, source, lineno, colno, error) => {
      if (typeof message === 'string' && message.includes('Importing a module script failed')) {
        if (isMobileBrowser()) {
          console.warn('🔄 [HMR Fix] Module import failed on mobile browser - likely network blocking, ignoring');
          console.warn('📱 [HMR Fix] Mobile browsers block network requests during app backgrounding');
          console.warn('🔧 [HMR Fix] This is NOT an actual HMR error - recovery disabled on mobile');
          return true;
        }
        
        console.warn('🔄 [HMR Fix] Module import failed detected on desktop, attempting recovery...');
        setTimeout(() => {
          console.log('🔄 [HMR Fix] Reloading to recover from module import failure');
          console.log("🛡️ [AppErrorBoundary] Reload disabled by bulletproof protection");        }, 1000);
        return true;
      }
      
      if (originalError) {
        return originalError(message, source, lineno, colno, error);
      }
      return false;
    };
    
    window.addEventListener('unhandledrejection', (event) => {
      if (event.reason?.message?.includes('Importing a module script failed')) {
        if (isMobileBrowser()) {
          console.warn('🔄 [HMR Fix] Async module import failed on mobile browser - likely network blocking, ignoring');
          console.warn('📱 [HMR Fix] Mobile browsers block network requests during app backgrounding');
          console.warn('🔧 [HMR Fix] This is NOT an actual HMR error - recovery disabled on mobile');
          event.preventDefault();
          return;
        }
        
        console.warn('🔄 [HMR Fix] Async module import failed on desktop, attempting recovery...');
        event.preventDefault();
        setTimeout(() => {
          console.log('🔄 [HMR Fix] Reloading to recover from async import failure');
          console.log("🛡️ [AppErrorBoundary] Reload disabled by bulletproof protection");        }, 1000);
      }
    });
    
    if (isMobileBrowser()) {
      console.log('🔧 [HMR Fix] Mobile-aware module import error recovery installed (reload disabled on mobile)');
    } else {
      console.log('🔧 [HMR Fix] Desktop module import error recovery installed');
    }
  }
};

// Error boundary fallback component
function ErrorFallback({ error, resetErrorBoundary }: { error: Error; resetErrorBoundary: () => void }) {
  console.error('🚨 React Error Boundary caught error:', error);
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-8">
      <div className="bg-white p-8 rounded-lg shadow-lg max-w-2xl w-full">
        <h2 className="text-2xl font-bold text-red-600 mb-4">Application Error</h2>
        <p className="text-gray-700 mb-4">
          Something went wrong. This error has been logged for debugging.
        </p>
        <details className="mb-4">
          <summary className="cursor-pointer text-blue-600 hover:text-blue-800">
            Show Error Details
          </summary>
          <div className="mt-2 p-4 bg-gray-100 rounded text-sm font-mono">
            <div className="text-red-600 font-bold">Error: {error.message}</div>
            <div className="mt-2 text-gray-600 whitespace-pre-wrap">{error.stack}</div>
          </div>
        </details>
        <div className="flex gap-4">
          <button 
            onClick={resetErrorBoundary}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Try Again
          </button>
          <button 
            onClick={() => console.log("🛡️ [ErrorFallback] Reload disabled by bulletproof protection")}
            className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
          >
            Reload Page
          </button>
        </div>
      </div>
    </div>
  );
}

// Module Error Recovery Component
const ModuleErrorFallback = ({ error, resetErrorBoundary }: { error: Error; resetErrorBoundary: () => void }) => {
  const isModuleError = error.message?.includes('Importing a module script failed') || 
                       error.message?.includes('Loading chunk') ||
                       error.name === 'ChunkLoadError';

  if (!isModuleError) {
    throw error;
  }

  if (isMobileBrowser()) {
    console.warn('🔄 [ModuleErrorFallback] Module error on mobile browser - likely network blocking');
    console.warn('📱 [ModuleErrorFallback] Mobile browsers block network requests during app backgrounding');
    console.warn('🔧 [ModuleErrorFallback] Auto-recovering without showing error screen...');
    
    setTimeout(() => {
      console.log('🔄 [ModuleErrorFallback] Auto-recovering from mobile network blocking...');
      resetErrorBoundary();
    }, 500);
    
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full text-center">
          <div className="text-blue-500 text-6xl mb-4">🔄</div>
          <h2 className="text-xl font-bold text-gray-800 mb-4">Reconnecting...</h2>
          <p className="text-gray-600 mb-4">
            Restoring connection after background activity.
          </p>
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
          <p className="text-xs text-gray-400 mt-4">
            This happens when mobile browsers pause network activity.
          </p>
        </div>
      </div>
    );
  }

  console.error('🚨 [ModuleErrorFallback] Caught module import error on desktop:', error);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full text-center">
        <div className="text-orange-500 text-6xl mb-4">🔄</div>
        <h2 className="text-xl font-bold text-gray-800 mb-4">Development Module Error</h2>
        <p className="text-gray-600 mb-4">
          A module failed to load during development. This is usually caused by HMR (Hot Module Replacement) issues.
        </p>
        <div className="bg-blue-50 border border-blue-200 rounded p-3 mb-6">
          <p className="text-sm text-blue-800">
            <strong>Quick Fix:</strong> This often resolves automatically. Try the options below.
          </p>
        </div>
        <div className="flex gap-3 justify-center mb-4">
          <button 
            onClick={() => {
              console.log('🔄 [ModuleErrorFallback] Attempting recovery...');
              resetErrorBoundary();
            }}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
          >
            🔄 Try Again
          </button>
          <button 
            onClick={() => {
              console.log('🔄 [ModuleErrorFallback] Hard reload...');
          console.log("🛡️ [AppErrorBoundary] Reload disabled by bulletproof protection");            }}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            ↻ Reload Page
          </button>
        </div>
        {import.meta.env?.DEV && (
          <details className="text-left">
            <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-700 mb-2">
              🔧 Technical Details
            </summary>
            <div className="bg-gray-100 p-3 rounded text-xs">
              <div><strong>Error:</strong> {error.message}</div>
              <div><strong>Type:</strong> {error.name}</div>
              <div><strong>Time:</strong> {new Date().toLocaleTimeString()}</div>
              <div><strong>Browser:</strong> Desktop (showing full error screen)</div>
            </div>
          </details>
        )}
        <p className="text-xs text-gray-400 mt-4">
          This error boundary only catches module loading issues during development.
        </p>
      </div>
    </div>
  );
};

// Main AppErrorBoundary component
interface AppErrorBoundaryProps {
  children: React.ReactNode;
}

export default function AppErrorBoundary({ children }: AppErrorBoundaryProps) {
  useEffect(() => {
    initializeHMRErrorRecovery();
  }, []);

  return (
    <ErrorBoundary
      FallbackComponent={({ error, resetErrorBoundary }: any) => {
        const isModuleError = (
          error.message?.includes('Importing a module script failed') ||
          error.message?.includes('Loading chunk') ||
          error.name === 'ChunkLoadError'
        );

        if (isModuleError) {
          return <ModuleErrorFallback error={error} resetErrorBoundary={resetErrorBoundary} />;
        }

        return <ErrorFallback error={error} resetErrorBoundary={resetErrorBoundary} />;
      }}
      onError={(error, errorInfo) => {
        console.error('🚨 [AppErrorBoundary] Error Boundary caught:', error, errorInfo);
        
        if (error.message?.includes('Importing a module script failed')) {
          console.error('🚨 [AppErrorBoundary] Module import failure detected - this is likely an HMR issue');
        }
      }}
      onReset={() => {
        console.log('🔄 [AppErrorBoundary] Error boundary reset');
        console.log('🛡️ [AppErrorBoundary] Reload protection active - not triggering any reloads');
        
        // DISABLED: All reload mechanisms are disabled due to bulletproof protection
        // The bulletproof protection system handles all reload scenarios
        return;
      }}
    >
      {children}
    </ErrorBoundary>
  );
} 