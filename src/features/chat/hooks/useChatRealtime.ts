import { log } from '@/utils/logger';
/**
 * useChatRealtime Hook - Real-time subscription management
 */

import { useCallback, useEffect } from 'react';
import { useRealtimeStore } from '../store/realtimeStore';
import { useConversationStore } from '../store/conversationStore';
import { useMessageStore } from '../store/messageStore';

export function useChatRealtime() {
  // Store selectors
  const {
    connection,
    activeSubscriptions,
    validationInProgress,
    lastValidationTime,
    error,
    initialize,
    cleanup,
    reconnect,
    addSubscription,
    removeSubscription,
    startPeriodicValidation,
    stopPeriodicValidation,
    validateUnreadCounts,
    setConnectionState,
    setError,
    reset
  } = useRealtimeStore();

  // Initialize real-time connections on mount
  useEffect(() => {
    if (!connection.isInitialized) {
      log.debug('Hook', '[useChatRealtime] Initializing real-time connections');
      initialize();
    }
    
    return () => {
      // Don't cleanup on unmount as other components might be using it
      // Cleanup only happens on manual call or app shutdown
    };
  }, [connection.isInitialized, initialize]);

  // Connection health monitoring
  useEffect(() => {
    if (!connection.isConnected && connection.isInitialized) {
      log.warn('Hook', '[useChatRealtime] Connection lost, attempting reconnect...');
      
      // Auto-reconnect after a delay
      const reconnectTimer = setTimeout(() => {
        if (connection.retryCount < 5) { // Limit auto-reconnects
          reconnect();
        }
      }, 5000);
      
      return () => clearTimeout(reconnectTimer);
    }
  }, [connection.isConnected, connection.isInitialized, connection.retryCount, reconnect]);

  /**
   * Manual reconnection
   */
  const forceReconnect = useCallback(() => {
    log.debug('Hook', '[useChatRealtime] Manual reconnection requested');
    reconnect();
  }, [reconnect]);

  /**
   * Get connection status info
   */
  const connectionStatus = {
    isConnected: connection.isConnected,
    isInitialized: connection.isInitialized,
    hasError: !!connection.connectionError,
    errorMessage: connection.connectionError,
    retryCount: connection.retryCount,
    lastHeartbeat: connection.lastHeartbeat
  };

  /**
   * Get subscription info
   */
  const subscriptionInfo = {
    activeSubscriptions: Array.from(activeSubscriptions),
    subscriptionCount: activeSubscriptions.size,
    isValidating: validationInProgress,
    lastValidation: lastValidationTime
  };

  /**
   * Start validation process
   */
  const startValidation = useCallback(() => {
    if (!validationInProgress) {
      log.debug('Hook', '[useChatRealtime] Starting manual validation');
      validateUnreadCounts();
    }
  }, [validationInProgress, validateUnreadCounts]);

  /**
   * Subscribe to a specific channel
   */
  const subscribeToChannel = useCallback((channelName: string) => {
    log.debug('Hook', '[useChatRealtime] Subscribing to channel:', channelName);
    addSubscription(channelName);
  }, [addSubscription]);

  /**
   * Unsubscribe from a specific channel
   */
  const unsubscribeFromChannel = useCallback((channelName: string) => {
    log.debug('Hook', '[useChatRealtime] Unsubscribing from channel:', channelName);
    removeSubscription(channelName);
  }, [removeSubscription]);

  /**
   * Update connection state manually
   */
  const updateConnectionState = useCallback((updates: {
    isConnected?: boolean;
    connectionError?: string | null;
  }) => {
    setConnectionState(updates);
  }, [setConnectionState]);

  /**
   * Check if system is healthy
   */
  const isHealthy = connection.isInitialized && 
                   connection.isConnected && 
                   !connection.connectionError &&
                   !error;

  /**
   * Get diagnostic information
   */
  const diagnostics = {
    connection: connectionStatus,
    subscriptions: subscriptionInfo,
    isHealthy,
    systemError: error,
    conversationCount: useConversationStore.getState().conversations.length,
    totalMessages: Object.keys(useMessageStore.getState().messages).length
  };

  return {
    // Connection state
    connectionStatus,
    subscriptionInfo,
    isHealthy,
    
    // Core operations
    initialize,
    cleanup,
    reconnect: forceReconnect,
    
    // Subscription management
    subscribeToChannel,
    unsubscribeFromChannel,
    
    // Validation
    startValidation,
    validateUnreadCounts,
    startPeriodicValidation,
    stopPeriodicValidation,
    
    // Manual control
    updateConnectionState,
    
    // Error handling
    setError,
    clearError: () => setError(null),
    
    // Diagnostics
    diagnostics,
    
    // Utilities
    reset
  };
}

export type UseChatRealtimeReturn = ReturnType<typeof useChatRealtime>; 