/**
 * 🔮 Phase 2C: Predictive Cache React Hook
 * 
 * React integration for the Predictive Cache Engine, providing easy-to-use
 * functions for tracking user behavior and leveraging predictive caching.
 * 
 * Features:
 * - Automatic behavior tracking for React components
 * - Predictive cache warming based on user patterns
 * - Performance monitoring and analytics
 * - Integration with existing cache systems
 * - Mobile-optimized predictions
 */

import { useEffect, useCallback, useRef, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { predictiveCacheEngine, type PredictiveCache, type PredictiveCacheMetrics } from '@/utils/predictiveCacheEngine';
import { devLogger } from '@/utils/developmentLogger';

export interface PredictiveCacheHookOptions {
  enableTracking?: boolean;
  enablePrediction?: boolean;
  trackingThrottle?: number;
  predictionInterval?: number;
  autoWarmCache?: boolean;
}

export interface PredictiveCacheHookReturn {
  // Tracking functions
  trackSpaceNavigation: (fromSpace: string, toSpace: string) => void;
  trackContentAccess: (spaceId: string, contentType: string) => void;
  trackUserAction: (action: string, context?: any) => void;
  
  // Prediction functions
  generatePredictions: () => Promise<PredictiveCache[]>;
  warmPredictiveCache: (predictions?: PredictiveCache[]) => Promise<void>;
  
  // Analytics
  metrics: PredictiveCacheMetrics | null;
  isLearning: boolean;
  isPredicting: boolean;
  
  // Configuration
  updateConfig: (config: Partial<PredictiveCacheHookOptions>) => void;
  
  // Debug utilities
  getDebugInfo: () => any;
  exportUserPatterns: () => any;
}

/**
 * Hook for integrating predictive caching into React components
 */
export function usePredictiveCache(
  options: PredictiveCacheHookOptions = {}
): PredictiveCacheHookReturn {
  const { user } = useAuth();
  const [metrics, setMetrics] = useState<PredictiveCacheMetrics | null>(null);
  const [isLearning, setIsLearning] = useState(false);
  const [isPredicting, setIsPredicting] = useState(false);
  
  const lastTrackingTime = useRef<number>(0);
  const predictionTimer = useRef<NodeJS.Timeout | null>(null);
  const configRef = useRef<PredictiveCacheHookOptions>({
    enableTracking: true,
    enablePrediction: true,
    trackingThrottle: 1000, // 1 second
    predictionInterval: 30000, // 30 seconds
    autoWarmCache: true,
    ...options
  });

  /**
   * Track space navigation behavior
   */
  const trackSpaceNavigation = useCallback((fromSpace: string, toSpace: string) => {
    if (!configRef.current.enableTracking || !user?.id) return;

    const now = Date.now();
    if (now - lastTrackingTime.current < configRef.current.trackingThrottle!) return;
    
    lastTrackingTime.current = now;
    setIsLearning(true);

    predictiveCacheEngine.trackUserBehavior(
      user.id,
      'space_navigation',
      {
        spaceId: fromSpace,
        metadata: {
          fromSpace,
          toSpace,
          timestamp: now
        }
      }
    );

    // Track the destination space as well
    setTimeout(() => {
      predictiveCacheEngine.trackUserBehavior(
        user.id,
        'space_enter',
        {
          spaceId: toSpace,
          metadata: {
            fromSpace,
            toSpace,
            timestamp: Date.now()
          }
        }
      );
      setIsLearning(false);
    }, 500);

    devLogger.log('PredictiveCache', `📊 Tracked space navigation: ${fromSpace} → ${toSpace}`);
  }, [user?.id]);

  /**
   * Track content access behavior
   */
  const trackContentAccess = useCallback((spaceId: string, contentType: string) => {
    if (!configRef.current.enableTracking || !user?.id) return;

    const now = Date.now();
    if (now - lastTrackingTime.current < configRef.current.trackingThrottle!) return;
    
    lastTrackingTime.current = now;
    setIsLearning(true);

    predictiveCacheEngine.trackUserBehavior(
      user.id,
      'content_access',
      {
        spaceId,
        contentType: contentType as any,
        metadata: {
          accessTime: now,
          userAgent: navigator.userAgent.includes('Mobile') ? 'mobile' : 'desktop'
        }
      }
    );

    setTimeout(() => setIsLearning(false), 300);

    devLogger.log('PredictiveCache', `📊 Tracked content access: ${contentType} in ${spaceId}`);
  }, [user?.id]);

  /**
   * Track general user actions
   */
  const trackUserAction = useCallback((action: string, context: any = {}) => {
    if (!configRef.current.enableTracking || !user?.id) return;

    const now = Date.now();
    if (now - lastTrackingTime.current < configRef.current.trackingThrottle!) return;
    
    lastTrackingTime.current = now;
    setIsLearning(true);

    predictiveCacheEngine.trackUserBehavior(
      user.id,
      action,
      {
        ...context,
        metadata: {
          ...context.metadata,
          timestamp: now,
          component: context.component || 'unknown',
          userAgent: navigator.userAgent.includes('Mobile') ? 'mobile' : 'desktop'
        }
      }
    );

    setTimeout(() => setIsLearning(false), 300);

    devLogger.log('PredictiveCache', `📊 Tracked user action: ${action}`, context);
  }, [user?.id]);

  /**
   * Generate predictions for current context
   */
  const generatePredictions = useCallback(async (): Promise<PredictiveCache[]> => {
    if (!configRef.current.enablePrediction || !user?.id) return [];

    setIsPredicting(true);

    try {
      const currentContext = {
        timeOfDay: new Date().getHours(),
        dayOfWeek: new Date().getDay(),
        // Add current space if available from URL
        spaceId: window.location.pathname.split('/')[1] !== 'app' ? 
          window.location.pathname.split('/')[1] : undefined
      };

      const predictions = await predictiveCacheEngine.generatePredictions(
        user.id,
        currentContext
      );

      devLogger.log('PredictiveCache', `🔮 Generated ${predictions.length} predictions for current context`);
      return predictions;

    } catch (error) {
      devLogger.warn('PredictiveCache', 'Failed to generate predictions', { error });
      return [];
    } finally {
      setIsPredicting(false);
    }
  }, [user?.id]);

  /**
   * Warm predictive cache with predictions
   */
  const warmPredictiveCache = useCallback(async (predictions?: PredictiveCache[]) => {
    if (!configRef.current.enablePrediction || !user?.id) return;

    try {
      const predictionsToUse = predictions || await generatePredictions();
      
      if (predictionsToUse.length > 0) {
        await predictiveCacheEngine.executePredictiveCaching(predictionsToUse);
        devLogger.log('PredictiveCache', `🔥 Warmed cache with ${predictionsToUse.length} predictions`);
      }
    } catch (error) {
      devLogger.warn('PredictiveCache', 'Failed to warm predictive cache', { error });
    }
  }, [user?.id, generatePredictions]);

  /**
   * Update hook configuration
   */
  const updateConfig = useCallback((newConfig: Partial<PredictiveCacheHookOptions>) => {
    configRef.current = { ...configRef.current, ...newConfig };
    devLogger.log('PredictiveCache', '⚙️ Hook configuration updated', newConfig);
  }, []);

  /**
   * Get debug information
   */
  const getDebugInfo = useCallback(() => {
    return {
      hookConfig: configRef.current,
      engineDebugInfo: predictiveCacheEngine.getDebugInfo(),
      currentMetrics: metrics,
      isLearning,
      isPredicting,
      userId: user?.id
    };
  }, [metrics, isLearning, isPredicting, user?.id]);

  /**
   * Export user patterns for analysis
   */
  const exportUserPatterns = useCallback(() => {
    if (!user?.id) return null;

    return {
      userId: user.id,
      timestamp: new Date().toISOString(),
      debugInfo: predictiveCacheEngine.getDebugInfo(),
      metrics: predictiveCacheEngine.getMetrics()
    };
  }, [user?.id]);

  /**
   * Setup automatic prediction and cache warming
   */
  useEffect(() => {
    if (!configRef.current.enablePrediction || !configRef.current.autoWarmCache || !user?.id) {
      return;
    }

    // Clear existing timer
    if (predictionTimer.current) {
      clearInterval(predictionTimer.current);
    }

    // Setup periodic prediction and cache warming
    predictionTimer.current = setInterval(async () => {
      try {
        const predictions = await generatePredictions();
        if (predictions.length > 0) {
          await warmPredictiveCache(predictions);
        }
      } catch (error) {
        devLogger.warn('PredictiveCache', 'Automatic cache warming failed', { error });
      }
    }, configRef.current.predictionInterval);

    return () => {
      if (predictionTimer.current) {
        clearInterval(predictionTimer.current);
      }
    };
  }, [user?.id, generatePredictions, warmPredictiveCache]);

  /**
   * Update metrics periodically
   */
  useEffect(() => {
    const updateMetrics = () => {
      const currentMetrics = predictiveCacheEngine.getMetrics();
      setMetrics(currentMetrics);
    };

    // Initial metrics update
    updateMetrics();

    // Setup periodic metrics updates
    const metricsInterval = setInterval(updateMetrics, 10000); // Every 10 seconds

    return () => clearInterval(metricsInterval);
  }, []);

  /**
   * Track component mount/unmount for analytics
   */
  useEffect(() => {
    if (user?.id) {
      trackUserAction('component_mount', {
        component: 'usePredictiveCache',
        timestamp: Date.now()
      });

      return () => {
        trackUserAction('component_unmount', {
          component: 'usePredictiveCache',
          timestamp: Date.now()
        });
      };
    }
  }, [user?.id, trackUserAction]);

  return {
    // Tracking functions
    trackSpaceNavigation,
    trackContentAccess,
    trackUserAction,
    
    // Prediction functions
    generatePredictions,
    warmPredictiveCache,
    
    // Analytics
    metrics,
    isLearning,
    isPredicting,
    
    // Configuration
    updateConfig,
    
    // Debug utilities
    getDebugInfo,
    exportUserPatterns
  };
}

/**
 * Hook for tracking space-specific behavior
 */
export function useSpacePredictiveCache(spaceId: string, options: PredictiveCacheHookOptions = {}) {
  const predictiveCache = usePredictiveCache(options);
  const { user } = useAuth();
  const lastSpaceId = useRef<string | null>(null);

  /**
   * Track space entry
   */
  useEffect(() => {
    if (spaceId && user?.id && spaceId !== lastSpaceId.current) {
      if (lastSpaceId.current) {
        // Track navigation from previous space
        predictiveCache.trackSpaceNavigation(lastSpaceId.current, spaceId);
      } else {
        // Track direct space access
        predictiveCache.trackUserAction('space_direct_access', {
          spaceId,
          timestamp: Date.now()
        });
      }
      
      lastSpaceId.current = spaceId;
    }
  }, [spaceId, user?.id, predictiveCache]);

  /**
   * Enhanced tracking functions with space context
   */
  const trackPostView = useCallback((postId: string) => {
    predictiveCache.trackContentAccess(spaceId, 'posts');
    predictiveCache.trackUserAction('post_view', {
      spaceId,
      postId,
      timestamp: Date.now()
    });
  }, [spaceId, predictiveCache]);

  const trackCategoryView = useCallback((categoryId: string) => {
    predictiveCache.trackContentAccess(spaceId, 'categories');
    predictiveCache.trackUserAction('category_view', {
      spaceId,
      categoryId,
      timestamp: Date.now()
    });
  }, [spaceId, predictiveCache]);

  const trackMemberView = useCallback(() => {
    predictiveCache.trackContentAccess(spaceId, 'members');
    predictiveCache.trackUserAction('members_view', {
      spaceId,
      timestamp: Date.now()
    });
  }, [spaceId, predictiveCache]);

  const trackSettingsAccess = useCallback(() => {
    predictiveCache.trackContentAccess(spaceId, 'settings');
    predictiveCache.trackUserAction('settings_access', {
      spaceId,
      timestamp: Date.now()
    });
  }, [spaceId, predictiveCache]);

  return {
    ...predictiveCache,
    
    // Space-specific tracking
    trackPostView,
    trackCategoryView,
    trackMemberView,
    trackSettingsAccess,
    
    // Current space info
    currentSpaceId: spaceId
  };
}

/**
 * Hook for mobile-optimized predictive caching
 */
export function useMobilePredictiveCache(options: PredictiveCacheHookOptions = {}) {
  const mobileOptions: PredictiveCacheHookOptions = {
    ...options,
    trackingThrottle: 2000, // Longer throttle for mobile
    predictionInterval: 45000, // Less frequent predictions
    autoWarmCache: true
  };

  const predictiveCache = usePredictiveCache(mobileOptions);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [connectionType, setConnectionType] = useState<string>('unknown');

  /**
   * Monitor network conditions
   */
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Detect connection type if available
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      setConnectionType(connection.effectiveType || 'unknown');
      
      const handleConnectionChange = () => {
        setConnectionType(connection.effectiveType || 'unknown');
      };
      
      connection.addEventListener('change', handleConnectionChange);
      
      return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
        connection.removeEventListener('change', handleConnectionChange);
      };
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  /**
   * Adjust prediction behavior based on network conditions
   */
  useEffect(() => {
    if (!isOnline) {
      // Disable predictions when offline
      predictiveCache.updateConfig({ enablePrediction: false });
    } else {
      // Adjust prediction frequency based on connection type
      const predictionInterval = connectionType === 'slow-2g' || connectionType === '2g' 
        ? 120000 // 2 minutes for slow connections
        : connectionType === '3g' 
        ? 60000  // 1 minute for 3G
        : 30000; // 30 seconds for 4G+

      predictiveCache.updateConfig({ 
        enablePrediction: true,
        predictionInterval
      });
    }
  }, [isOnline, connectionType, predictiveCache]);

  /**
   * Mobile-specific tracking with network awareness
   */
  const trackMobileAction = useCallback((action: string, context: any = {}) => {
    predictiveCache.trackUserAction(action, {
      ...context,
      metadata: {
        ...context.metadata,
        isMobile: true,
        isOnline,
        connectionType,
        timestamp: Date.now()
      }
    });
  }, [predictiveCache, isOnline, connectionType]);

  return {
    ...predictiveCache,
    
    // Mobile-specific functions
    trackMobileAction,
    
    // Network status
    isOnline,
    connectionType,
    
    // Mobile-optimized config
    isMobileOptimized: true
  };
}