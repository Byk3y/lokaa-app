/**
 * Bottom Navigation Deep Diagnostic
 * 
 * Comprehensive debugging to find why bottom nav has 0x0 dimensions
 */

(function() {
  'use strict';

  const BottomNavDeepDiagnostic = {
    
    // State tracking
    state: {
      isRunning: false,
      intervalId: null,
      events: [],
      lastSnapshot: null
    },

    /**
     * Start comprehensive bottom nav debugging
     */
    startDiagnostic() {
      console.log('🔍 [BottomNavDeepDiagnostic] Starting comprehensive bottom nav analysis...');
      
      this.state.isRunning = true;
      this.state.events = [];
      
      // Monitor continuously
      this.state.intervalId = setInterval(() => {
        this.analyzeBottomNavState();
      }, 1000);
      
      // Monitor media query changes
      this.monitorMediaQueries();
      
      // Monitor viewport changes
      this.monitorViewportChanges();
      
      // Monitor chat overlay events
      this.monitorChatEvents();
      
      return {
        stop: () => this.stopDiagnostic(),
        getSnapshot: () => this.getCurrentSnapshot(),
        getEvents: () => this.state.events
      };
    },

    /**
     * Get current comprehensive snapshot
     */
    getCurrentSnapshot() {
      // Find bottom nav element with multiple selectors
      const selectors = [
        'nav[class*="bottom-"]',
        '.bottom-nav',
        'nav:last-of-type',
        '[class*="fixed"][class*="bottom-0"]',
        'nav[class*="fixed"]',
        '[class*="sm:hidden"]'
      ];
      
      let bottomNav = null;
      let usedSelector = '';
      
      for (const selector of selectors) {
        bottomNav = document.querySelector(selector);
        if (bottomNav) {
          usedSelector = selector;
          break;
        }
      }
      
      const snapshot = {
        timestamp: Date.now(),
        element: {
          found: !!bottomNav,
          selector: usedSelector,
          tagName: bottomNav?.tagName,
          className: bottomNav?.className,
          id: bottomNav?.id,
          innerHTML: bottomNav?.innerHTML?.substring(0, 200) + '...'
        },
        dimensions: bottomNav ? {
          width: bottomNav.offsetWidth,
          height: bottomNav.offsetHeight,
          clientWidth: bottomNav.clientWidth,
          clientHeight: bottomNav.clientHeight
        } : null,
        position: bottomNav ? bottomNav.getBoundingClientRect() : null,
        styles: bottomNav ? {
          display: getComputedStyle(bottomNav).display,
          visibility: getComputedStyle(bottomNav).visibility,
          opacity: getComputedStyle(bottomNav).opacity,
          zIndex: getComputedStyle(bottomNav).zIndex,
          position: getComputedStyle(bottomNav).position,
          bottom: getComputedStyle(bottomNav).bottom,
          height: getComputedStyle(bottomNav).height,
          width: getComputedStyle(bottomNav).width
        } : null,
        viewport: {
          innerWidth: window.innerWidth,
          innerHeight: window.innerHeight,
          visualViewportWidth: window.visualViewport?.width,
          visualViewportHeight: window.visualViewport?.height
        },
        mediaQueries: {
          mobile640: window.matchMedia("(max-width: 640px)").matches,
          mobile768: window.matchMedia("(max-width: 768px)").matches,
          smBreakpoint: window.matchMedia("(min-width: 640px)").matches
        },
        issues: []
      };
      
      // Analyze issues
      if (!snapshot.element.found) {
        snapshot.issues.push('ELEMENT_NOT_FOUND: Bottom nav element not found in DOM');
      } else if (snapshot.dimensions.width === 0 || snapshot.dimensions.height === 0) {
        snapshot.issues.push('ZERO_DIMENSIONS: Element has 0 width or height');
        
        if (snapshot.styles.display === 'none') {
          snapshot.issues.push('CSS_DISPLAY_NONE: Element has display: none');
        }
        if (snapshot.styles.visibility === 'hidden') {
          snapshot.issues.push('CSS_VISIBILITY_HIDDEN: Element has visibility: hidden');
        }
        if (snapshot.styles.opacity === '0') {
          snapshot.issues.push('CSS_OPACITY_ZERO: Element has opacity: 0');
        }
        if (snapshot.styles.height === '0px') {
          snapshot.issues.push('CSS_HEIGHT_ZERO: Element has height: 0px');
        }
      }
      
      // Check if hidden by responsive breakpoint
      if (snapshot.mediaQueries.smBreakpoint && bottomNav?.className.includes('sm:hidden')) {
        snapshot.issues.push('RESPONSIVE_HIDDEN: Element hidden by sm:hidden on larger screens');
      }
      
      return snapshot;
    },

    /**
     * Monitor media query changes
     */
    monitorMediaQueries() {
      const queries = [
        { name: 'mobile640', query: '(max-width: 640px)' },
        { name: 'mobile768', query: '(max-width: 768px)' },
        { name: 'smBreakpoint', query: '(min-width: 640px)' }
      ];
      
      queries.forEach(({ name, query }) => {
        const mediaQuery = window.matchMedia(query);
        const handler = (e) => {
          this.logEvent('MEDIA_QUERY_CHANGE', `${name}: ${e.matches}`);
          
          // Log potential issues
          if (name === 'smBreakpoint' && e.matches) {
            console.log('⚠️ [BottomNavDeepDiagnostic] Screen is now above sm breakpoint - bottom nav may be hidden by sm:hidden');
          }
        };
        mediaQuery.addEventListener('change', handler);
      });
    },

    /**
     * Monitor viewport changes
     */
    monitorViewportChanges() {
      if (window.visualViewport) {
        window.visualViewport.addEventListener('resize', () => {
          this.logEvent('VISUAL_VIEWPORT_RESIZE', {
            width: window.visualViewport.width,
            height: window.visualViewport.height
          });
        });
      }
      
      window.addEventListener('resize', () => {
        this.logEvent('WINDOW_RESIZE', {
          innerWidth: window.innerWidth,
          innerHeight: window.innerHeight
        });
      });
    },

    /**
     * Monitor chat overlay events
     */
    monitorChatEvents() {
      window.addEventListener('openGlobalChat', (e) => {
        this.logEvent('CHAT_OVERLAY_OPEN', e.detail);
      });
      
      window.addEventListener('closeGlobalChat', () => {
        this.logEvent('CHAT_OVERLAY_CLOSE', null);
      });
    },

    /**
     * Analyze current bottom nav state
     */
    analyzeBottomNavState() {
      const snapshot = this.getCurrentSnapshot();
      
      // Log issues if found
      if (snapshot.issues.length > 0) {
        console.log('🚨 [BottomNavDeepDiagnostic] Issues:', snapshot.issues);
      }
      
      // Store snapshot
      this.state.lastSnapshot = snapshot;
    },

    /**
     * Log an event
     */
    logEvent(type, data) {
      const event = {
        timestamp: Date.now(),
        type,
        data
      };
      
      this.state.events.push(event);
      console.log(`🔍 [BottomNavDeepDiagnostic] ${type}:`, data);
    },

    /**
     * Force show bottom nav (for testing)
     */
    forceShowBottomNav() {
      const snapshot = this.getCurrentSnapshot();
      const bottomNav = document.querySelector('nav[class*="bottom-"]') || 
                       document.querySelector('.bottom-nav') || 
                       document.querySelector('nav:last-of-type') ||
                       document.querySelector('[class*="fixed"][class*="bottom-0"]');
      
      if (bottomNav) {
        // Force visible styles
        bottomNav.style.display = 'block !important';
        bottomNav.style.visibility = 'visible !important';
        bottomNav.style.opacity = '1 !important';
        bottomNav.style.height = 'auto !important';
        bottomNav.style.width = '100% !important';
        bottomNav.style.position = 'fixed !important';
        bottomNav.style.bottom = '0 !important';
        bottomNav.style.zIndex = '9999 !important';
        
        console.log('🔧 [BottomNavDeepDiagnostic] Forced bottom nav to be visible');
        
        // Check result
        setTimeout(() => {
          const newSnapshot = this.getCurrentSnapshot();
          console.log('📊 After force show:', {
            before: snapshot.dimensions,
            after: newSnapshot.dimensions
          });
        }, 100);
        
        return true;
      } else {
        console.log('❌ [BottomNavDeepDiagnostic] Bottom nav element not found to force show');
        return false;
      }
    },

    /**
     * Check all potential bottom nav elements
     */
    findAllBottomNavElements() {
      const selectors = [
        'nav',
        '[class*="bottom"]',
        '[class*="fixed"]',
        '[class*="sm:hidden"]',
        '.bg-\\[\\#171E2E\\]'
      ];
      
      console.log('🔍 [BottomNavDeepDiagnostic] Searching for all potential bottom nav elements...');
      
      selectors.forEach(selector => {
        try {
          const elements = document.querySelectorAll(selector);
          console.log(`   ${selector}: ${elements.length} elements found`);
          
          elements.forEach((el, index) => {
            const rect = el.getBoundingClientRect();
            const styles = getComputedStyle(el);
            console.log(`     ${index + 1}. ${el.tagName} - ${el.className.substring(0, 50)}... (${rect.width}x${rect.height}, display: ${styles.display})`);
          });
        } catch (error) {
          console.log(`   ${selector}: Error - ${error.message}`);
        }
      });
    },

    /**
     * Check React conditions
     */
    checkReactConditions() {
      console.log('🔍 [BottomNavDeepDiagnostic] Checking potential React component conditions...');
      
      // Check if we're on mobile
      const isMobile = window.innerWidth <= 640;
      console.log('📱 isMobile (innerWidth <= 640):', isMobile);
      
      // Check media queries
      const mediaQueries = {
        'max-width: 640px': window.matchMedia("(max-width: 640px)").matches,
        'max-width: 768px': window.matchMedia("(max-width: 768px)").matches,
        'min-width: 640px': window.matchMedia("(min-width: 640px)").matches
      };
      console.log('📐 Media queries:', mediaQueries);
      
      // Estimate keyboard detection
      const viewportHeight = window.visualViewport?.height || window.innerHeight;
      const windowHeight = window.screen.height;
      const keyboardThreshold = windowHeight * 0.75;
      const keyboardDetected = viewportHeight < keyboardThreshold;
      console.log('⌨️ Keyboard detection:', {
        viewportHeight,
        windowHeight,
        threshold: keyboardThreshold,
        keyboardDetected
      });
      
      // Check chat overlay state
      const chatOverlayOpen = document.body.style.overflow === 'hidden';
      console.log('💬 Chat overlay detected:', chatOverlayOpen);
      
      // Predict BottomNav conditions
      const shouldBeVisible = isMobile && (!keyboardDetected || chatOverlayOpen);
      console.log('✅ Predicted BottomNav should be visible:', shouldBeVisible);
      
      return {
        isMobile,
        mediaQueries,
        keyboardDetected,
        chatOverlayOpen,
        shouldBeVisible
      };
    },

    /**
     * Stop diagnostic
     */
    stopDiagnostic() {
      if (this.state.intervalId) {
        clearInterval(this.state.intervalId);
        this.state.intervalId = null;
      }
      
      this.state.isRunning = false;
      console.log('🔍 [BottomNavDeepDiagnostic] Diagnostic stopped');
    },

    /**
     * Generate comprehensive report
     */
    generateReport() {
      const snapshot = this.getCurrentSnapshot();
      const conditions = this.checkReactConditions();
      
      const report = {
        summary: {
          elementFound: snapshot.element.found,
          isVisible: snapshot.dimensions && snapshot.dimensions.width > 0 && snapshot.dimensions.height > 0,
          issueCount: snapshot.issues.length,
          shouldBeVisible: conditions.shouldBeVisible
        },
        currentState: snapshot,
        reactConditions: conditions,
        issues: snapshot.issues,
        recommendations: []
      };
      
      // Generate recommendations
      if (!snapshot.element.found) {
        report.recommendations.push('BottomNav component may not be rendering - check React conditions');
      }
      
      if (snapshot.element.found && (snapshot.dimensions.width === 0 || snapshot.dimensions.height === 0)) {
        if (conditions.shouldBeVisible) {
          report.recommendations.push('Element should be visible but has 0 dimensions - check CSS');
        } else {
          report.recommendations.push('Element correctly hidden due to React conditions');
        }
      }
      
      if (snapshot.mediaQueries.smBreakpoint && snapshot.element.className?.includes('sm:hidden')) {
        report.recommendations.push('Element hidden by sm:hidden responsive class - may be screen size issue');
      }
      
      console.log('📋 [BottomNavDeepDiagnostic] COMPREHENSIVE REPORT:', report);
      return report;
    }
  };

  // Make available globally
  window.bottomNavDeepDiagnostic = BottomNavDeepDiagnostic;
  
  console.log(`
🔍 Bottom Navigation Deep Diagnostic Ready!

Quick Commands:
• window.bottomNavDeepDiagnostic.getCurrentSnapshot() - Get current state
• window.bottomNavDeepDiagnostic.generateReport() - Get detailed analysis  
• window.bottomNavDeepDiagnostic.checkReactConditions() - Check component conditions
• window.bottomNavDeepDiagnostic.findAllBottomNavElements() - Find all potential elements
• window.bottomNavDeepDiagnostic.forceShowBottomNav() - Force show for testing

This will help identify exactly why the bottom nav has 0x0 dimensions!
  `);

})(); 