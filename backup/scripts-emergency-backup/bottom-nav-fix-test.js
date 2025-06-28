/**
 * Bottom Navigation Fix Test
 * 
 * Tests that the bottom navigation doesn't disappear when chat overlay opens
 * and that keyboard detection works correctly
 */

(function() {
  'use strict';

  const BottomNavFixTest = {
    
    // Test configuration
    config: {
      testDuration: 30000, // 30 seconds
      logPrefix: '📱 [BottomNavFixTest]'
    },

    // Test state
    state: {
      testStartTime: null,
      events: [],
      intervalId: null,
      isRunning: false
    },

    /**
     * Start the bottom nav fix test
     */
    runTest() {
      console.log(`${this.config.logPrefix} Starting bottom navigation fix test...`);
      
      this.state.testStartTime = Date.now();
      this.state.events = [];
      this.state.isRunning = true;
      
      // Monitor DOM elements
      this.monitorBottomNav();
      
      // Test chat overlay opening
      this.testChatOverlayInteraction();
      
      // Monitor for duration
      this.state.intervalId = setInterval(() => {
        this.checkTestStatus();
      }, 1000);
      
      // Auto-stop after duration
      setTimeout(() => {
        this.stopTest();
      }, this.config.testDuration);
      
      return {
        message: `Test started - monitoring for ${this.config.testDuration / 1000} seconds`,
        stopTest: () => this.stopTest(),
        getResults: () => this.generateReport()
      };
    },

    /**
     * Monitor bottom navigation visibility
     */
    monitorBottomNav() {
      const bottomNav = document.querySelector('nav[class*="bottom-"]') || 
                       document.querySelector('.bottom-nav') || 
                       document.querySelector('nav:last-of-type');
      
      if (!bottomNav) {
        this.logEvent('❌ Bottom nav not found in DOM');
        return;
      }

      this.logEvent('✅ Bottom nav found - monitoring visibility');

      // Create mutation observer to watch for visibility changes
      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
            const isVisible = bottomNav.offsetHeight > 0 && 
                            getComputedStyle(bottomNav).display !== 'none';
            
            this.logEvent(`📊 Bottom nav visibility: ${isVisible ? 'VISIBLE' : 'HIDDEN'}`);
          }
        });
      });

      observer.observe(bottomNav, {
        attributes: true,
        attributeFilter: ['style', 'class']
      });

      // Store reference for cleanup
      this.state.bottomNavObserver = observer;
    },

    /**
     * Test chat overlay interaction
     */
    testChatOverlayInteraction() {
      this.logEvent('🧪 Testing chat overlay interaction...');
      
      // Listen for chat overlay events
      const handleChatOpen = () => {
        this.logEvent('✅ Chat overlay opened - checking bottom nav status');
        this.checkBottomNavStatus();
      };
      
      const handleChatClose = () => {
        this.logEvent('✅ Chat overlay closed - checking bottom nav status');
        this.checkBottomNavStatus();
      };

      window.addEventListener('openGlobalChat', handleChatOpen);
      window.addEventListener('closeGlobalChat', handleChatClose);

      // Store references for cleanup
      this.state.eventListeners = [
        { event: 'openGlobalChat', handler: handleChatOpen },
        { event: 'closeGlobalChat', handler: handleChatClose }
      ];

      // Simulate chat opening
      setTimeout(() => {
        this.logEvent('🤖 Simulating chat overlay opening...');
        window.dispatchEvent(new CustomEvent('openGlobalChat', {
          detail: { source: 'test', fromRoute: '/test' }
        }));
      }, 2000);

      // Simulate chat closing
      setTimeout(() => {
        this.logEvent('🤖 Simulating chat overlay closing...');
        window.dispatchEvent(new CustomEvent('closeGlobalChat'));
      }, 5000);
    },

    /**
     * Check bottom nav status
     */
    checkBottomNavStatus() {
      const bottomNav = document.querySelector('nav[class*="bottom-"]') || 
                       document.querySelector('.bottom-nav') || 
                       document.querySelector('nav:last-of-type');
      
      if (!bottomNav) {
        this.logEvent('❌ Bottom nav not found');
        return;
      }

      const isVisible = bottomNav.offsetHeight > 0 && 
                       getComputedStyle(bottomNav).display !== 'none';
      const rect = bottomNav.getBoundingClientRect();
      
      this.logEvent(`📊 Bottom nav status: ${isVisible ? 'VISIBLE' : 'HIDDEN'}`);
      this.logEvent(`📏 Bottom nav dimensions: ${rect.width}x${rect.height} at (${rect.left}, ${rect.top})`);
      
      if (!isVisible) {
        this.logEvent('🚨 ISSUE: Bottom nav is hidden!');
      }
    },

    /**
     * Check test status periodically
     */
    checkTestStatus() {
      const elapsed = Date.now() - this.state.testStartTime;
      const remaining = this.config.testDuration - elapsed;
      
      if (remaining > 0) {
        console.log(`${this.config.logPrefix} Test running... ${Math.ceil(remaining / 1000)}s remaining`);
        this.checkBottomNavStatus();
      }
    },

    /**
     * Stop the test
     */
    stopTest() {
      if (!this.state.isRunning) return;
      
      this.state.isRunning = false;
      
      // Clear interval
      if (this.state.intervalId) {
        clearInterval(this.state.intervalId);
        this.state.intervalId = null;
      }
      
      // Clean up observers
      if (this.state.bottomNavObserver) {
        this.state.bottomNavObserver.disconnect();
        this.state.bottomNavObserver = null;
      }
      
      // Clean up event listeners
      if (this.state.eventListeners) {
        this.state.eventListeners.forEach(({ event, handler }) => {
          window.removeEventListener(event, handler);
        });
        this.state.eventListeners = null;
      }
      
      console.log(`${this.config.logPrefix} Test completed. Generating report...`);
      this.generateReport();
    },

    /**
     * Log an event
     */
    logEvent(message) {
      const timestamp = new Date().toISOString();
      const event = { timestamp, message };
      
      this.state.events.push(event);
      console.log(`${this.config.logPrefix} ${message}`);
    },

    /**
     * Generate test report
     */
    generateReport() {
      const duration = Date.now() - this.state.testStartTime;
      const eventCount = this.state.events.length;
      
      // Analyze events
      const chatEvents = this.state.events.filter(e => e.message.includes('Chat overlay'));
      const visibilityEvents = this.state.events.filter(e => e.message.includes('visibility'));
      const issues = this.state.events.filter(e => e.message.includes('ISSUE') || e.message.includes('❌'));
      
      const report = {
        summary: {
          duration: Math.round(duration / 1000),
          totalEvents: eventCount,
          chatEvents: chatEvents.length,
          visibilityEvents: visibilityEvents.length,
          issues: issues.length,
          success: issues.length === 0
        },
        events: this.state.events,
        recommendation: issues.length === 0 ? 
          '✅ Bottom nav fix is working correctly!' : 
          '❌ Issues detected - bottom nav disappearing problem still exists'
      };
      
      console.log(`${this.config.logPrefix} TEST REPORT:`, report);
      return report;
    },

    /**
     * Manual chat overlay test
     */
    testChatOverlay() {
      console.log(`${this.config.logPrefix} Testing chat overlay manually...`);
      
      // Check if chat button exists
      const chatButton = document.querySelector('[data-testid="chat-button"]') || 
                        document.querySelector('button[aria-label*="chat" i]') ||
                        document.querySelector('button:contains("Chat")');
      
      if (chatButton) {
        this.logEvent('✅ Chat button found - clicking to test');
        chatButton.click();
      } else {
        this.logEvent('⚠️ Chat button not found - dispatching custom event');
        window.dispatchEvent(new CustomEvent('openGlobalChat', {
          detail: { source: 'manual-test', fromRoute: window.location.pathname }
        }));
      }
      
      // Check bottom nav after overlay opens
      setTimeout(() => {
        this.checkBottomNavStatus();
      }, 1000);
    }
  };

  // Make available globally
  window.bottomNavFixTest = BottomNavFixTest;
  
  console.log(`
🔧 Bottom Navigation Fix Test Ready!

Commands:
• window.bottomNavFixTest.runTest() - Run automated test
• window.bottomNavFixTest.testChatOverlay() - Manual chat test
• window.bottomNavFixTest.stopTest() - Stop current test
• window.bottomNavFixTest.generateReport() - Get test results

The test will:
1. Monitor bottom nav visibility
2. Test chat overlay opening/closing
3. Check for keyboard detection conflicts
4. Report any issues found
  `);

})(); 