/**
 * 🌐 Network Status Indicator - Phase 4 Error Handling
 * 
 * Monitors network connectivity and displays status to users
 * Integrates with the error handling system for network-related issues
 */

import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { errorHandlingSystem, ErrorType } from '@/utils/errorHandlingSystem';

interface NetworkStatusIndicatorProps {
  showWhenOnline?: boolean;
  position?: 'top' | 'bottom';
  className?: string;
}

type NetworkStatus = 'online' | 'offline' | 'slow' | 'reconnecting';

const NetworkStatusIndicator: React.FC<NetworkStatusIndicatorProps> = ({
  showWhenOnline = false,
  position = 'top',
  className = ''
}) => {
  const [status, setStatus] = useState<NetworkStatus>('online');
  const [lastOnlineTime, setLastOnlineTime] = useState<number>(Date.now());
  const [reconnectAttempts, setReconnectAttempts] = useState(0);

  useEffect(() => {
    // Initialize status based on current connectivity
    setStatus(navigator.onLine ? 'online' : 'offline');

    const handleOnline = () => {
      const wasOffline = status === 'offline';
      setStatus('online');
      setLastOnlineTime(Date.now());
      setReconnectAttempts(0);

      if (wasOffline) {
        toast({
          title: "Connection Restored",
          description: "You're back online!",
          variant: "default",
          duration: 3000
        });
      }
    };

    const handleOffline = () => {
      setStatus('offline');
      
      // Log network error
      const networkError = errorHandlingSystem.classifyError(
        new Error('Network connection lost'),
        {
          component: 'NetworkStatusIndicator',
          type: ErrorType.NETWORK,
          silent: true // Don't show toast, we'll handle it here
        }
      );
      errorHandlingSystem.logError(networkError);

      toast({
        title: "Connection Lost",
        description: "Please check your internet connection",
        variant: "destructive",
        duration: 0 // Don't auto-dismiss
      });
    };

    // Monitor connection quality
    const checkConnectionQuality = async () => {
      if (!navigator.onLine) return;

      try {
        const start = Date.now();
        const response = await fetch('/api/ping', { 
          method: 'HEAD',
          cache: 'no-cache'
        });
        const duration = Date.now() - start;

        if (duration > 3000) {
          setStatus('slow');
        } else if (status === 'slow') {
          setStatus('online');
        }
      } catch (error) {
        // Connection test failed but navigator.onLine is true
        setStatus('slow');
      }
    };

    // Set up event listeners
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Check connection quality periodically
    const qualityCheckInterval = setInterval(checkConnectionQuality, 30000);

    // Initial quality check
    checkConnectionQuality();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(qualityCheckInterval);
    };
  }, [status]);

  const handleRetryConnection = async () => {
    setStatus('reconnecting');
    setReconnectAttempts(prev => prev + 1);

    try {
      // Try to fetch a small resource to test connectivity
      const response = await fetch('/favicon.ico', { 
        method: 'HEAD',
        cache: 'no-cache',
        signal: AbortSignal.timeout(5000)
      });

      if (response.ok) {
        setStatus('online');
        setLastOnlineTime(Date.now());
        setReconnectAttempts(0);
        
        toast({
          title: "Connection Test Successful",
          description: "Your connection appears to be working",
          variant: "default"
        });
      } else {
        throw new Error('Connection test failed');
      }
    } catch (error) {
      setStatus('offline');
      
      toast({
        title: "Connection Test Failed",
        description: `Attempt ${reconnectAttempts + 1} failed. Please check your network settings.`,
        variant: "destructive"
      });
    }
  };

  const getStatusInfo = () => {
    switch (status) {
      case 'online':
        return {
          icon: Wifi,
          color: 'text-green-600 bg-green-50 border-green-200',
          title: 'Online',
          message: 'Connected to the internet'
        };
      case 'offline':
        return {
          icon: WifiOff,
          color: 'text-red-600 bg-red-50 border-red-200',
          title: 'Offline',
          message: 'No internet connection detected'
        };
      case 'slow':
        return {
          icon: AlertTriangle,
          color: 'text-yellow-600 bg-yellow-50 border-yellow-200',
          title: 'Slow Connection',
          message: 'Internet connection is slow or unstable'
        };
      case 'reconnecting':
        return {
          icon: Wifi,
          color: 'text-blue-600 bg-blue-50 border-blue-200',
          title: 'Reconnecting...',
          message: 'Testing connection'
        };
    }
  };

  const statusInfo = getStatusInfo();
  const StatusIcon = statusInfo.icon;

  // Don't show indicator when online unless explicitly requested
  if (status === 'online' && !showWhenOnline) {
    return null;
  }

  const positionClass = position === 'top' 
    ? 'fixed top-4 left-1/2 transform -translate-x-1/2 z-50'
    : 'fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50';

  return (
    <div className={`${positionClass} ${className}`}>
      <Alert className={`${statusInfo.color} border shadow-lg max-w-md`}>
        <StatusIcon className={`h-4 w-4 ${status === 'reconnecting' ? 'animate-pulse' : ''}`} />
        <AlertDescription>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">{statusInfo.title}</p>
              <p className="text-sm opacity-90">{statusInfo.message}</p>
              {status === 'offline' && reconnectAttempts > 0 && (
                <p className="text-xs opacity-75 mt-1">
                  Retry attempts: {reconnectAttempts}
                </p>
              )}
            </div>
            
            {(status === 'offline' || status === 'slow') && (
              <Button
                size="sm"
                variant="outline"
                onClick={handleRetryConnection}
                disabled={status === 'reconnecting'}
                className="ml-3"
              >
                {status === 'reconnecting' ? 'Testing...' : 'Retry'}
              </Button>
            )}
          </div>
        </AlertDescription>
      </Alert>
    </div>
  );
};

export default NetworkStatusIndicator; 