import { log } from '@/utils/logger';
import React, { ErrorInfo, ReactNode } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

export default class WhiteScreenFix extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    log.error('Component', '🚨 [WhiteScreenFix] React Error Caught:', error);
    log.error('Component', '🚨 [WhiteScreenFix] Error Info:', errorInfo);
    this.setState({ errorInfo });
  }

  render() {
    if (this.state.hasError) {
      const isProduction = import.meta.env.PROD;
      const userFriendlyMessage = sanitizeErrorMessage(this.state.error, isProduction);
      
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
          <div className="max-w-md w-full">
            <Alert className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20">
              <AlertDescription className="text-red-800 dark:text-red-200">
                <h3 className="font-semibold mb-2">⚠️ Application Error</h3>
                <p className="mb-3">{userFriendlyMessage}</p>
                
                {/* Show technical details only in development */}
                {!isProduction && this.state.error?.message && (
                  <div className="bg-red-100 dark:bg-red-900/30 p-2 rounded text-xs mb-3 font-mono">
                    Technical details: {this.state.error.message}
                  </div>
                )}
                
                <div className="space-y-2">
                  <Button 
                    onClick={() => window.location.reload()} 
                    className="w-full bg-red-600 hover:bg-red-700 text-white"
                  >
                    🔄 Reload Page
                  </Button>
                  <Button 
                    onClick={() => window.location.href = '/app'} 
                    variant="outline"
                    className="w-full border-red-300 text-red-700 hover:bg-red-50 dark:border-red-700 dark:text-red-300"
                  >
                    🏠 Go to Home
                  </Button>
                  
                  {/* Show debug button only in development */}
                  {!isProduction && (
                    <Button 
                      onClick={() => {
                        log.debug('Component', '🔍 [Debug] Error details:', this.state.error);
                        log.debug('Component', '🔍 [Debug] Component stack:', this.state.errorInfo?.componentStack);
                      }} 
                      variant="ghost"
                      className="w-full text-gray-600 hover:bg-gray-100 dark:text-gray-400"
                    >
                      🔍 Log Debug Info
                    </Button>
                  )}
                </div>
              </AlertDescription>
            </Alert>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
} 