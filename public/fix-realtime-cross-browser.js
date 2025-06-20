// Cross-Browser Real-time Chat Fix
// Ensures messages appear instantly across all browser sessions (Safari, Chrome, etc.)

console.log('🌐 [CrossBrowserFix] Loading comprehensive cross-browser real-time fix...');

// 🎯 PHASE 1 FIX: Development mode detection
const isDevelopmentMode = window.location.hostname === 'localhost' || window.location.hostname.includes('127.0.0.1');
const MONITORING_INTERVAL = isDevelopmentMode ? 60000 : 10000; // 1 min dev, 10 sec prod
const HEALTH_CHECK_INTERVAL = isDevelopmentMode ? 120000 : 30000; // 2 min dev, 30 sec prod

// 🎯 PHASE 1 FIX: Global flag to disable monitoring
window.DISABLE_CROSS_BROWSER_MONITORING = window.DISABLE_CROSS_BROWSER_MONITORING || false;

window.realtimeCrossBrowserFix = {
  
  // Diagnostic system
  diagnoseRealtimeConnections: function() {
    console.log('🔍 [CrossBrowserFix] Diagnosing real-time connections across browsers...');
    
    const checks = {
      conversationStore: !!window.useConversationStore?.getState?.(),
      messageStore: !!window.useMessageStore?.getState?.(),
      realtimeStore: !!window.useRealtimeStore?.getState?.(),
      authUser: !!window.useOptimizedAuth?.getState?.()?.user
    };
    
    console.log('📊 [CrossBrowserFix] System status:', checks);
    
    if (checks.conversationStore && checks.authUser) {
      const conversations = window.useConversationStore.getState().conversations;
      console.log('💬 [CrossBrowserFix] Current conversations:', conversations.length);
      
      conversations.forEach(conv => {
        console.log(`  - ${conv.conversation_id.substring(0, 8)}...: "${conv.last_message?.substring(0, 30) || 'No message'}..."`);
      });
    }
    
    return checks;
  },
  
  // Force reconnection of real-time subscriptions
  forceReconnectRealtime: function() {
    console.log('🔄 [CrossBrowserFix] Force reconnecting real-time subscriptions...');
    
    try {
      const realtimeStore = window.useRealtimeStore?.getState?.();
      if (realtimeStore?.cleanup && realtimeStore?.initializeRealtime) {
        console.log('🔄 [CrossBrowserFix] Cleaning up old subscriptions...');
        realtimeStore.cleanup();
        
        setTimeout(() => {
          console.log('🔄 [CrossBrowserFix] Reinitializing real-time subscriptions...');
          const authUser = window.useOptimizedAuth?.getState?.()?.user;
          if (authUser?.id) {
            realtimeStore.initializeRealtime(authUser.id);
          }
        }, 1000);
      }
    } catch (error) {
      console.warn('⚠️ [CrossBrowserFix] Error during reconnection:', error);
    }
  },
  
  // Emergency fix protocol
  emergencyFixCrossBrowser: function() {
    console.log('🚨 [CrossBrowserFix] Applying emergency cross-browser fix...');
    
    const authUser = window.useOptimizedAuth?.getState?.()?.user;
    if (!authUser?.id) {
      console.warn('⚠️ [CrossBrowserFix] No authenticated user found');
      return false;
    }
    
    // Step 1: Force conversation refresh with urgent flag
    const conversationStore = window.useConversationStore?.getState?.();
    if (conversationStore?.fetchConversations) {
      console.log('🔄 [CrossBrowserFix] Step 1: Emergency conversation refresh...');
      conversationStore.fetchConversations(authUser.id, { urgent: true, forceNetwork: true });
    }
    
    // Step 2: Nuclear state update (force React re-render)
    setTimeout(() => {
      if (conversationStore?.setState) {
        console.log('☢️ [CrossBrowserFix] Step 2: Nuclear state update...');
        const currentState = window.useConversationStore.getState();
        window.useConversationStore.setState({
          ...currentState,
          lastUpdate: Date.now(),
          conversations: [...(currentState.conversations || [])]
        });
      }
    }, 100);
    
    // Step 3: Dispatch cross-browser event
    setTimeout(() => {
      console.log('📡 [CrossBrowserFix] Step 3: Cross-browser event dispatch...');
      window.dispatchEvent(new CustomEvent('cross-browser-chat-refresh', {
        detail: { 
          userId: authUser.id,
          timestamp: Date.now(),
          source: 'emergency-fix',
          browsers: ['safari', 'chrome', 'firefox']
        }
      }));
    }, 200);
    
    return true;
  },
  
  // Test message reception across browsers
  testMessageReception: function() {
    console.log('🧪 [CrossBrowserFix] Testing message reception across browsers...');
    
    const conversations = window.useConversationStore?.getState?.()?.conversations || [];
    if (conversations.length === 0) {
      console.warn('⚠️ [CrossBrowserFix] No conversations available for testing');
      return false;
    }
    
    console.log('📊 [CrossBrowserFix] Testing with conversations:', conversations.map(c => ({
      id: c.conversation_id.substring(0, 8) + '...',
      lastMessage: c.last_message?.substring(0, 30) + '...' || 'No message',
      timestamp: c.last_message_at
    })));
    
    // Monitor for real-time updates for 30 seconds
    let updateCount = 0;
    const testDuration = 30000; // 30 seconds
    
    const handleUpdate = (event) => {
      updateCount++;
      console.log(`🔔 [CrossBrowserFix] Real-time update #${updateCount}:`, event.detail);
    };
    
    window.addEventListener('chat-conversations-updated', handleUpdate);
    
    setTimeout(() => {
      window.removeEventListener('chat-conversations-updated', handleUpdate);
      console.log(`📊 [CrossBrowserFix] Test complete. Received ${updateCount} real-time updates in ${testDuration/1000} seconds.`);
    }, testDuration);
    
    return true;
  },
  
  // Set up enhanced monitoring
  startEnhancedMonitoring: function() {
    if (window.DISABLE_CROSS_BROWSER_MONITORING) {
      console.log('🔇 [CrossBrowserFix] Monitoring disabled via global flag');
      return false;
    }
    
    console.log('👁️ [CrossBrowserFix] Starting enhanced cross-browser monitoring...');
    
    // Monitor conversation changes - 🎯 PHASE 1 FIX: Reduced frequency for development
    const monitorConversations = () => {
      if (window.DISABLE_CROSS_BROWSER_MONITORING) return;
      
      const conversations = window.useConversationStore?.getState?.()?.conversations || [];
      
      // 🎯 PHASE 1 FIX: Only log if there are actual changes or in production mode
      if (!isDevelopmentMode || conversations.length > 0) {
        console.log(`📊 [CrossBrowserFix] Monitoring: ${conversations.length} conversations, latest updates:`, 
          conversations.slice(0, 3).map(c => ({
            id: c.conversation_id.substring(0, 8) + '...',
            lastUpdate: c.last_message_at
          }))
        );
      }
    };
    
    // 🎯 PHASE 1 FIX: Use variable interval based on environment
    const monitoringIntervalId = setInterval(monitorConversations, MONITORING_INTERVAL);
    
    // Store interval ID for cleanup
    this.monitoringIntervalId = monitoringIntervalId;
    
    // Listen for all chat events
    const eventTypes = [
      'chat-conversations-updated',
      'conversation-marked-as-read', 
      'cross-browser-chat-refresh'
    ];
    
    eventTypes.forEach(eventType => {
      window.addEventListener(eventType, (event) => {
        // 🎯 PHASE 1 FIX: Only log in non-development mode or for urgent events
        if (!isDevelopmentMode || event.detail?.urgent) {
          console.log(`📡 [CrossBrowserFix] Event received: ${eventType}`, event.detail);
        }
        
        // Auto-apply emergency fix if urgent message from other user
        if (event.detail?.urgent && event.detail?.isFromOtherUser) {
          console.log('🚨 [CrossBrowserFix] Urgent message from other user detected, applying auto-fix...');
          setTimeout(() => this.emergencyFixCrossBrowser(), 500);
        }
      });
    });
    
    if (isDevelopmentMode) {
      console.log(`🔇 [CrossBrowserFix] Development mode: Reduced monitoring frequency to ${MONITORING_INTERVAL/1000}s`);
    }
    
    return true;
  },
  
  // Periodic health check
  periodicHealthCheck: function() {
    if (window.DISABLE_CROSS_BROWSER_MONITORING) return { disabled: true };
    
    // 🎯 PHASE 1 FIX: Quieter logging in development
    if (isDevelopmentMode) {
      // Only log health check results, not the "Running periodic health check" message
    } else {
      console.log('❤️ [CrossBrowserFix] Running periodic health check...');
    }
    
    const authUser = window.useOptimizedAuth?.getState?.()?.user;
    const conversations = window.useConversationStore?.getState?.()?.conversations || [];
    const realtimeConnected = window.useRealtimeStore?.getState?.()?.isConnected;
    
    const health = {
      authenticated: !!authUser?.id,
      conversationsLoaded: conversations.length > 0,
      realtimeConnected: !!realtimeConnected,
      timestamp: new Date().toISOString()
    };
    
    // 🎯 PHASE 1 FIX: Only log health check results if there are issues or in production
    if (!isDevelopmentMode || !health.authenticated || !health.conversationsLoaded) {
      console.log('📊 [CrossBrowserFix] Health check:', health);
    }
    
    // Auto-fix if issues detected
    if (health.authenticated && !health.conversationsLoaded) {
      console.log('🔧 [CrossBrowserFix] Issue detected: User authenticated but no conversations. Applying fix...');
      this.emergencyFixCrossBrowser();
    }
    
    return health;
  },
  
  // 🎯 PHASE 1 FIX: Method to disable monitoring
  disableMonitoring: function() {
    window.DISABLE_CROSS_BROWSER_MONITORING = true;
    if (this.monitoringIntervalId) {
      clearInterval(this.monitoringIntervalId);
      this.monitoringIntervalId = null;
    }
    if (this.healthCheckIntervalId) {
      clearInterval(this.healthCheckIntervalId);
      this.healthCheckIntervalId = null;
    }
    console.log('🔇 [CrossBrowserFix] Monitoring disabled');
  },
  
  // 🎯 PHASE 1 FIX: Method to enable monitoring
  enableMonitoring: function() {
    window.DISABLE_CROSS_BROWSER_MONITORING = false;
    this.startEnhancedMonitoring();
    this.startHealthChecks();
    console.log('🔊 [CrossBrowserFix] Monitoring enabled');
  }
};

// Auto-initialize enhanced monitoring
window.realtimeCrossBrowserFix.startEnhancedMonitoring();

// 🎯 PHASE 1 FIX: Use variable interval for health checks based on environment
const healthCheckIntervalId = setInterval(() => {
  window.realtimeCrossBrowserFix.periodicHealthCheck();
}, HEALTH_CHECK_INTERVAL);

// Store interval ID for cleanup
window.realtimeCrossBrowserFix.healthCheckIntervalId = healthCheckIntervalId;

// Listen for page visibility changes and auto-fix
document.addEventListener('visibilitychange', () => {
  if (!document.hidden && !window.DISABLE_CROSS_BROWSER_MONITORING) {
    if (isDevelopmentMode) {
      // 🎯 PHASE 1 FIX: Quieter logging in development
      console.log('👁️ [CrossBrowserFix] Page visible - auto-fix ready');
    } else {
      console.log('👁️ [CrossBrowserFix] Page became visible, running auto-fix...');
    }
    setTimeout(() => {
      window.realtimeCrossBrowserFix.emergencyFixCrossBrowser();
    }, 1000);
  }
});

console.log('✅ [CrossBrowserFix] Cross-browser real-time fix loaded successfully!');

// 🎯 PHASE 1 FIX: Only show commands in non-development mode to reduce noise
if (!isDevelopmentMode) {
  console.log('📋 [CrossBrowserFix] Available commands:');
  console.log('  - window.realtimeCrossBrowserFix.diagnoseRealtimeConnections()');
  console.log('  - window.realtimeCrossBrowserFix.forceReconnectRealtime()');
  console.log('  - window.realtimeCrossBrowserFix.emergencyFixCrossBrowser()');
  console.log('  - window.realtimeCrossBrowserFix.testMessageReception()');
  console.log('🌐 Enhanced monitoring active for Safari ↔ Chrome message sync!');
} else {
  console.log('🔇 [CrossBrowserFix] Development mode: Reduced console output. Use window.realtimeCrossBrowserFix.enableMonitoring() to see full logs.');
} 