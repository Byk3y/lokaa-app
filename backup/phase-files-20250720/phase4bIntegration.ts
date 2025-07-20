import { log } from '@/utils/logger';
/**
 * Phase 4B: User Analytics & A/B Testing Integration
 * 
 * This file initializes the analytics utility and exposes global testing functions
 * for development and debugging purposes.
 */

import { logAnalyticsEvent } from './analytics';

// Initialize analytics and expose global API
function initializePhase4B() {
  log.debug('Utils', '🔍 [Phase 4B] Initializing User Analytics & A/B Testing...');
  
  // The analytics utility automatically exposes window.analytics
  // Let's add some additional testing helpers
  
  if (typeof window !== 'undefined') {
    // Enhanced global API for testing
    (window as any).phase4b = {
      // Test basic event logging
      testEvent: () => {
        logAnalyticsEvent({
          event_type: 'test',
          event_name: 'Phase4BTestEvent',
          event_data: { 
            timestamp: Date.now(),
            test_type: 'manual',
            phase: '4B'
          }
        });
        log.debug('Utils', '✅ [Phase 4B] Test event logged');
      },
      
      // Test different event types
      testEventTypes: () => {
        const events = [
          { event_type: 'ui', event_name: 'ButtonClick', event_data: { button: 'test' } },
          { event_type: 'navigation', event_name: 'PageView', event_data: { page: '/test' } },
          { event_type: 'user', event_name: 'UserAction', event_data: { action: 'test' } },
          { event_type: 'system', event_name: 'SystemEvent', event_data: { system: 'test' } }
        ];
        
        events.forEach(event => logAnalyticsEvent(event));
        log.debug('Utils', `✅ [Phase 4B] ${events.length} test events logged`);
      },
      
      // Test A/B experiment logging
      testABExperiment: () => {
        logAnalyticsEvent({
          event_type: 'experiment',
          event_name: 'ABTestExposure',
          event_data: { feature: 'test_feature' },
          ab_experiment: 'test_experiment',
          ab_variant: 'variant_a'
        });
        log.debug('Utils', '✅ [Phase 4B] A/B test event logged');
      },
      
      // Force flush events
      flush: () => {
        if ((window as any).analytics?.flush) {
          (window as any).analytics.flush();
          log.debug('Utils', '✅ [Phase 4B] Events flushed to database');
        }
      },
      
      // Get current queue status
      getStatus: () => {
        const queue = (window as any).analytics?._queue || [];
        log.debug('Utils', `📊 [Phase 4B] Analytics Status:`, {
          queueLength: queue.length,
          analyticsLoaded: typeof (window as any).analytics !== 'undefined',
          phase4bLoaded: typeof (window as any).phase4b !== 'undefined'
        });
        return {
          queueLength: queue.length,
          analyticsLoaded: typeof (window as any).analytics !== 'undefined',
          phase4bLoaded: true
        };
      }
    };
    
    log.debug('Utils', '✅ [Phase 4B] Global testing API exposed at window.phase4b');
    log.debug('Utils', '🧪 [Phase 4B] Try: window.phase4b.testEvent() or window.phase4b.getStatus()');
  }
}

// Auto-initialize in browser environment
if (typeof window !== 'undefined') {
  // Initialize after a short delay to ensure analytics is loaded
  setTimeout(initializePhase4B, 100);
}

export { initializePhase4B }; 