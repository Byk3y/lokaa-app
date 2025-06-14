/**
 * Robust Lazy Loader - Handles HMR and Module Import Failures
 * 
 * This utility provides enhanced lazy loading with:
 * - Retry logic for failed imports
 * - Graceful fallbacks for chunk loading errors  
 * - HMR-aware error recovery
 * - Development vs production optimizations
 */

import { lazy, ComponentType } from 'react';

interface RobustLazyOptions {
  retries?: number;
  retryDelay?: number;
  componentName?: string;
  fallbackComponent?: ComponentType<any>;
}

/**
 * Creates a robust lazy-loaded component with error handling
 */
export function createRobustLazy<T extends ComponentType<any>>(
  importFunc: () => Promise<{ default: T }>,
  options: RobustLazyOptions = {}
): T {
  const {
    retries = 3,
    retryDelay = 100,
    componentName = 'Component',
    fallbackComponent
  } = options;

  return lazy(() => {
    let attempt = 0;
    
    const attemptImport = async (): Promise<{ default: T }> => {
      try {
        // Clear any stale module cache in development
        if (import.meta.env?.DEV && attempt > 0) {
          // Force cache invalidation by adding timestamp
          const timestamp = Date.now();
          if (typeof window !== 'undefined') {
            (window as any).__vite_plugin_react_preamble_installed__ = false;
          }
        }
        
        const module = await importFunc();
        
        // Validate the module
        if (!module || !module.default) {
          throw new Error(`Invalid module: ${componentName} - no default export`);
        }
        
        return module;
        
      } catch (error: any) {
        attempt++;
        
        // Log detailed error info in development
        if (import.meta.env?.DEV) {
          console.warn(`🔄 [RobustLazy] Import failed for ${componentName} (attempt ${attempt}/${retries}):`, {
            error: error.message,
            stack: error.stack,
            attempt,
            isChunkError: error.message?.includes('Loading chunk'),
            isNetworkError: error.message?.includes('Failed to fetch'),
            isModuleError: error.message?.includes('Importing a module script failed')
          });
        }
        
        // Check if this is a recoverable error
        const isRecoverableError = (
          error.message?.includes('Loading chunk') ||
          error.message?.includes('Failed to fetch') ||
          error.message?.includes('Importing a module script failed') ||
          error.message?.includes('ChunkLoadError') ||
          error.name === 'ChunkLoadError'
        );
        
        // Retry logic
        if (attempt < retries && isRecoverableError) {
          // Progressive delay: 100ms, 200ms, 400ms, etc.
          const delay = retryDelay * Math.pow(2, attempt - 1);
          await new Promise(resolve => setTimeout(resolve, delay));
          
          // For HMR issues, try to force a clean reload
          if (import.meta.env?.DEV && attempt === 2) {
            console.warn(`🔄 [RobustLazy] Forcing HMR refresh for ${componentName}`);
            if (typeof window !== 'undefined' && (window as any).__vite_reload) {
              setTimeout(() => (window as any).__vite_reload(), delay);
            }
          }
          
          return attemptImport();
        }
        
        // All retries failed - provide fallback
        console.error(`❌ [RobustLazy] Failed to load ${componentName} after ${retries} attempts. Providing fallback.`, error);
        
        // Use custom fallback if provided
        if (fallbackComponent) {
          return { default: fallbackComponent };
        }
        
        // Default error fallback component
        const ErrorFallback = (() => (
          <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full text-center">
              <div className="text-red-500 text-6xl mb-4">⚠️</div>
              <h2 className="text-xl font-bold text-gray-800 mb-4">
                Component Loading Error
              </h2>
              <p className="text-gray-600 mb-4">
                Failed to load <strong>{componentName}</strong>
              </p>
              <p className="text-sm text-gray-500 mb-6">
                This is usually a temporary issue during development.
              </p>
              <div className="flex gap-3 justify-center">
                <button 
                  onClick={() => window.location.reload()}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                >
                  🔄 Reload Page
                </button>
                <button 
                  onClick={() => window.history.back()}
                  className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
                >
                  ← Go Back
                </button>
              </div>
              {import.meta.env?.DEV && (
                <details className="mt-4 text-left">
                  <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-700">
                    🔧 Debug Info
                  </summary>
                  <pre className="mt-2 p-2 bg-gray-100 text-xs rounded overflow-auto">
                    {JSON.stringify({
                      component: componentName,
                      attempts: attempt,
                      lastError: error.message,
                      userAgent: navigator.userAgent,
                      timestamp: new Date().toISOString()
                    }, null, 2)}
                  </pre>
                </details>
              )}
            </div>
          </div>
        )) as T;
        
        return { default: ErrorFallback };
      }
    };
    
    return attemptImport();
  });
}

/**
 * Development-specific error recovery utilities
 */
export const devUtils = {
  /**
   * Clear Vite's module cache to force fresh imports
   */
  clearModuleCache: () => {
    if (import.meta.env?.DEV && typeof window !== 'undefined') {
      // Clear Vite's import cache
      if ((window as any).__vite_plugin_react_preamble_installed__) {
        (window as any).__vite_plugin_react_preamble_installed__ = false;
      }
      
      // Force HMR update if available
      if ((window as any).location) {
        (window as any).location.reload();
      }
    }
  },
  
  /**
   * Check if current error is likely HMR-related
   */
  isHMRError: (error: Error): boolean => {
    const hmrPatterns = [
      'Loading chunk',
      'Failed to fetch',
      'Importing a module script failed',
      'ChunkLoadError',
      'Module parse failed',
      'Unexpected token'
    ];
    
    return hmrPatterns.some(pattern => 
      error.message?.includes(pattern) || error.name?.includes(pattern)
    );
  },
  
  /**
   * Get error recovery suggestions
   */
  getRecoverySuggestions: (error: Error): string[] => {
    const suggestions = ['Try refreshing the page'];
    
    if (devUtils.isHMRError(error)) {
      suggestions.push(
        'This appears to be an HMR reload issue',
        'Save the file you\'re editing to trigger a fresh reload',
        'Or restart the dev server with npm run dev'
      );
    }
    
    return suggestions;
  }
};

// Expose utilities in development
if (import.meta.env?.DEV && typeof window !== 'undefined') {
  (window as any).robustLazyDevUtils = devUtils;
} 