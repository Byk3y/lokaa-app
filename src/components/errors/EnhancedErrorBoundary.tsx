import { log } from '@/utils/logger';
/**
 * 🛡️ Enhanced Error Boundary - Phase 4 Error Handling
 * 
 * Advanced error boundary that integrates with the ErrorHandlingSystem
 * Provides contextual error recovery, fallback strategies, and user-friendly error displays
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCw, Home, Zap, Bug } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { errorHandlingSystem, ErrorType, ErrorSeverity, type AppError } from '@/utils/errorHandlingSystem';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  context?: Record<string, any>;
  onError?: (error: AppError) => void;
  showRetryButton?: boolean;
  showDetailsButton?: boolean;
  showRecoveryOptions?: boolean;
  level?: 'page' | 'component' | 'critical';
}

interface State {
  hasError: boolean;
  error: AppError | null;
  retryCount: number;
  isRecovering: boolean;
  showDetails: boolean;
}

export class EnhancedErrorBoundary extends Component<Props, State> {
  private retryTimeoutId: NodeJS.Timeout | null = null;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      retryCount: 0,
      isRecovering: false,
      showDetails: false
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    log.error('Component', '🚨 [EnhancedErrorBoundary] Error caught:', error, errorInfo);

    // Classify the error using our error handling system
    const appError = errorHandlingSystem.classifyError(error, {
      ...this.props.context,
      component: 'ErrorBoundary',
      level: this.props.level || 'component',
      errorBoundary: true,
      errorInfo
    });

    // Log the error
    errorHandlingSystem.logError(appError);

    this.setState({
      error: appError
    });

    // Call optional error callback
    this.props.onError?.(appError);

    // For critical errors, attempt automatic recovery
    if (appError.severity === ErrorSeverity.CRITICAL) {
      this.attemptAutomaticRecovery();
    }
  }

  componentWillUnmount(): void {
    if (this.retryTimeoutId) {
      clearTimeout(this.retryTimeoutId);
    }
  }

  private attemptAutomaticRecovery = async (): Promise<void> => {
    const { error } = this.state;
    if (!error) return;

    this.setState({ isRecovering: true });

    try {
      const recovered = await errorHandlingSystem.attemptRecovery(error);
      
      if (recovered) {
        // Wait a moment then try to reset the boundary
        this.retryTimeoutId = setTimeout(() => {
          this.handleRetry();
        }, 1000);
      } else {
        this.setState({ isRecovering: false });
      }
    } catch (recoveryError) {
      log.error('Component', 'Recovery attempt failed:', recoveryError);
      this.setState({ isRecovering: false });
    }
  };

  private handleRetry = (): void => {
    log.debug('Component', '🔄 [EnhancedErrorBoundary] Retrying after error...');
    
    this.setState(prevState => ({
      hasError: false,
      error: null,
      retryCount: prevState.retryCount + 1,
      isRecovering: false,
      showDetails: false
    }));
  };

  private handleShowDetails = (): void => {
    this.setState(prevState => ({
      showDetails: !prevState.showDetails
    }));
  };

  private handleGoHome = (): void => {
    window.location.href = '/';
  };

  private handleReload = (): void => {
    window.location.reload();
  };

  private renderFallbackStrategy = (): ReactNode => {
    const { error } = this.state;
    if (!error) return null;

    const fallbackStrategy = errorHandlingSystem.getFallbackStrategy(error.type);
    
    if (fallbackStrategy) {
      switch (fallbackStrategy.type) {
        case 'redirect':
          return (
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
              <p className="text-sm text-blue-700">
                {fallbackStrategy.config.message || 'Redirecting to a safe location...'}
              </p>
              <Button 
                size="sm" 
                className="mt-2"
                onClick={() => window.location.href = fallbackStrategy.config.path || '/'}
              >
                Continue
              </Button>
            </div>
          );
        
        case 'cache':
          return (
            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
              <p className="text-sm text-yellow-700">
                Using cached data. Some information may be outdated.
              </p>
            </div>
          );
        
        case 'offline':
          return (
            <div className="mt-4 p-3 bg-gray-50 border border-gray-200 rounded-md">
              <p className="text-sm text-gray-700">
                You appear to be offline. Please check your internet connection.
              </p>
            </div>
          );
        
        default:
          return null;
      }
    }
    
    return null;
  };

  private renderErrorDetails = (): ReactNode => {
    const { error, showDetails } = this.state;
    if (!error || !showDetails) return null;

    return (
      <details className="mt-4 p-3 bg-gray-50 border border-gray-200 rounded-md">
        <summary className="cursor-pointer text-sm font-medium text-gray-700 hover:text-gray-900">
          Technical Details
        </summary>
        <div className="mt-3 space-y-2 text-xs font-mono">
          <div>
            <span className="font-semibold">Error ID:</span> {error.id}
          </div>
          <div>
            <span className="font-semibold">Type:</span> {error.type}
          </div>
          <div>
            <span className="font-semibold">Severity:</span> {error.severity}
          </div>
          <div>
            <span className="font-semibold">Message:</span> {error.message}
          </div>
          <div>
            <span className="font-semibold">Timestamp:</span> {new Date(error.timestamp).toLocaleString()}
          </div>
          {error.context && Object.keys(error.context).length > 0 && (
            <div>
              <span className="font-semibold">Context:</span>
              <pre className="mt-1 p-2 bg-gray-100 rounded text-xs overflow-auto">
                {JSON.stringify(error.context, null, 2)}
              </pre>
            </div>
          )}
          {error.stackTrace && (
            <div>
              <span className="font-semibold">Stack Trace:</span>
              <pre className="mt-1 p-2 bg-gray-100 rounded text-xs overflow-auto max-h-32">
                {error.stackTrace}
              </pre>
            </div>
          )}
        </div>
      </details>
    );
  };

  private getSeverityColor = (severity: ErrorSeverity): string => {
    switch (severity) {
      case ErrorSeverity.LOW:
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case ErrorSeverity.MEDIUM:
        return 'text-orange-600 bg-orange-50 border-orange-200';
      case ErrorSeverity.HIGH:
        return 'text-red-600 bg-red-50 border-red-200';
      case ErrorSeverity.CRITICAL:
        return 'text-red-700 bg-red-100 border-red-300';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  private getSeverityIcon = (severity: ErrorSeverity): React.ComponentType<{ className?: string }> => {
    switch (severity) {
      case ErrorSeverity.LOW:
        return AlertCircle;
      case ErrorSeverity.MEDIUM:
        return AlertCircle;
      case ErrorSeverity.HIGH:
        return Bug;
      case ErrorSeverity.CRITICAL:
        return Zap;
      default:
        return AlertCircle;
    }
  };

  render(): ReactNode {
    const { 
      hasError, 
      error, 
      retryCount, 
      isRecovering 
    } = this.state;
    
    const { 
      children, 
      fallback, 
      showRetryButton = true,
      showDetailsButton = true,
      showRecoveryOptions = true,
      level = 'component'
    } = this.props;

    if (hasError && error) {
      // Use custom fallback if provided
      if (fallback) {
        return fallback;
      }

      const severityColor = this.getSeverityColor(error.severity);
      const SeverityIcon = this.getSeverityIcon(error.severity);

      // For page-level errors, render full-screen error
      if (level === 'page' || level === 'critical') {
        return (
          <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
            <div className="max-w-lg w-full">
              <Alert className={`${severityColor} border`}>
                <SeverityIcon className="h-5 w-5" />
                <AlertDescription>
                  <div className="space-y-4">
                    <div>
                      <h3 className="font-semibold text-lg">
                        {error.severity === ErrorSeverity.CRITICAL ? 'Critical Error' : 'Application Error'}
                      </h3>
                      <p className="mt-1">{error.userMessage}</p>
                      {retryCount > 0 && (
                        <p className="mt-1 text-sm opacity-75">
                          Retry attempt: {retryCount}
                        </p>
                      )}
                    </div>

                    {isRecovering && (
                      <div className="flex items-center space-x-2 text-sm">
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        <span>Attempting automatic recovery...</span>
                      </div>
                    )}

                    {showRecoveryOptions && this.renderFallbackStrategy()}

                    <div className="flex flex-wrap gap-3">
                      {showRetryButton && !isRecovering && (
                        <Button onClick={this.handleRetry} size="sm">
                          <RefreshCw className="h-4 w-4 mr-2" />
                          Try Again
                        </Button>
                      )}
                      <Button onClick={this.handleGoHome} variant="outline" size="sm">
                        <Home className="h-4 w-4 mr-2" />
                        Go Home
                      </Button>
                      <Button onClick={this.handleReload} variant="outline" size="sm">
                        Reload Page
                      </Button>
                      {showDetailsButton && (
                        <Button 
                          onClick={this.handleShowDetails} 
                          variant="ghost" 
                          size="sm"
                        >
                          {this.state.showDetails ? 'Hide' : 'Show'} Details
                        </Button>
                      )}
                    </div>

                    {this.renderErrorDetails()}
                  </div>
                </AlertDescription>
              </Alert>
            </div>
          </div>
        );
      }

      // For component-level errors, render inline error
      return (
        <Alert className={`${severityColor} border my-4`}>
          <SeverityIcon className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-3">
              <div>
                <p className="font-medium">{error.userMessage}</p>
                {retryCount > 0 && (
                  <p className="text-sm opacity-75 mt-1">Retry attempt: {retryCount}</p>
                )}
              </div>

              {isRecovering && (
                <div className="flex items-center space-x-2 text-sm">
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span>Recovering...</span>
                </div>
              )}

              {showRecoveryOptions && this.renderFallbackStrategy()}

              <div className="flex flex-wrap gap-2">
                {showRetryButton && !isRecovering && (
                  <Button onClick={this.handleRetry} size="sm" variant="outline">
                    <RefreshCw className="h-4 w-4 mr-1" />
                    Retry
                  </Button>
                )}
                {showDetailsButton && (
                  <Button 
                    onClick={this.handleShowDetails} 
                    size="sm" 
                    variant="ghost"
                  >
                    Details
                  </Button>
                )}
              </div>

              {this.renderErrorDetails()}
            </div>
          </AlertDescription>
        </Alert>
      );
    }

    return children;
  }
}

export default EnhancedErrorBoundary; 