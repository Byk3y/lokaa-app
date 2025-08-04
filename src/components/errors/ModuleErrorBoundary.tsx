import { log } from '@/utils/logger';
/**
 * Module Error Boundary - Handles Module Import Failures
 * 
 * Specifically designed to catch and recover from:
 * - "Importing a module script failed" errors
 * - Chunk loading errors during HMR
 * - Network failures during lazy loading
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  retryCount: number;
}

export class ModuleErrorBoundary extends Component<Props, State> {
  private retryTimeoutId: NodeJS.Timeout | null = null;
  
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    // Check if this is a module import error
    const isModuleError = (
      error.message?.includes('Importing a module script failed') ||
      error.message?.includes('Loading chunk') ||
      error.message?.includes('Failed to fetch') ||
      error.name === 'ChunkLoadError'
    );

    if (isModuleError) {
      return {
        hasError: true,
        error
      };
    }

    // For other errors, let them bubble up
    throw error;
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({
      error,
      errorInfo
    });

    // Log the error
    log.error('Component', '🚨 [ModuleErrorBoundary] Caught module import error:', error, errorInfo);
    
    // Call custom error handler if provided
    this.props.onError?.(error, errorInfo);
    
    // Auto-retry for development
    if (import.meta.env?.DEV && this.state.retryCount < 2) {
      log.debug('Component', `🔄 [ModuleErrorBoundary] Auto-retrying in 2 seconds... (attempt ${this.state.retryCount + 1})`);
      
      this.retryTimeoutId = setTimeout(() => {
        this.handleRetry();
      }, 2000);
    }
  }

  componentWillUnmount() {
    if (this.retryTimeoutId) {
      clearTimeout(this.retryTimeoutId);
    }
  }

  handleRetry = () => {
    this.setState(prevState => ({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: prevState.retryCount + 1
    }));
  };

  handleReload = () => {
    window.location.reload();
  };

  handleGoBack = () => {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      window.location.href = '/';
    }
  };

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full text-center">
            <div className="text-red-500 text-6xl mb-4">⚠️</div>
            
            <h2 className="text-xl font-bold text-gray-800 mb-4">
              {import.meta.env?.DEV ? 'Development Module Error' : 'Loading Error'}
            </h2>
            
            <p className="text-gray-600 mb-4">
              {import.meta.env?.DEV 
                ? 'A module failed to load during development. This is usually caused by HMR (Hot Module Replacement) issues.'
                : 'We encountered an issue loading part of the application. Please try refreshing the page.'
              }
            </p>
            
            {import.meta.env?.DEV && (
              <div className="bg-yellow-50 border border-yellow-200 rounded p-3 mb-6">
                <p className="text-sm text-yellow-800">
                  <strong>Quick Fix:</strong> This often resolves automatically. Try the options below.
                </p>
              </div>
            )}
            
            <div className="flex gap-3 justify-center mb-4">
              <button 
                onClick={this.handleRetry}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
                disabled={this.state.retryCount >= 3}
              >
                🔄 Retry {this.state.retryCount > 0 && `(${this.state.retryCount}/3)`}
              </button>
              
              <button 
                onClick={this.handleReload}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
              >
                ↻ Reload Page
              </button>
              
              <button 
                onClick={this.handleGoBack}
                className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
              >
                ← Go Back
              </button>
            </div>
            
            {import.meta.env?.DEV && (
              <details className="text-left">
                <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-700 mb-2">
                  🔧 Debug Information
                </summary>
                <div className="bg-gray-100 p-3 rounded text-xs">
                  <div className="mb-2">
                    <strong>Error:</strong> {this.state.error?.message}
                  </div>
                  <div className="mb-2">
                    <strong>Type:</strong> {this.state.error?.name}
                  </div>
                  <div className="mb-2">
                    <strong>Retry Count:</strong> {this.state.retryCount}
                  </div>
                  {this.state.errorInfo && (
                    <div>
                      <strong>Component Stack:</strong>
                      <pre className="mt-1 whitespace-pre-wrap text-xs">
                        {this.state.errorInfo.componentStack}
                      </pre>
                    </div>
                  )}
                </div>
              </details>
            )}
            
            {import.meta.env?.DEV && (
              <p className="text-xs text-gray-400 mt-4">
                If this keeps happening, try restarting your development server.
              </p>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * HOC to wrap components with module error boundary
 */
export function withModuleErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  fallback?: ReactNode
) {
  const WrappedComponent = (props: P) => (
    <ModuleErrorBoundary fallback={fallback}>
      <Component {...props} />
    </ModuleErrorBoundary>
  );
  
  WrappedComponent.displayName = `withModuleErrorBoundary(${Component.displayName || Component.name})`;
  
  return WrappedComponent;
}

export default ModuleErrorBoundary; 