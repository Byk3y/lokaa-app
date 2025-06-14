/**
 * 🎯 Unified Loading Screen
 * 
 * Single loading component that replaces all individual loading screens.
 * Integrates with LoadingStateManager for coordinated loading experience.
 */

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, Zap, Users, Home, Search, UserCheck } from 'lucide-react';
import { 
  LoadingOperation, 
  UserType, 
  loadingStateManager 
} from '@/managers/LoadingStateManager';
import { useUnifiedLoading } from '@/hooks/useUnifiedLoading';

interface UnifiedLoadingScreenProps {
  className?: string;
  showProgress?: boolean;
  showOperation?: boolean;
  minDisplayTime?: number;
}

// Loading messages by operation and user type
const LOADING_MESSAGES: Record<LoadingOperation, Record<UserType, string>> = {
  [LoadingOperation.AUTH_CHECK]: {
    [UserType.SPACE_OWNER]: "Verifying your account...",
    [UserType.MEMBER_ONLY]: "Checking authentication...",
    [UserType.OWNER_AND_MEMBER]: "Signing you in...",
    [UserType.NO_SPACES]: "Setting up your session...",
    [UserType.UNKNOWN]: "Authenticating..."
  },
  [LoadingOperation.SPACE_DETECTION]: {
    [UserType.SPACE_OWNER]: "Finding your spaces...",
    [UserType.MEMBER_ONLY]: "Locating your communities...",
    [UserType.OWNER_AND_MEMBER]: "Checking your spaces...",
    [UserType.NO_SPACES]: "Discovering spaces...",
    [UserType.UNKNOWN]: "Looking for spaces..."
  },
  [LoadingOperation.SPACE_ACCESS]: {
    [UserType.SPACE_OWNER]: "Accessing your space...",
    [UserType.MEMBER_ONLY]: "Verifying membership...",
    [UserType.OWNER_AND_MEMBER]: "Loading space data...",
    [UserType.NO_SPACES]: "Checking access...",
    [UserType.UNKNOWN]: "Verifying access..."
  },
  [LoadingOperation.MEMBERSHIP_VERIFICATION]: {
    [UserType.SPACE_OWNER]: "Checking permissions...",
    [UserType.MEMBER_ONLY]: "Confirming membership...",
    [UserType.OWNER_AND_MEMBER]: "Verifying your role...",
    [UserType.NO_SPACES]: "Checking eligibility...",
    [UserType.UNKNOWN]: "Verifying membership..."
  },
  [LoadingOperation.SPACE_DATA_FETCH]: {
    [UserType.SPACE_OWNER]: "Loading your space...",
    [UserType.MEMBER_ONLY]: "Getting space details...",
    [UserType.OWNER_AND_MEMBER]: "Fetching space data...",
    [UserType.NO_SPACES]: "Loading content...",
    [UserType.UNKNOWN]: "Loading space..."
  },
  [LoadingOperation.REDIRECT_OPERATION]: {
    [UserType.SPACE_OWNER]: "Taking you to your space...",
    [UserType.MEMBER_ONLY]: "Redirecting to your community...",
    [UserType.OWNER_AND_MEMBER]: "Navigating to your space...",
    [UserType.NO_SPACES]: "Finding your destination...",
    [UserType.UNKNOWN]: "Redirecting..."
  }
};

// Icons by operation
const OPERATION_ICONS: Record<LoadingOperation, React.ComponentType<{ className?: string }>> = {
  [LoadingOperation.AUTH_CHECK]: UserCheck,
  [LoadingOperation.SPACE_DETECTION]: Search,
  [LoadingOperation.SPACE_ACCESS]: Home,
  [LoadingOperation.MEMBERSHIP_VERIFICATION]: Users,
  [LoadingOperation.SPACE_DATA_FETCH]: Loader2,
  [LoadingOperation.REDIRECT_OPERATION]: Zap
};

/**
 * 🎯 Main Unified Loading Screen Component
 */
export default function UnifiedLoadingScreen({
  className = '',
  showProgress = true,
  showOperation = true,
  minDisplayTime = 300
}: UnifiedLoadingScreenProps) {
  const {
    isLoading,
    operation,
    progress,
    userType,
    canShowLoader,
    shouldShowInstantFeedback
  } = useUnifiedLoading();

  const [shouldRender, setShouldRender] = useState(false);
  const [displayStartTime, setDisplayStartTime] = useState<number | null>(null);

  // Control when to show/hide the loading screen
  useEffect(() => {
    if (isLoading && canShowLoader) {
      setShouldRender(true);
      setDisplayStartTime(Date.now());
    } else if (!isLoading && displayStartTime) {
      // Ensure minimum display time for smooth UX
      const elapsed = Date.now() - displayStartTime;
      if (elapsed < minDisplayTime) {
        setTimeout(() => {
          setShouldRender(false);
          setDisplayStartTime(null);
        }, minDisplayTime - elapsed);
      } else {
        setShouldRender(false);
        setDisplayStartTime(null);
      }
    }
  }, [isLoading, canShowLoader, displayStartTime, minDisplayTime]);

  // Don't render if not needed
  if (!shouldRender || !operation) {
    return null;
  }

  const message = LOADING_MESSAGES[operation]?.[userType] || LOADING_MESSAGES[operation]?.[UserType.UNKNOWN] || "Loading...";
  const IconComponent = OPERATION_ICONS[operation] || Loader2;

  return (
    <AnimatePresence>
      {shouldRender && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className={`fixed inset-0 bg-white/95 backdrop-blur-sm z-50 flex items-center justify-center ${className}`}
        >
          <div className="text-center max-w-sm mx-auto px-6">
            {/* Loading Icon */}
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1, duration: 0.3 }}
              className="mb-6"
            >
              <div className="relative">
                <IconComponent 
                  className="h-16 w-16 mx-auto text-blue-600 animate-spin" 
                />
                {/* Pulse effect for instant feedback */}
                {shouldShowInstantFeedback && (
                  <motion.div
                    initial={{ scale: 1, opacity: 0.8 }}
                    animate={{ scale: 1.5, opacity: 0 }}
                    transition={{ duration: 1, repeat: Infinity }}
                    className="absolute inset-0 border-2 border-blue-600 rounded-full"
                  />
                )}
              </div>
            </motion.div>

            {/* Loading Message */}
            <motion.div
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.3 }}
              className="mb-4"
            >
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {message}
              </h3>
              
              {/* Operation type (optional) */}
              {showOperation && (
                <p className="text-sm text-gray-600 capitalize">
                  {operation.replace('_', ' ')}
                </p>
              )}
            </motion.div>

            {/* Progress Bar */}
            {showProgress && progress > 0 && (
              <motion.div
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: 'auto', opacity: 1 }}
                transition={{ delay: 0.3, duration: 0.3 }}
                className="mb-4"
              >
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <motion.div
                    className="bg-blue-600 h-2 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  {progress}%
                </p>
              </motion.div>
            )}

            {/* User Type Indicator (dev only) */}
            {process.env.NODE_ENV === 'development' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.5 }}
                transition={{ delay: 0.5 }}
                className="text-xs text-gray-400 mt-4"
              >
                User Type: {userType}
              </motion.div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/**
 * 🚀 Quick Loading Spinner - For inline loading states
 */
export function QuickLoadingSpinner({ 
  operation, 
  size = 'md',
  className = '' 
}: { 
  operation?: LoadingOperation;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}) {
  const { isLoading, operation: currentOperation, shouldShowOperation } = useUnifiedLoading();
  
  // Only show if this operation is active or no specific operation requested
  const shouldShow = isLoading && (
    !operation || 
    currentOperation === operation || 
    shouldShowOperation(operation)
  );

  if (!shouldShow) return null;

  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6', 
    lg: 'h-8 w-8'
  };

  const IconComponent = currentOperation ? OPERATION_ICONS[currentOperation] : Loader2;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      transition={{ duration: 0.2 }}
      className={`inline-flex items-center justify-center ${className}`}
    >
      <IconComponent 
        className={`${sizeClasses[size]} text-blue-600 animate-spin`} 
      />
    </motion.div>
  );
}

/**
 * 🎭 Loading State Indicator - Shows current loading operation
 */
export function LoadingStateIndicator({ showDetails = false }: { showDetails?: boolean }) {
  const { 
    isLoading, 
    operation, 
    userType, 
    progress,
    expectedDuration 
  } = useUnifiedLoading();

  if (!isLoading || !operation) return null;

  const IconComponent = OPERATION_ICONS[operation];
  const message = LOADING_MESSAGES[operation]?.[userType] || "Loading...";

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="fixed top-4 right-4 bg-white shadow-lg rounded-lg p-3 border z-40 max-w-xs"
    >
      <div className="flex items-center space-x-3">
        <IconComponent className="h-5 w-5 text-blue-600 animate-spin flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate">
            {message}
          </p>
          {showDetails && (
            <div className="text-xs text-gray-500 mt-1">
              <p>Operation: {operation}</p>
              <p>Progress: {progress}%</p>
              <p>Expected: {expectedDuration}ms</p>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
} 