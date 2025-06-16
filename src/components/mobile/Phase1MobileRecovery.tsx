/**
 * 📱 Phase 1: Enhanced Mobile Session Recovery Component
 * 
 * Monitors mobile lifecycle events and triggers enhanced session recovery
 * when users return from background after extended periods.
 * 
 * FEATURES:
 * - Proactive session validation on return from background
 * - Smart recovery with exponential backoff
 * - Integration with health monitor and presence systems
 * - Visual feedback for recovery status
 */

import React, { useEffect, useState } from 'react';
import { useMobileLifecycle } from '@/hooks/useMobileLifecycle';
import { useOptimizedAuth } from '@/contexts/AuthContext';
import { shouldEnableMobileFeatures } from '@/utils/mobileDetection';
import { AlertCircle, CheckCircle2, Loader2, RefreshCw } from 'lucide-react';

interface Phase1RecoveryStatus {
  isActive: boolean;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  showIndicator: boolean;
}

export function Phase1MobileRecovery() {
  const { user } = useOptimizedAuth();
  const mobileLifecycle = useMobileLifecycle();
  const [recoveryStatus, setRecoveryStatus] = useState<Phase1RecoveryStatus>({
    isActive: false,
    message: '',
    type: 'info',
    showIndicator: false
  });
  
  // Only render on mobile devices
  if (!shouldEnableMobileFeatures()) {
    return null;
  }
  
  // Monitor recovery status and provide visual feedback
  useEffect(() => {
    const {
      isRecovering,
      needsRecovery,
      sessionValidationStatus,
      lastRecoveryResult,
      returnedFromBackground,
      backgroundDuration
    } = mobileLifecycle;
    
    if (isRecovering) {
      setRecoveryStatus({
        isActive: true,
        message: 'Validating session...',
        type: 'info',
        showIndicator: true
      });
    } else if (needsRecovery && returnedFromBackground) {
      setRecoveryStatus({
        isActive: true,
        message: `Welcome back! (away ${Math.round(backgroundDuration / 1000)}s)`,
        type: 'info',
        showIndicator: true
      });
      
      // Hide after a few seconds
      setTimeout(() => {
        setRecoveryStatus(prev => ({ ...prev, showIndicator: false }));
      }, 3000);
    } else if (sessionValidationStatus === 'valid' && lastRecoveryResult) {
      setRecoveryStatus({
        isActive: true,
        message: 'Session validated ✓',
        type: 'success',
        showIndicator: true
      });
      
      // Hide success message after a short delay
      setTimeout(() => {
        setRecoveryStatus(prev => ({ ...prev, showIndicator: false }));
      }, 2000);
    } else if (sessionValidationStatus === 'invalid' || sessionValidationStatus === 'failed') {
      setRecoveryStatus({
        isActive: true,
        message: 'Session recovery needed',
        type: 'warning',
        showIndicator: true
      });
      
      // Keep warning visible longer
      setTimeout(() => {
        setRecoveryStatus(prev => ({ ...prev, showIndicator: false }));
      }, 5000);
    } else {
      setRecoveryStatus({
        isActive: false,
        message: '',
        type: 'info',
        showIndicator: false
      });
    }
  }, [
    mobileLifecycle.isRecovering,
    mobileLifecycle.needsRecovery,
    mobileLifecycle.sessionValidationStatus,
    mobileLifecycle.lastRecoveryResult,
    mobileLifecycle.returnedFromBackground,
    mobileLifecycle.backgroundDuration
  ]);
  
  // Setup Phase 1 recovery event listeners
  useEffect(() => {
    if (!user?.id) return;
    
    const phase1Recovery = (window as any).phase1Recovery;
    if (!phase1Recovery) return;
    
    const handleRecoveryEvent = (result: any) => {
      console.log('📱 [Phase1Component] Recovery event:', result);
      
      if (result.success) {
        setRecoveryStatus({
          isActive: true,
          message: result.action === 'session_refreshed' ? 'Session refreshed' : 'Session validated',
          type: 'success',
          showIndicator: true
        });
      } else {
        setRecoveryStatus({
          isActive: true,
          message: 'Recovery failed',
          type: 'error',
          showIndicator: true
        });
      }
    };
    
    const removeListener = phase1Recovery.addRecoveryListener?.(handleRecoveryEvent);
    
    return () => {
      if (removeListener) {
        removeListener();
      }
    };
  }, [user?.id]);
  
  // Debug interface for development
  useEffect(() => {
    if (import.meta.env.DEV && typeof window !== 'undefined') {
      (window as any).phase1Component = {
        getStatus: () => recoveryStatus,
        getMobileLifecycle: () => mobileLifecycle,
        triggerRecovery: mobileLifecycle.triggerEnhancedRecovery,
        validateSession: mobileLifecycle.validateSession,
        simulateBackground: () => {
          if ((window as any).mobileLifecycleDebug?.forceBackground) {
            (window as any).mobileLifecycleDebug.forceBackground();
          }
        }
      };
    }
  }, [recoveryStatus, mobileLifecycle]);
  
  // Render recovery status indicator
  if (!recoveryStatus.showIndicator) {
    return null;
  }
  
  const getIcon = () => {
    switch (recoveryStatus.type) {
      case 'success':
        return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case 'warning':
        return <AlertCircle className="w-4 h-4 text-yellow-500" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      default:
        return mobileLifecycle.isRecovering ? 
          <Loader2 className="w-4 h-4 text-blue-500 animate-spin" /> :
          <RefreshCw className="w-4 h-4 text-blue-500" />;
    }
  };
  
  const getBackgroundColor = () => {
    switch (recoveryStatus.type) {
      case 'success':
        return 'bg-green-50 border-green-200';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200';
      case 'error':
        return 'bg-red-50 border-red-200';
      default:
        return 'bg-blue-50 border-blue-200';
    }
  };
  
  return (
    <div 
      className={`
        fixed top-4 left-1/2 transform -translate-x-1/2 z-50
        ${getBackgroundColor()}
        border rounded-lg px-3 py-2 shadow-sm
        flex items-center gap-2 text-sm
        transition-all duration-300 ease-in-out
        animate-in slide-in-from-top-2
      `}
    >
      {getIcon()}
      <span className="font-medium">{recoveryStatus.message}</span>
      
      {/* Development debug info */}
      {import.meta.env.DEV && (
        <div className="text-xs text-gray-500 ml-2 border-l pl-2">
          {mobileLifecycle.sessionValidationStatus}
          {mobileLifecycle.recoveryAttempts > 0 && ` (${mobileLifecycle.recoveryAttempts})`}
        </div>
      )}
    </div>
  );
}

export default Phase1MobileRecovery; 