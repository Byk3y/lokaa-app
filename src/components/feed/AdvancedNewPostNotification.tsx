import { log } from '@/utils/logger';
import React, { useEffect, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, X, ChevronUp, TrendingUp, Clock, Wifi, WifiOff } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface AdvancedNewPostNotificationProps {
  newPostCount: number;
  isLoading: boolean;
  isVisible: boolean;
  connectionHealth?: {
    status: 'excellent' | 'good' | 'fair' | 'poor';
    latency: number;
    packetsReceived: number;
  };
  onLoadPosts: () => void;
  onDismiss: () => void;
  autoHideDelay?: number;
  enableAnalytics?: boolean;
}

interface NotificationAnalytics {
  viewTime: number;
  clickRate: number;
  dismissRate: number;
  totalViews: number;
  userEngagement: 'low' | 'medium' | 'high';
}

export const AdvancedNewPostNotification: React.FC<AdvancedNewPostNotificationProps> = ({
  newPostCount,
  isLoading,
  isVisible,
  connectionHealth,
  onLoadPosts,
  onDismiss,
  autoHideDelay = 30000,
  enableAnalytics = true,
}) => {
  const [shouldPulse, setShouldPulse] = useState(false);
  const [progress, setProgress] = useState(100);
  const [analytics, setAnalytics] = useState<NotificationAnalytics>({
    viewTime: 0,
    clickRate: 0,
    dismissRate: 0,
    totalViews: 0,
    userEngagement: 'medium',
  });

  const startTimeRef = useRef<number>(0);
  const viewCountRef = useRef(0);
  const clickCountRef = useRef(0);
  const dismissCountRef = useRef(0);

  // Track notification visibility for analytics
  useEffect(() => {
    if (isVisible && enableAnalytics) {
      startTimeRef.current = Date.now();
      viewCountRef.current++;
      
      log.debug('Component', `📊 [Analytics] Notification shown (view #${viewCountRef.current})`);
    }

    return () => {
      if (startTimeRef.current > 0 && enableAnalytics) {
        const viewTime = Date.now() - startTimeRef.current;
        setAnalytics(prev => ({
          ...prev,
          viewTime: (prev.viewTime + viewTime) / 2, // Average view time
          totalViews: viewCountRef.current,
          clickRate: clickCountRef.current / viewCountRef.current,
          dismissRate: dismissCountRef.current / viewCountRef.current,
        }));
      }
    };
  }, [isVisible, enableAnalytics]);

  // Auto-hide with progress bar
  useEffect(() => {
    if (!isVisible || isLoading || autoHideDelay <= 0) return;

    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, autoHideDelay - elapsed);
      const newProgress = (remaining / autoHideDelay) * 100;
      
      setProgress(newProgress);
      
      if (remaining <= 0) {
        if (enableAnalytics) {
          dismissCountRef.current++;
        }
        onDismiss();
      }
    }, 100);

    return () => clearInterval(interval);
  }, [isVisible, isLoading, autoHideDelay, onDismiss, enableAnalytics]);

  // Pulse effect when count increases
  useEffect(() => {
    if (newPostCount > 0) {
      setShouldPulse(true);
      const timer = setTimeout(() => setShouldPulse(false), 600);
      return () => clearTimeout(timer);
    }
  }, [newPostCount]);

  // Calculate user engagement level
  useEffect(() => {
    const { clickRate, dismissRate, viewTime } = analytics;
    let engagement: 'low' | 'medium' | 'high' = 'medium';
    
    if (clickRate > 0.7 && viewTime > 5000) {
      engagement = 'high';
    } else if (dismissRate > 0.8 || viewTime < 2000) {
      engagement = 'low';
    }

    setAnalytics(prev => ({ ...prev, userEngagement: engagement }));
  }, [analytics.clickRate, analytics.dismissRate, analytics.viewTime]);

  const handleLoadClick = useCallback(() => {
    if (enableAnalytics) {
      clickCountRef.current++;
      log.debug('Component', `📊 [Analytics] Load button clicked (click #${clickCountRef.current})`);
    }
    onLoadPosts();
  }, [onLoadPosts, enableAnalytics]);

  const handleDismissClick = useCallback(() => {
    if (enableAnalytics) {
      dismissCountRef.current++;
      log.debug('Component', `📊 [Analytics] Notification dismissed manually`);
    }
    onDismiss();
  }, [onDismiss, enableAnalytics]);

  const getMessage = () => {
    if (newPostCount === 1) return 'Load 1 new post';
    return `Load ${newPostCount} new posts`;
  };

  const getProgressColor = () => {
    if (progress > 66) return 'bg-green-400';
    if (progress > 33) return 'bg-yellow-400';
    return 'bg-red-400';
  };

  const getConnectionIndicator = () => {
    if (!connectionHealth) return null;
    
    const { status, latency } = connectionHealth;
    const isGoodConnection = status === 'excellent' || status === 'good';
    
    return (
      <div className="flex items-center space-x-1">
        {isGoodConnection ? (
          <Wifi className="h-3 w-3 text-green-500" />
        ) : (
          <WifiOff className="h-3 w-3 text-red-500" />
        )}
        <span className="text-xs text-gray-500">
          {latency > 0 ? `${Math.round(latency)}ms` : status}
        </span>
      </div>
    );
  };

  const getEngagementColor = () => {
    switch (analytics.userEngagement) {
      case 'high': return 'border-green-300 bg-green-50';
      case 'low': return 'border-red-300 bg-red-50';
      default: return 'border-amber-200 bg-gradient-to-r from-amber-50 to-amber-100';
    }
  };

  return (
    <AnimatePresence>
      {isVisible && newPostCount > 0 && (
        <motion.div
          initial={{ y: -80, opacity: 0, scale: 0.95 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: -80, opacity: 0, scale: 0.95 }}
          transition={{ 
            type: 'spring', 
            stiffness: 400, 
            damping: 25,
            duration: 0.4 
          }}
          className="w-full mb-4 z-10 relative"
        >
          <motion.div
            animate={shouldPulse ? { scale: [1, 1.02, 1] } : {}}
            transition={{ duration: 0.6, ease: 'easeInOut' }}
            className={`rounded-lg shadow-sm overflow-hidden relative border ${getEngagementColor()}`}
          >
            {/* Progress bar for auto-hide */}
            {!isLoading && autoHideDelay > 0 && (
              <motion.div
                initial={{ width: '100%' }}
                animate={{ width: `${progress}%` }}
                className={`absolute top-0 left-0 h-1 ${getProgressColor()} transition-colors duration-300`}
              />
            )}
            
            <div className="p-3 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                {isLoading ? (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  >
                    <Loader2 className="h-4 w-4 text-amber-600" />
                  </motion.div>
                ) : (
                  <motion.div
                    animate={{ scale: shouldPulse ? [1, 1.3, 1] : 1 }}
                    transition={{ duration: 0.6 }}
                    className="flex items-center"
                  >
                    <ChevronUp className="h-4 w-4 text-amber-600 mr-1" />
                    <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
                  </motion.div>
                )}
                
                <div className="flex flex-col">
                  <motion.span 
                    className="text-amber-800 text-sm font-medium"
                    animate={shouldPulse ? { scale: [1, 1.05, 1] } : {}}
                    transition={{ duration: 0.6 }}
                  >
                    {isLoading ? 'Loading new posts...' : getMessage()}
                  </motion.span>
                  
                  {/* Connection indicator */}
                  {connectionHealth && (
                    <div className="flex items-center space-x-2 mt-1">
                      {getConnectionIndicator()}
                      {enableAnalytics && analytics.totalViews > 0 && (
                        <div className="flex items-center space-x-1">
                          <TrendingUp className="h-3 w-3 text-blue-500" />
                          <span className="text-xs text-gray-500">
                            {Math.round(analytics.clickRate * 100)}% engaged
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                {!isLoading && (
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleLoadClick}
                      className="text-amber-700 hover:text-amber-800 hover:bg-amber-200 h-7 px-3 text-sm font-medium transition-all duration-200"
                    >
                      Load now
                    </Button>
                  </motion.div>
                )}
                
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={handleDismissClick}
                  disabled={isLoading}
                  className="text-amber-600 hover:text-amber-800 p-1 rounded-md hover:bg-amber-200 transition-all duration-200 disabled:opacity-50"
                  aria-label="Dismiss notification"
                >
                  <X className="h-4 w-4" />
                </motion.button>
              </div>
            </div>

            {/* Analytics debug info (development only) */}
            {process.env.NODE_ENV === 'development' && enableAnalytics && analytics.totalViews > 0 && (
              <div className="px-3 pb-2">
                <div className="text-xs text-gray-500 space-y-1">
                  <div>📊 Views: {analytics.totalViews} | Avg. time: {Math.round(analytics.viewTime / 1000)}s</div>
                  <div>🎯 Engagement: {analytics.userEngagement} | Click rate: {Math.round(analytics.clickRate * 100)}%</div>
                </div>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}; 