// Safari Chat Modal Fix Test Script
// Tests that Safari no longer shows the expanded chat list in modals

window.testSafariModalFix = {
  // Browser detection
  isSafari: /^((?!chrome|android).)*safari/i.test(navigator.userAgent),
  
  // Test data
  testResults: {
    popoverOpen: false,
    modalOpen: false,
    fullscreenListDetected: false,
    compactListDetected: false,
    chatViewDetected: false,
    transition: null
  },
  
  // Monitor DOM for chat components
  startMonitoring() {
    console.log('🦄 [SafariModalTest] Starting Safari modal fix monitoring...');
    
    // Reset results
    this.testResults = {
      popoverOpen: false,
      modalOpen: false,
      fullscreenListDetected: false,
      compactListDetected: false,
      chatViewDetected: false,
      transition: null
    };
    
    // Monitor for popovers
    this.monitorPopover();
    
    // Monitor for modals
    this.monitorModal();
    
    // Monitor for chat components
    this.monitorChatComponents();
    
    console.log('🦄 [SafariModalTest] Monitoring active. Click on chat to test.');
  },
  
  // Monitor popover state
  monitorPopover() {
    const observer = new MutationObserver(() => {
      const popover = document.querySelector('[data-radix-popover-content]');
      
      if (popover && popover.getAttribute('data-state') === 'open') {
        if (!this.testResults.popoverOpen) {
          this.testResults.popoverOpen = true;
          console.log('🦄 [SafariModalTest] ✅ Popover opened');
        }
      } else if (this.testResults.popoverOpen) {
        this.testResults.popoverOpen = false;
        console.log('🦄 [SafariModalTest] ❌ Popover closed');
      }
    });
    
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['data-state']
    });
    
    return observer;
  },
  
  // Monitor modal state
  monitorModal() {
    const observer = new MutationObserver(() => {
      const modal = document.querySelector('[role="dialog"]');
      
      if (modal && modal.style.display !== 'none') {
        if (!this.testResults.modalOpen) {
          this.testResults.modalOpen = true;
          console.log('🦄 [SafariModalTest] ✅ Modal opened');
          
          // Check modal content after a brief delay
          setTimeout(() => {
            this.analyzeModalContent();
          }, 100);
        }
      } else if (this.testResults.modalOpen) {
        this.testResults.modalOpen = false;
        console.log('🦄 [SafariModalTest] ❌ Modal closed');
        this.logTestResults();
      }
    });
    
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['style', 'data-state']
    });
    
    return observer;
  },
  
  // Monitor chat components
  monitorChatComponents() {
    const observer = new MutationObserver(() => {
      // Check for fullscreen chat list (bad)
      const fullscreenList = document.querySelector('[data-testid="chat-list-fullscreen"], .chat-list-fullscreen');
      if (fullscreenList) {
        this.testResults.fullscreenListDetected = true;
        console.warn('🦄 [SafariModalTest] ⚠️ FULLSCREEN LIST DETECTED - This is the bug!');
      }
      
      // Check for chat view (good)
      const chatView = document.querySelector('[data-testid="chat-view"], .chat-view, div:has(textarea[placeholder*="message"])');
      if (chatView) {
        this.testResults.chatViewDetected = true;
        console.log('🦄 [SafariModalTest] ✅ Chat view detected');
      }
    });
    
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
    
    return observer;
  },
  
  // Analyze modal content
  analyzeModalContent() {
    console.log('🦄 [SafariModalTest] Analyzing modal content...');
    
    const modal = document.querySelector('[role="dialog"]');
    if (!modal) {
      console.log('🦄 [SafariModalTest] No modal found');
      return;
    }
    
    // Look for ChatListUnified with fullscreen variant
    const chatHeaders = modal.querySelectorAll('h2');
    for (const header of chatHeaders) {
      if (header.textContent === 'Chats') {
        const container = header.closest('div');
        
        // Check if this looks like a fullscreen list
        const hasHamburger = container.querySelector('button[aria-label="Open menu"]');
        const hasMoreOptions = container.querySelector('button[aria-label="More options"]');
        
        if (hasHamburger || hasMoreOptions) {
          this.testResults.fullscreenListDetected = true;
          console.warn('🦄 [SafariModalTest] ⚠️ FULLSCREEN LIST IN MODAL - This is the bug!');
        } else {
          this.testResults.compactListDetected = true;
          console.log('🦄 [SafariModalTest] ✅ Compact list detected (correct)');
        }
      }
    }
    
    // Look for chat messages
    const messageContainers = modal.querySelectorAll('.chat-messages-container, [class*="messages"]');
    if (messageContainers.length > 0) {
      this.testResults.chatViewDetected = true;
      console.log('🦄 [SafariModalTest] ✅ Chat view in modal (correct)');
    }
    
    // Check overall modal structure
    const modalContent = modal.textContent;
    if (modalContent.includes('Mark all as read') || modalContent.includes('Start a new conversation')) {
      this.testResults.fullscreenListDetected = true;
      console.warn('🦄 [SafariModalTest] ⚠️ FULLSCREEN FEATURES IN MODAL - This indicates the bug!');
    }
  },
  
  // Log test results
  logTestResults() {
    console.log('🦄 [SafariModalTest] ==========================================');
    console.log('🦄 [SafariModalTest] TEST RESULTS:');
    console.log('🦄 [SafariModalTest] Safari detected:', this.isSafari);
    console.log('🦄 [SafariModalTest] Fullscreen list detected:', this.testResults.fullscreenListDetected);
    console.log('🦄 [SafariModalTest] Compact list detected:', this.testResults.compactListDetected);
    console.log('🦄 [SafariModalTest] Chat view detected:', this.testResults.chatViewDetected);
    
    if (this.isSafari) {
      if (this.testResults.fullscreenListDetected) {
        console.error('🦄 [SafariModalTest] ❌ FAILED: Safari is still showing fullscreen list in modal');
      } else if (this.testResults.chatViewDetected) {
        console.log('🦄 [SafariModalTest] ✅ PASSED: Safari correctly shows chat view in modal');
      } else if (this.testResults.compactListDetected) {
        console.log('🦄 [SafariModalTest] ✅ PASSED: Safari correctly shows compact list in modal');
      } else {
        console.warn('🦄 [SafariModalTest] ⚠️ INCONCLUSIVE: Could not detect modal content type');
      }
    } else {
      console.log('🦄 [SafariModalTest] Not Safari - test not applicable');
    }
    
    console.log('🦄 [SafariModalTest] ==========================================');
  },
  
  // Manual test instruction
  runManualTest() {
    console.log('🦄 [SafariModalTest] Starting manual test...');
    console.log('🦄 [SafariModalTest] 1. Click the chat icon to open popover');
    console.log('🦄 [SafariModalTest] 2. Click on any conversation');
    console.log('🦄 [SafariModalTest] 3. Check that modal opens with chat view, NOT fullscreen list');
    
    this.startMonitoring();
    
    setTimeout(() => {
      console.log('🦄 [SafariModalTest] Test will complete in 30 seconds...');
    }, 1000);
    
    setTimeout(() => {
      console.log('🦄 [SafariModalTest] Manual test completed');
      this.logTestResults();
    }, 30000);
  },
  
  // Emergency fix for Safari modal
  emergencyFix() {
    if (!this.isSafari) {
      console.log('🦄 [SafariModalTest] Not Safari - emergency fix not needed');
      return;
    }
    
    console.log('🦄 [SafariModalTest] Applying emergency Safari modal fix...');
    
    // Inject CSS to hide fullscreen elements in modals
    const style = document.createElement('style');
    style.textContent = `
      /* Emergency Safari Modal Fix */
      [role="dialog"] button[aria-label="Open menu"],
      [role="dialog"] button[aria-label="More options"],
      [role="dialog"] .chat-list-fullscreen {
        display: none !important;
      }
      
      [role="dialog"] .chat-list-container {
        max-height: 400px !important;
      }
    `;
    document.head.appendChild(style);
    
    console.log('🦄 [SafariModalTest] ✅ Emergency fix applied');
    return style;
  }
};

// Auto-run if Safari is detected
if (window.testSafariModalFix.isSafari) {
  console.log('🦄 [SafariModalTest] Safari detected - modal fix test available');
  console.log('🦄 [SafariModalTest] Run: window.testSafariModalFix.runManualTest()');
}

// Export for easy access
window.safariModalTest = window.testSafariModalFix; 