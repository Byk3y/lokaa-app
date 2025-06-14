/**
 * 📱 Mobile Enhanced Loading Screen - Phase 1
 * 
 * Advanced loading screen for mobile with recovery detection and user feedback.
 */

import React, { useState, useEffect } from 'react';
import { Loader2, RefreshCw, AlertTriangle, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useMobileLifecycle } from '@/hooks/useMobileLifecycle';

interface MobileEnhancedLoadingScreenProps {
  message?: string;
  submessage?: string;
  showProgress?: boolean;
  onManualRefresh?: () => void;
  onRetryRecovery?: () => void;
  className?: string;
}

export const MobileEnhancedLoadingScreen: React.FC<MobileEnhancedLoadingScreenProps> = ({
  message = "Loading your space",
  submessage = "Please wait while we prepare everything for you",
  showProgress = false,
  onManualRefresh,
  onRetryRecovery,
  className = ""
}) => {
  const {
    returnedFromBackground,
    backgroundDuration,
    isRecovering,
    needsRecovery,
    loadingStuckDuration,
    triggerRecovery,
    resetRecoveryState
  } = useMobileLifecycle();

  const [progress, setProgress] = useState(0);
  const [loadingStartTime] = useState(Date.now());
  const [currentLoadingTime, setCurrentLoadingTime] = useState(0);

  // Update loading time every second
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentLoadingTime(Date.now() - loadingStartTime);
    }, 1000);

    return () => clearInterval(interval);
  }, [loadingStartTime]);

  // Auto-trigger recovery for mobile background returns that are stuck
  useEffect(() => {
    if (returnedFromBackground && currentLoadingTime > 12000 && !isRecovering && !needsRecovery) {
      console.log('📱 [MobileEnhancedLoadingScreen] Auto-triggering recovery for stuck background return');
      triggerRecovery();
    }
  }, [returnedFromBackground, currentLoadingTime, isRecovering, needsRecovery, triggerRecovery]);

  // Auto-trigger recovery for any loading that's stuck too long
  useEffect(() => {
    if (currentLoadingTime > 20000 && !isRecovering && !needsRecovery) {
      console.log('📱 [MobileEnhancedLoadingScreen] Auto-triggering recovery for general stuck loading');
      triggerRecovery();
    }
  }, [currentLoadingTime, isRecovering, needsRecovery, triggerRecovery]);

  // Animate progress bar
  useEffect(() => {
    if (!showProgress) return;

    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 90) return prev; // Don't reach 100% until actually complete
        return prev + Math.random() * 5;
      });
    }, 200);

    return () => clearInterval(interval);
  }, [showProgress]);

  // Determine if we should show recovery options
  const shouldShowRecoveryOptions = (
    returnedFromBackground && 
    currentLoadingTime > 8000
  ) || needsRecovery || loadingStuckDuration > 10000;

  const isLikelyStuck = currentLoadingTime > 15000;

  const handleManualRefresh = () => {
    resetRecoveryState();
    if (onManualRefresh) {
      onManualRefresh();
    } else {
      window.location.reload();
    }
  };

  const handleRetryRecovery = () => {
    if (onRetryRecovery) {
      onRetryRecovery();
    } else {
      triggerRecovery();
    }
  };

  const getStatusMessage = () => {
    if (isRecovering) {
      return {
        main: "Recovering your session",
        sub: "Restoring your last active space..."
      };
    }

    if (returnedFromBackground) {
      return {
        main: "Welcome back!",
        sub: `Resuming after ${Math.round(backgroundDuration / 1000)}s away...`
      };
    }

    if (shouldShowRecoveryOptions) {
      return {
        main: "Having trouble loading?",
        sub: "We can help you get back to your space"
      };
    }

    return {
      main: message,
      sub: submessage
    };
  };

  const status = getStatusMessage();

  return (
    <div className={`min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex flex-col items-center justify-center p-6 ${className}`}>
      <div className="w-full max-w-md mx-auto text-center space-y-6">
        
        {/* Icon and Animation */}
        <div className="relative">
          {isRecovering ? (
            <div className="relative">
              <Smartphone className="w-16 h-16 text-blue-500 mx-auto animate-pulse" />
              <RefreshCw className="w-6 h-6 text-blue-400 absolute -top-1 -right-1 animate-spin" />
            </div>
          ) : shouldShowRecoveryOptions ? (
            <AlertTriangle className="w-16 h-16 text-amber-500 mx-auto animate-bounce" />
          ) : (
            <div className="relative">
              <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full mx-auto flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-white animate-spin" />
              </div>
              {returnedFromBackground && (
                <div className="absolute -inset-2 bg-blue-200 rounded-full animate-ping opacity-75" />
              )}
            </div>
          )}
        </div>

        {/* Status Message */}
        <div className="space-y-2">
          <h2 className="text-xl font-semibold text-gray-800">
            {status.main}
          </h2>
          <p className="text-gray-600 text-sm">
            {status.sub}
          </p>
        </div>

        {/* Progress Bar */}
        {showProgress && !shouldShowRecoveryOptions && (
          <div className="w-full space-y-2">
            <Progress value={progress} className="w-full h-2" />
            <p className="text-xs text-gray-500">
              {Math.round(progress)}% complete
            </p>
          </div>
        )}

        {/* Background Return Indicator */}
        {returnedFromBackground && !shouldShowRecoveryOptions && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center space-x-2">
              <Smartphone className="w-4 h-4 text-blue-500" />
              <span className="text-sm text-blue-700">
                Detected return from background - optimizing loading...
              </span>
            </div>
          </div>
        )}

        {/* Loading Time Indicator */}
        {currentLoadingTime > 5000 && !shouldShowRecoveryOptions && (
          <div className="text-xs text-gray-500">
            Loading for {Math.round(currentLoadingTime / 1000)}s...
          </div>
        )}

        {/* Recovery Options */}
        {shouldShowRecoveryOptions && (
          <div className="space-y-4 pt-4">
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <div className="text-sm text-amber-700 mb-3">
                {isLikelyStuck 
                  ? "The app seems to be stuck. Let's try to fix this."
                  : "We noticed you returned from another app. Let's help you get back quickly."
                }
              </div>
              
              <div className="space-y-3">
                {!isRecovering && (
                  <Button 
                    onClick={handleRetryRecovery}
                    variant="default"
                    size="sm"
                    className="w-full bg-blue-500 hover:bg-blue-600"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Smart Recovery
                  </Button>
                )}
                
                <Button 
                  onClick={handleManualRefresh}
                  variant="outline"
                  size="sm"
                  className="w-full"
                  disabled={isRecovering}
                >
                  <Loader2 className="w-4 h-4 mr-2" />
                  Refresh Page
                </Button>
              </div>
            </div>

            {/* Technical Details for Development */}
            {process.env.NODE_ENV === 'development' && (
              <details className="text-xs text-gray-500 border border-gray-200 rounded p-2">
                <summary className="cursor-pointer">Debug Info</summary>
                <div className="mt-2 space-y-1">
                  <div>Loading Time: {Math.round(currentLoadingTime / 1000)}s</div>
                  <div>Background Duration: {Math.round(backgroundDuration / 1000)}s</div>
                  <div>Stuck Duration: {Math.round(loadingStuckDuration / 1000)}s</div>
                  <div>Needs Recovery: {needsRecovery ? 'Yes' : 'No'}</div>
                  <div>Is Recovering: {isRecovering ? 'Yes' : 'No'}</div>
                </div>
              </details>
            )}
          </div>
        )}

        {/* Loading Animation Dots */}
        {!shouldShowRecoveryOptions && (
          <div className="flex justify-center space-x-1">
            <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        )}
      </div>
    </div>
  );
};

export default MobileEnhancedLoadingScreen; 