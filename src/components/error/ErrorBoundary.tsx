/**
 * 🚨 Phase 4A: React Error Boundary Components
 * 
 * Comprehensive error boundaries for different app sections:
 * - Global application error boundary
 * - Space-specific error boundary  
 * - Component-level error boundary
 * - Network error boundary
 */

import React, { Component, ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, RefreshCw, Home, Bug, Send } from 'lucide-react';
import { errorTracker } from '@/utils/errorTrackingSystem';

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
  errorId: string | null;
  retryCount: number;
}

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo, errorId: string) => void;
  level: 'global' | 'space' | 'component' | 'network';
  identifier?: string;
  showErrorDetails?: boolean;
  maxRetries?: number;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private retryTimeout: NodeJS.Timeout | null = null;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
      retryCount: 0
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    const { level, identifier, onError } = this.props;
    
    // Capture error with tracking system
    const errorId = errorTracker.captureReactError(
      error,
      { componentStack: errorInfo.componentStack || '' },
      `${level}${identifier ? `-${identifier}` : ''}`
    );

    this.setState({
      errorInfo,
      errorId
    });

    // Call custom error handler if provided
    if (onError) {
      onError(error, errorInfo, errorId);
    }

    console.error(`🚨 [ErrorBoundary-${level}] Error caught:`, error, errorInfo);
  }

  handleRetry = () => {
    const { maxRetries = 3 } = this.props;
    
    if (this.state.retryCount >= maxRetries) {
      console.warn(`🚨 [ErrorBoundary] Max retries (${maxRetries}) reached`);
      return;
    }

    this.setState(prevState => ({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
      retryCount: prevState.retryCount + 1
    }));

    // Add a small delay before retry to prevent immediate re-error
    this.retryTimeout = setTimeout(() => {
      this.forceUpdate();
    }, 1000);
  };

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  handleReportError = () => {
    const { error, errorInfo, errorId } = this.state;
    if (!error || !errorId) return;

    // Force report the error even if auto-reporting is disabled
    errorTracker.captureError({
      message: `User-reported error: ${error.message}`,
      type: 'user',
      severity: { level: 'medium', priority: 2, autoReport: true },
      stack: error.stack,
      componentStack: errorInfo?.componentStack,
      errorBoundary: this.props.level
    });

    alert('Error report sent! Thank you for helping us improve the app.');
  };

  componentWillUnmount() {
    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout);
    }
  }

  private getErrorTitle(): string {
    const { level } = this.props;
    
    switch (level) {
      case 'global':
        return 'Application Error';
      case 'space':
        return 'Space Loading Error';
      case 'component':
        return 'Component Error';
      case 'network':
        return 'Network Error';
      default:
        return 'Something went wrong';
    }
  }

  private getErrorDescription(): string {
    const { level } = this.props;
    
    switch (level) {
      case 'global':
        return 'A critical error occurred that affected the entire application. Please try refreshing the page.';
      case 'space':
        return 'There was an error loading this space. The space data might be corrupted or temporarily unavailable.';
      case 'component':
        return 'A component failed to render properly. This might be a temporary issue.';
      case 'network':
        return 'A network error occurred while loading data. Please check your internet connection.';
      default:
        return 'An unexpected error occurred. Please try again.';
    }
  }

  private getSeverityBadge(): ReactNode {
    const { level } = this.props;
    
    const severityMap = {
      global: { variant: 'destructive' as const, label: 'CRITICAL' },
      space: { variant: 'default' as const, label: 'HIGH' },
      component: { variant: 'secondary' as const, label: 'MEDIUM' },
      network: { variant: 'outline' as const, label: 'LOW' }
    };

    const severity = severityMap[level] || severityMap.component;
    
    return (
      <Badge variant={severity.variant} className="ml-2">
        {severity.label}
      </Badge>
    );
  }

  private getActionButtons(): ReactNode {
    const { level, maxRetries = 3 } = this.props;
    const { retryCount } = this.state;
    const canRetry = retryCount < maxRetries;

    switch (level) {
      case 'global':
        return (
          <div className="space-x-2">
            <Button onClick={this.handleReload} variant="default">
              <RefreshCw className="h-4 w-4 mr-2" />
              Reload App
            </Button>
            <Button onClick={this.handleReportError} variant="outline">
              <Send className="h-4 w-4 mr-2" />
              Report Error
            </Button>
          </div>
        );
      
      case 'space':
        return (
          <div className="space-x-2">
            {canRetry && (
              <Button onClick={this.handleRetry} variant="default">
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry ({maxRetries - retryCount} left)
              </Button>
            )}
            <Button onClick={this.handleGoHome} variant="outline">
              <Home className="h-4 w-4 mr-2" />
              Go Home
            </Button>
            <Button onClick={this.handleReportError} variant="ghost" size="sm">
              <Bug className="h-4 w-4 mr-2" />
              Report
            </Button>
          </div>
        );
      
      case 'component':
      case 'network':
        return (
          <div className="space-x-2">
            {canRetry && (
              <Button onClick={this.handleRetry} variant="default" size="sm">
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry
              </Button>
            )}
            <Button onClick={this.handleReportError} variant="ghost" size="sm">
              <Bug className="h-4 w-4 mr-2" />
              Report
            </Button>
          </div>
        );
      
      default:
        return (
          <Button onClick={this.handleRetry} variant="default">
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
        );
    }
  }

  render() {
    const { hasError } = this.state;
    const { children, fallback, showErrorDetails = process.env.NODE_ENV === 'development' } = this.props;

    if (hasError) {
      // Use custom fallback if provided
      if (fallback) {
        return fallback;
      }

      // Default error UI
      return (
        <div className="flex items-center justify-center min-h-[200px] p-4">
          <Card className="w-full max-w-lg">
            <CardHeader>
              <CardTitle className="flex items-center text-destructive">
                <AlertTriangle className="h-5 w-5 mr-2" />
                {this.getErrorTitle()}
                {this.getSeverityBadge()}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                {this.getErrorDescription()}
              </p>

              {showErrorDetails && this.state.error && (
                <details className="text-sm">
                  <summary className="cursor-pointer font-medium mb-2">
                    Technical Details
                  </summary>
                  <div className="bg-muted p-3 rounded-md font-mono text-xs overflow-auto">
                    <div className="mb-2">
                      <strong>Error:</strong> {this.state.error.message}
                    </div>
                    <div className="mb-2">
                      <strong>Error ID:</strong> {this.state.errorId}
                    </div>
                    {this.state.error.stack && (
                      <div className="mb-2">
                        <strong>Stack:</strong>
                        <pre className="mt-1 whitespace-pre-wrap">
                          {this.state.error.stack}
                        </pre>
                      </div>
                    )}
                    {this.state.errorInfo?.componentStack && (
                      <div>
                        <strong>Component Stack:</strong>
                        <pre className="mt-1 whitespace-pre-wrap">
                          {this.state.errorInfo.componentStack}
                        </pre>
                      </div>
                    )}
                  </div>
                </details>
              )}

              <div className="flex justify-end">
                {this.getActionButtons()}
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return children;
  }
}

export default ErrorBoundary;

// Convenience components for different error boundary levels

export const GlobalErrorBoundary: React.FC<{
  children: ReactNode;
  onError?: ErrorBoundaryProps['onError'];
}> = ({ children, onError }) => (
  <ErrorBoundary level="global" onError={onError} showErrorDetails={true}>
    {children}
  </ErrorBoundary>
);

export const SpaceErrorBoundary: React.FC<{
  children: ReactNode;
  spaceId?: string;
  onError?: ErrorBoundaryProps['onError'];
}> = ({ children, spaceId, onError }) => (
  <ErrorBoundary 
    level="space" 
    identifier={spaceId}
    onError={onError}
    maxRetries={2}
  >
    {children}
  </ErrorBoundary>
);

export const ComponentErrorBoundary: React.FC<{
  children: ReactNode;
  componentName?: string;
  onError?: ErrorBoundaryProps['onError'];
}> = ({ children, componentName, onError }) => (
  <ErrorBoundary 
    level="component" 
    identifier={componentName}
    onError={onError}
    maxRetries={1}
    showErrorDetails={false}
  >
    {children}
  </ErrorBoundary>
);

export const NetworkErrorBoundary: React.FC<{
  children: ReactNode;
  onError?: ErrorBoundaryProps['onError'];
}> = ({ children, onError }) => (
  <ErrorBoundary 
    level="network" 
    onError={onError}
    maxRetries={3}
    showErrorDetails={false}
  >
    {children}
  </ErrorBoundary>
); 