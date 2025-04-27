import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('Error caught by ErrorBoundary:', error, errorInfo);
    this.setState({
      error,
      errorInfo,
    });
  }

  render(): ReactNode {
    const { hasError, error, errorInfo } = this.state;
    const { children, fallback } = this.props;

    if (hasError) {
      if (fallback) {
        return fallback;
      }

      return (
        <div className="p-4 bg-red-50 border border-red-200 rounded-md">
          <h2 className="text-lg font-semibold text-red-700 mb-2">Something went wrong</h2>
          <details className="whitespace-pre-wrap text-sm text-red-600">
            <summary className="cursor-pointer font-medium">Show error details</summary>
            <p className="mt-2">{error?.message}</p>
            <pre className="mt-2 p-2 bg-red-100 overflow-auto rounded text-xs">
              {error?.stack}
            </pre>
            {errorInfo && (
              <pre className="mt-2 p-2 bg-red-100 overflow-auto rounded text-xs">
                {errorInfo.componentStack}
              </pre>
            )}
          </details>
        </div>
      );
    }

    return children;
  }
}

export default ErrorBoundary; 