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
     * Analyze current bottom nav state
     */
    analyzeBottomNavState() {
      const snapshot = this.getCurrentSnapshot();
      
      // Compare with last snapshot
      if (this.state.lastSnapshot) {
        this.compareSnapshots(this.state.lastSnapshot, snapshot);
      }
      
      this.state.lastSnapshot = snapshot;
      
      // Log issues
      if (snapshot.issues.length > 0) {
        console.log('🚨 [BottomNavDeepDiagnostic] Issues detected:', snapshot.issues);
      }
    },

    /**
     * Get current comprehensive snapshot
     */
    getCurrentSnapshot() {
      // Find bottom nav element
      const bottomNav = document.querySelector('nav[class*="bottom-"]') || 
                       document.querySelector('.bottom-nav') || 
                       document.querySelector('nav:last-of-type') ||
                       document.querySelector('[class*="fixed"][class*="bottom-0"]');
      
      const snapshot = {
        timestamp: Date.now(),
        element: {
          found: !!bottomNav,
          tagName: bottomNav?.tagName,
          className: bottomNav?.className,
          id: bottomNav?.id
        },
        dimensions: bottomNav ? {
          width: bottomNav.offsetWidth,
          height: bottomNav.offsetHeight,
          clientWidth: bottomNav.clientWidth,
          clientHeight: bottomNav.clientHeight,
          scrollWidth: bottomNav.scrollWidth,
          scrollHeight: bottomNav.scrollHeight
        } : null,
        position: bottomNav ? bottomNav.getBoundingClientRect() : null,
        styles: bottomNav ? {
          display: getComputedStyle(bottomNav).display,
          visibility: getComputedStyle(bottomNav).visibility,
          opacity: getComputedStyle(bottomNav).opacity,
          zIndex: getComputedStyle(bottomNav).zIndex,
          position: getComputedStyle(bottomNav).position,
          bottom: getComputedStyle(bottomNav).bottom,
          transform: getComputedStyle(bottomNav).transform
        } : null,
        viewport: {
          innerWidth: window.innerWidth,
          innerHeight: window.innerHeight,
          outerWidth: window.outerWidth,
          outerHeight: window.outerHeight,
          screenWidth: window.screen.width,
          screenHeight: window.screen.height,
          visualViewportWidth: window.visualViewport?.width,
          visualViewportHeight: window.visualViewport?.height,
          devicePixelRatio: window.devicePixelRatio
        },
        mediaQueries: {
          mobile640: window.matchMedia("(max-width: 640px)").matches,
          mobile768: window.matchMedia("(max-width: 768px)").matches,
          smBreakpoint: window.matchMedia("(min-width: 640px)").matches
        },
        chatOverlay: {
          overlayElement: document.querySelector('[class*="chat"][class*="overlay"]') || 
                         document.querySelector('[class*="GlobalChatOverlay"]'),
          isOverlayOpen: document.body.style.overflow === 'hidden',
          backdropElement: document.querySelector('[class*="backdrop"]')
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
      }
      
      // Check if hidden by responsive breakpoint
      if (snapshot.mediaQueries.smBreakpoint) {
        snapshot.issues.push('RESPONSIVE_HIDDEN: Element may be hidden by sm:hidden breakpoint');
      }
      
      return snapshot;
    },

    /**
     * Compare snapshots to detect changes
     */
    compareSnapshots(prev, current) {
      const changes = [];
      
      // Check dimension changes
      if (prev.dimensions && current.dimensions) {
        if (prev.dimensions.width !== current.dimensions.width || 
            prev.dimensions.height !== current.dimensions.height) {
          changes.push(`DIMENSIONS_CHANGED: ${prev.dimensions.width}x${prev.dimensions.height} → ${current.dimensions.width}x${current.dimensions.height}`);
        }
      }
      
      // Check style changes
      if (prev.styles && current.styles) {
        Object.keys(prev.styles).forEach(key => {
          if (prev.styles[key] !== current.styles[key]) {
            changes.push(`STYLE_CHANGED: ${key}: ${prev.styles[key]} → ${current.styles[key]}`);
          }
        });
      }
      
      // Check media query changes
      Object.keys(prev.mediaQueries).forEach(key => {
        if (prev.mediaQueries[key] !== current.mediaQueries[key]) {
          changes.push(`MEDIA_QUERY_CHANGED: ${key}: ${prev.mediaQueries[key]} → ${current.mediaQueries[key]}`);
        }
      });
      
      if (changes.length > 0) {
        this.logEvent('CHANGES_DETECTED', changes);
      }
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
      const bottomNav = document.querySelector('nav[class*="bottom-"]') || 
                       document.querySelector('.bottom-nav') || 
                       document.querySelector('nav:last-of-type') ||
                       document.querySelector('[class*="fixed"][class*="bottom-0"]');
      
      if (bottomNav) {
        // Force visible styles
        bottomNav.style.display = 'block';
        bottomNav.style.visibility = 'visible';
        bottomNav.style.opacity = '1';
        bottomNav.style.height = 'auto';
        bottomNav.style.width = '100%';
        bottomNav.style.position = 'fixed';
        bottomNav.style.bottom = '0';
        bottomNav.style.zIndex = '9999';
        
        console.log('🔧 [BottomNavDeepDiagnostic] Forced bottom nav to be visible');
        return true;
      } else {
        console.log('❌ [BottomNavDeepDiagnostic] Bottom nav element not found to force show');
        return false;
      }
    },

    /**
     * Check for React component conditions
     */
    checkReactConditions() {
      console.log('🔍 [BottomNavDeepDiagnostic] Checking React component conditions...');
      
      // Try to find React DevTools info
      const reactInfo = {
        reactDetected: !!window.React || !!window.__REACT_DEVTOOLS_GLOBAL_HOOK__,
        reactVersion: window.React?.version
      };
      
      console.log('⚛️ React Info:', reactInfo);
      
      // Check if BottomNav component is rendering
      const bottomNavElements = document.querySelectorAll('[data-testid*="bottom"], [aria-label*="bottom"], nav[class*="bottom"]');
      console.log('📍 Bottom nav related elements found:', bottomNavElements.length);
      
      bottomNavElements.forEach((el, index) => {
        console.log(`   ${index + 1}. ${el.tagName} - ${el.className}`);
      });
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
      const recentEvents = this.state.events.slice(-20);
      
      const report = {
        currentState: snapshot,
        recentEvents,
        summary: {
          elementFound: snapshot.element.found,
          isVisible: snapshot.dimensions && snapshot.dimensions.width > 0 && snapshot.dimensions.height > 0,
          issueCount: snapshot.issues.length,
          majorIssues: snapshot.issues.filter(issue => 
            issue.includes('NOT_FOUND') || 
            issue.includes('ZERO_DIMENSIONS') || 
            issue.includes('DISPLAY_NONE')
          )
        },
        recommendations: this.getRecommendations(snapshot)
      };
      
      console.log('📋 [BottomNavDeepDiagnostic] COMPREHENSIVE REPORT:', report);
      return report;
    },

    /**
     * Get recommendations based on current state
     */
    getRecommendations(snapshot) {
      const recommendations = [];
      
      if (!snapshot.element.found) {
        recommendations.push('Check if BottomNav component is being rendered by React');
        recommendations.push('Verify component conditions (isMobile, isKeyboardOpen, etc.)');
      }
      
      if (snapshot.dimensions && (snapshot.dimensions.width === 0 || snapshot.dimensions.height === 0)) {
        if (snapshot.styles.display === 'none') {
          recommendations.push('Element has display: none - check CSS classes');
        }
        if (snapshot.mediaQueries.smBreakpoint) {
          recommendations.push('Element may be hidden by sm:hidden responsive class on larger screens');
        }
      }
      
      return recommendations;
    }
  };

  // Make available globally
  window.bottomNavDeepDiagnostic = BottomNavDeepDiagnostic;
  
  console.log(`
🔍 Bottom Navigation Deep Diagnostic Ready!

Commands:
• window.bottomNavDeepDiagnostic.startDiagnostic() - Start comprehensive monitoring
• window.bottomNavDeepDiagnostic.getCurrentSnapshot() - Get current state
• window.bottomNavDeepDiagnostic.generateReport() - Get detailed report
• window.bottomNavDeepDiagnostic.forceShowBottomNav() - Force show for testing
• window.bottomNavDeepDiagnostic.checkReactConditions() - Check React component state
• window.bottomNavDeepDiagnostic.stopDiagnostic() - Stop monitoring

This will help identify exactly why the bottom nav has 0x0 dimensions!
  `);

})(); 