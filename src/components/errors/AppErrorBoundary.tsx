import { log } from '@/utils/logger';
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
          log.warn('Component', '🔄 [HMR Fix] Module import failed on mobile browser - likely network blocking, ignoring');
          log.warn('Component', '📱 [HMR Fix] Mobile browsers block network requests during app backgrounding');
          log.warn('Component', '🔧 [HMR Fix] This is NOT an actual HMR error - recovery disabled on mobile');
          return true;
        }
        
        log.warn('Component', '🔄 [HMR Fix] Module import failed detected on desktop, attempting recovery...');
        setTimeout(() => {
          log.debug('Component', '🔄 [HMR Fix] Reloading to recover from module import failure');
          log.debug('Component', "🛡️ [AppErrorBoundary] Reload disabled by bulletproof protection");        }, 1000);
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
          log.warn('Component', '🔄 [HMR Fix] Async module import failed on mobile browser - likely network blocking, ignoring');
          log.warn('Component', '📱 [HMR Fix] Mobile browsers block network requests during app backgrounding');
          log.warn('Component', '🔧 [HMR Fix] This is NOT an actual HMR error - recovery disabled on mobile');
          event.preventDefault();
          return;
        }
        
        log.warn('Component', '🔄 [HMR Fix] Async module import failed on desktop, attempting recovery...');
        event.preventDefault();
        setTimeout(() => {
          log.debug('Component', '🔄 [HMR Fix] Reloading to recover from async import failure');
          log.debug('Component', "🛡️ [AppErrorBoundary] Reload disabled by bulletproof protection");        }, 1000);
      }
    });
    
    if (isMobileBrowser()) {
      log.debug('Component', '🔧 [HMR Fix] Mobile-aware module import error recovery installed (reload disabled on mobile)');
    } else {
      log.debug('Component', '🔧 [HMR Fix] Desktop module import error recovery installed');
    }
  }
};

// Error boundary fallback component
function ErrorFallback({ error, resetErrorBoundary }: { error: Error; resetErrorBoundary: () => void }) {
  log.error('Component', '🚨 React Error Boundary caught error:', error);
  
  const isProduction = import.meta.env.PROD;
  const userFriendlyMessage = sanitizeErrorMessage(error, isProduction);
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-8">
      <div className="bg-white p-8 rounded-lg shadow-lg max-w-2xl w-full">
        <h2 className="text-2xl font-bold text-red-600 mb-4">Application Error</h2>
        <p className="text-gray-700 mb-4">
          {userFriendlyMessage}
        </p>
        
        {/* Show technical details only in development */}
        {!isProduction && (
          <details className="mb-4">
            <summary className="cursor-pointer text-blue-600 hover:text-blue-800">
              Show Error Details (Development Only)
            </summary>
            <div className="mt-2 p-4 bg-gray-100 rounded text-sm font-mono">
              <div className="text-red-600 font-bold">Error: {error.message}</div>
              <div className="mt-2 text-gray-600 whitespace-pre-wrap">{error.stack}</div>
            </div>
          </details>
        )}
        
        <div className="flex gap-4">
          <button 
            onClick={resetErrorBoundary}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Try Again
          </button>
          <button 
            onClick={() => log.debug('Component', "🛡️ [ErrorFallback] Reload disabled by bulletproof protection")}
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

  const isProduction = !import.meta.env?.DEV;
  const isMobile = isMobileBrowser();

  // PRODUCTION: Silent recovery without showing error screens
  if (isProduction) {
    log.debug('Component', '🔧 [ModuleErrorFallback] Production module error - silent recovery');
    
    // Multi-attempt recovery strategy for production
    const retryAttempts = [100, 500, 1500]; // Progressive delays
    
    retryAttempts.forEach((delay, index) => {
      setTimeout(() => {
        log.debug('Component', `🔄 [ModuleErrorFallback] Silent recovery attempt ${index + 1}`);
        try {
          resetErrorBoundary();
        } catch (retryError) {
          log.warn('Component', `🔄 Recovery attempt ${index + 1} failed:`, retryError);
          
          // If all retries fail, force page reload as last resort
          if (index === retryAttempts.length - 1) {
            log.warn('Component', '🔄 All recovery attempts failed, forcing page reload');
            setTimeout(() => {
              window.location.reload();
            }, 1000);
          }
        }
      }, delay);
    });
    
    // Show minimal loading state instead of error screen
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center">
          <div className="animate-spin h-8 w-8 rounded-full border-t-2 border-b-2 border-blue-500 mb-3"></div>
          <p className="text-gray-600 text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  // DEVELOPMENT: Show detailed error screens for debugging
  if (isMobile) {
    log.warn('Component', '🔄 [ModuleErrorFallback] Module error on mobile browser - likely network blocking');
    log.warn('Component', '📱 [ModuleErrorFallback] Mobile browsers block network requests during app backgrounding');
    log.warn('Component', '🔧 [ModuleErrorFallback] Auto-recovering without showing error screen...');
    
    setTimeout(() => {
      log.debug('Component', '🔄 [ModuleErrorFallback] Auto-recovering from mobile network blocking...');
      resetErrorBoundary();
    }, 500);
    
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full text-center">
          <div className="text-blue-500 text-6xl mb-4">🔄</div>
          <h2 className="text-xl font-bold text-gray-800 mb-4">Development: Mobile Network Issue</h2>
          <p className="text-gray-600 mb-4">
            Mobile browser network blocking detected in development.
          </p>
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
          <p className="text-xs text-gray-400 mt-4">
            This screen only appears in development mode.
          </p>
        </div>
      </div>
    );
  }

  log.error('Component', '🚨 [ModuleErrorFallback] Caught module import error on desktop:', error);

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
              log.debug('Component', '🔄 [ModuleErrorFallback] Attempting recovery...');
              resetErrorBoundary();
            }}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
          >
            🔄 Try Again
          </button>
          <button 
            onClick={() => {
              log.debug('Component', '🔄 [ModuleErrorFallback] Hard reload...');
          log.debug('Component', "🛡️ [AppErrorBoundary] Reload disabled by bulletproof protection");            }}
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
        log.error('Component', '🚨 [AppErrorBoundary] Error Boundary caught:', error, errorInfo);
        
        if (error.message?.includes('Importing a module script failed')) {
          log.error('Component', '🚨 [AppErrorBoundary] Module import failure detected - this is likely an HMR issue');
        }
      }}
      onReset={() => {
        log.debug('Component', '🔄 [AppErrorBoundary] Error boundary reset');
        log.debug('Component', '🛡️ [AppErrorBoundary] Reload protection active - not triggering any reloads');
        
        // DISABLED: All reload mechanisms are disabled due to bulletproof protection
        // The bulletproof protection system handles all reload scenarios
        return;
      }}
    >
      {children}
    </ErrorBoundary>
  );
} 