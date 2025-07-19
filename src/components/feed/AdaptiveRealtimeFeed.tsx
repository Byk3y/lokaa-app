import { log } from '@/utils/logger';
import React, { useEffect, useState, useMemo } from 'react';
import { useRealtimePostsOptimized } from '@/hooks/useRealtimePostsOptimized';
import { useAdvancedRealtimePosts } from '@/hooks/useAdvancedRealtimePosts';
import { useNewPostsState } from '@/hooks/useNewPostsState';
import { NewPostNotification } from './NewPostNotification';
import { AdvancedNewPostNotification } from './AdvancedNewPostNotification';
import { performanceMonitor } from '@/utils/realtimePerformanceMonitor';

interface AdaptiveRealtimeFeedProps {
  spaceId: string;
  userId: string;
  onLoadNewPosts: (postIds: string[]) => Promise<void>;
  enableAdvancedFeatures?: boolean;
  adaptiveMode?: boolean;
}

export const AdaptiveRealtimeFeed: React.FC<AdaptiveRealtimeFeedProps> = ({
  spaceId,
  userId,
  onLoadNewPosts,
  enableAdvancedFeatures = false,
  adaptiveMode = true,
}) => {
  const [useAdvanced, setUseAdvanced] = useState(enableAdvancedFeatures);
  const [performanceMode, setPerformanceMode] = useState<'standard' | 'performance' | 'battery'>('standard');

  // Adaptive performance detection
  useEffect(() => {
    if (!adaptiveMode) return;

    const checkPerformance = () => {
      const metrics = performanceMonitor.getMetrics();
      const quality = performanceMonitor.getConnectionQuality();
      
      // Auto-switch to advanced mode if performance is good
      if (quality === 'excellent' && metrics.memoryUsage < 0.5) {
        setUseAdvanced(true);
        setPerformanceMode('performance');
      } 
      // Switch to battery mode if performance is poor
      else if (quality === 'poor' || metrics.memoryUsage > 0.8) {
        setUseAdvanced(false);
        setPerformanceMode('battery');
      }
      // Standard mode for everything else
      else {
        setPerformanceMode('standard');
      }

      log.debug('Component', `🔄 [AdaptiveFeed] Performance mode: ${performanceMode}, Advanced: ${useAdvanced}`);
    };

    const interval = setInterval(checkPerformance, 10000); // Check every 10 seconds
    checkPerformance(); // Initial check

    return () => clearInterval(interval);
  }, [adaptiveMode, performanceMode, useAdvanced]);

  // Standard real-time hook (now optimized with GlobalRealtimeService)
  const standardRealtime = useRealtimePostsOptimized({
    spaceId,
    userId,
    isEnabled: !useAdvanced,
    debounceMs: performanceMode === 'battery' ? 5000 : 2000,
    maxBatchSize: performanceMode === 'battery' ? 5 : 10,
  });

  // Advanced real-time hook
  const advancedRealtime = useAdvancedRealtimePosts({
    spaceId,
    userId,
    isEnabled: useAdvanced,
    performanceMode,
  });

  // Determine which data to use
  const realtimeData = useMemo(() => {
    if (useAdvanced) {
      return {
        newPostIds: advancedRealtime.newPostIds,
        newPostCount: advancedRealtime.newPostCount,
        isConnected: advancedRealtime.isConnected,
        clearNewPosts: advancedRealtime.clearNewPosts,
        connectionHealth: advancedRealtime.connectionHealth,
      };
    } else {
      return {
        newPostIds: standardRealtime.newPostIds,
        newPostCount: standardRealtime.newPostCount,
        isConnected: standardRealtime.isConnected,
        clearNewPosts: standardRealtime.clearNewPosts,
        connectionHealth: undefined,
      };
    }
  }, [useAdvanced, standardRealtime, advancedRealtime]);

  // Enhanced state management
  const {
    isLoadingNewPosts,
    isDismissed,
    loadError,
    retryCount,
    handleLoadNewPosts,
    handleDismissNotification,
    updateLastNotificationTime,
  } = useNewPostsState({
    onLoadNewPosts: async (postIds: string[]) => {
      
      
      // Performance monitoring
      const startTime = performance.now();
      
      try {
        await onLoadNewPosts(postIds);
        
        const processingTime = performance.now() - startTime;
        performanceMonitor.recordProcessingTime(processingTime);
        performanceMonitor.recordBatchProcessing(postIds.length, processingTime);
        
        realtimeData.clearNewPosts();
        window.scrollTo({ top: 0, behavior: 'smooth' });
        
      } catch (error) {
        performanceMonitor.recordError();
        throw error;
      }
    },
    maxRetries: useAdvanced ? 3 : 2,
    retryDelay: performanceMode === 'battery' ? 5000 : 3000,
  });

  // Update notification time when new posts arrive
  useEffect(() => {
    if (realtimeData.newPostCount > 0) {
      updateLastNotificationTime();
    }
  }, [realtimeData.newPostCount, updateLastNotificationTime]);

  // Record connection metrics for performance monitoring
  useEffect(() => {
    if (realtimeData.connectionHealth) {
      performanceMonitor.recordConnectionLatency(realtimeData.connectionHealth.latency);
    }
  }, [realtimeData.connectionHealth]);

  // Render appropriate notification component
  if (useAdvanced) {
    return (
      <>
        <AdvancedNewPostNotification
          newPostCount={realtimeData.newPostCount}
          isLoading={isLoadingNewPosts}
          isVisible={!isDismissed && realtimeData.newPostCount > 0}
          connectionHealth={realtimeData.connectionHealth}
          onLoadPosts={() => handleLoadNewPosts(realtimeData.newPostIds)}
          onDismiss={handleDismissNotification}
          autoHideDelay={performanceMode === 'battery' ? 60000 : 30000}
          enableAnalytics={true}
        />
        
        {/* Advanced debug info */}
        {process.env.NODE_ENV === 'development' && (
          <div className="text-xs text-gray-500 mb-2 space-y-1">
            <div>🚀 Advanced Mode | Performance: {performanceMode}</div>
            {realtimeData.connectionHealth && (
              <div>
                📡 Connection: {realtimeData.connectionHealth.status} | 
                ⏱️ {Math.round(realtimeData.connectionHealth.latency)}ms | 
                📦 {realtimeData.connectionHealth.packetsReceived} packets
              </div>
            )}
            {loadError && <div className="text-red-500">❌ Error: {loadError}</div>}
            {retryCount > 0 && <div className="text-yellow-500">🔄 Retries: {retryCount}</div>}
          </div>
        )}
      </>
    );
  }

  return (
    <>
      <NewPostNotification
        newPostCount={realtimeData.newPostCount}
        isLoading={isLoadingNewPosts}
        isVisible={!isDismissed && realtimeData.newPostCount > 0}
        onLoadPosts={() => handleLoadNewPosts(realtimeData.newPostIds)}
        onDismiss={handleDismissNotification}
        autoHideDelay={performanceMode === 'battery' ? 60000 : 30000}
      />
      
      {/* Standard debug info */}
      {process.env.NODE_ENV === 'development' && (
        <div className="text-xs text-gray-500 mb-2 space-y-1">
          <div>⚡ Standard Mode | Performance: {performanceMode}</div>
          <div>🔔 Connected: {realtimeData.isConnected ? '✅' : '❌'}</div>
          {realtimeData.newPostCount > 0 && <div>📦 Pending: {realtimeData.newPostCount} posts</div>}
          {loadError && <div className="text-red-500">❌ Error: {loadError}</div>}
          {retryCount > 0 && <div className="text-yellow-500">🔄 Retries: {retryCount}</div>}
        </div>
      )}
    </>
  );
}; 