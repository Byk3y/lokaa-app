// Safari Chat Fix Validation Script
// Tests Safari-specific chat popover and modal transition fixes

window.testSafariChatFix = {
  // Browser detection
  isSafari: /^((?!chrome|android).)*safari/i.test(navigator.userAgent),
  
  // Test Safari detection
  testSafariDetection() {
    console.log('🦄 [SafariTest] Safari detected:', this.isSafari);
    console.log('🦄 [SafariTest] User agent:', navigator.userAgent);
    return this.isSafari;
  },
  
  // Test transition timing
  testTransitionTiming() {
    const startTime = performance.now();
    console.log('🦄 [SafariTest] Starting transition timing test...');
    
    // Monitor for chat events
    const monitoringData = {
      popoverClose: null,
      modalOpen: null,
      gap: null
    };
    
    // Listen for popover events
    const originalPopoverClose = window.console.log;
    
    // Override console.log temporarily to catch timing logs
    const originalLog = console.log;
    console.log = function(...args) {
      const message = args.join(' ');
      
      if (message.includes('Popover closed at:')) {
        monitoringData.popoverClose = performance.now();
        console.log('🦄 [SafariTest] Captured popover close at:', monitoringData.popoverClose);
      }
      
      if (message.includes('Modal opened at:')) {
        monitoringData.modalOpen = performance.now();
        if (monitoringData.popoverClose) {
          monitoringData.gap = monitoringData.modalOpen - monitoringData.popoverClose;
          console.log('🦄 [SafariTest] Transition gap:', monitoringData.gap + 'ms');
          
          if (monitoringData.gap > 500) {
            console.warn('🦄 [SafariTest] ⚠️ Large transition gap detected!', monitoringData.gap + 'ms');
          } else {
            console.log('🦄 [SafariTest] ✅ Transition gap looks good:', monitoringData.gap + 'ms');
          }
        }
      }
      
      // Call original log
      originalLog.apply(console, args);
    };
    
    return {
      startTime,
      monitoringData,
      restore: () => {
        console.log = originalLog;
        console.log('🦄 [SafariTest] Monitoring restored');
      }
    };
  },
  
  // Test Safari-specific CSS
  testSafariCSS() {
    console.log('🦄 [SafariTest] Testing Safari-specific CSS...');
    
    // Check if Safari-specific CSS rules exist
    const styleSheets = Array.from(document.styleSheets);
    let safariRulesFound = 0;
    
    try {
      styleSheets.forEach(sheet => {
        if (sheet.cssRules) {
          Array.from(sheet.cssRules).forEach(rule => {
            if (rule.cssText && rule.cssText.includes('chat-modal-safari-fix')) {
              safariRulesFound++;
              console.log('🦄 [SafariTest] Found Safari CSS rule:', rule.cssText);
            }
          });
        }
      });
    } catch (e) {
      console.warn('🦄 [SafariTest] Could not access CSS rules:', e.message);
    }
    
    console.log('🦄 [SafariTest] Safari CSS rules found:', safariRulesFound);
    return safariRulesFound > 0;
  },
  
  // Test popover element classes
  testPopoverClasses() {
    console.log('🦄 [SafariTest] Testing popover classes...');
    
    // Look for popover elements
    const popovers = document.querySelectorAll('[data-radix-popover-content]');
    console.log('🦄 [SafariTest] Found popovers:', popovers.length);
    
    popovers.forEach((popover, index) => {
      console.log(`🦄 [SafariTest] Popover ${index + 1} classes:`, popover.className);
      
      const hasSafariClass = popover.classList.contains('chat-modal-safari-fix');
      const hasImmediateClose = popover.classList.contains('chat-popover-immediate-close');
      
      console.log(`🦄 [SafariTest] Popover ${index + 1}:`, {
        hasSafariClass,
        hasImmediateClose,
        shouldHaveSafariClass: this.isSafari
      });
    });
    
    return popovers.length;
  },
  
  // Test conversation selection with timing
  testConversationSelection() {
    console.log('🦄 [SafariTest] Testing conversation selection timing...');
    
    const monitor = this.testTransitionTiming();
    
    setTimeout(() => {
      console.log('🦄 [SafariTest] Please click on a chat conversation now...');
      console.log('🦄 [SafariTest] Monitoring will run for 30 seconds');
    }, 1000);
    
    // Auto-restore after 30 seconds
    setTimeout(() => {
      monitor.restore();
      console.log('🦄 [SafariTest] Test completed. Results:', monitor.monitoringData);
    }, 30000);
    
    return monitor;
  },
  
  // Run all tests
  runAllTests() {
    console.log('🦄 [SafariTest] Running comprehensive Safari chat fix tests...');
    console.log('🦄 [SafariTest] ==========================================');
    
    const results = {
      safariDetected: this.testSafariDetection(),
      safariCSSFound: this.testSafariCSS(),
      popoversFound: this.testPopoverClasses(),
      timestamp: new Date().toISOString()
    };
    
    console.log('🦄 [SafariTest] Test Results:', results);
    
    if (results.safariDetected) {
      console.log('🦄 [SafariTest] Safari detected - all fixes should be active');
      if (results.safariCSSFound) {
        console.log('🦄 [SafariTest] ✅ Safari CSS fixes are loaded');
      } else {
        console.warn('🦄 [SafariTest] ⚠️ Safari CSS fixes not found');
      }
    } else {
      console.log('🦄 [SafariTest] Not Safari - fixes should be inactive');
    }
    
    console.log('🦄 [SafariTest] To test transitions, run: window.testSafariChatFix.testConversationSelection()');
    
    return results;
  },
  
  // Quick fix for immediate Safari issues
  emergencyPatch() {
    if (!this.isSafari) {
      console.log('🦄 [SafariTest] Not Safari - emergency patch not needed');
      return;
    }
    
    console.log('🦄 [SafariTest] Applying emergency Safari patches...');
    
    // Force immediate transitions for all popover elements
    const style = document.createElement('style');
    style.textContent = `
      /* Emergency Safari Chat Fixes */
      [data-radix-popover-content] {
        transition: none !important;
        animation: none !important;
      }
      
      [data-state="closed"][data-radix-popover-content] {
        opacity: 0 !important;
        pointer-events: none !important;
        display: none !important;
      }
      
      .chat-popover-immediate-close,
      .chat-modal-safari-fix {
        transition: none !important;
        animation: none !important;
      }
    `;
    document.head.appendChild(style);
    
    console.log('🦄 [SafariTest] ✅ Emergency patches applied');
    
    return style;
  }
};

// Auto-run basic tests if Safari is detected
if (window.testSafariChatFix.isSafari) {
  console.log('🦄 [SafariTest] Safari detected - running initial tests...');
  setTimeout(() => {
    window.testSafariChatFix.runAllTests();
  }, 1000);
}

// Export for easy access
window.safariChatTest = window.testSafariChatFix; 