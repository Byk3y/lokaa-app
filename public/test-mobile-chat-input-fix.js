// Mobile Chat Input Fix Test Script
// Tests that chat input is visible and properly positioned on mobile

window.testMobileChatInputFix = {
  // Test data
  testResults: {
    containerHeight: null,
    inputVisible: false,
    inputPosition: null,
    viewportHeight: null,
    bottomNavHeight: null,
    keyboardOpen: false,
    safeAreaBottom: null
  },
  
  // Check mobile chat input visibility
  checkInputVisibility() {
    console.log('📱 [MobileChatInputTest] Checking chat input visibility...');
    
    // Reset results
    this.testResults = {
      containerHeight: null,
      inputVisible: false,
      inputPosition: null,
      viewportHeight: null,
      bottomNavHeight: null,
      keyboardOpen: false,
      safeAreaBottom: null
    };
    
    // Get viewport info
    const viewportHeight = window.visualViewport?.height || window.innerHeight;
    const windowHeight = window.screen.height;
    const keyboardThreshold = windowHeight * 0.75;
    const isKeyboardOpen = viewportHeight < keyboardThreshold;
    
    // Get safe area
    const safeAreaBottom = parseInt(
      getComputedStyle(document.documentElement).getPropertyValue('--safe-area-inset-bottom')?.replace('px', '') || '0'
    );
    
    // Find chat container
    const chatContainer = document.querySelector('.mobile-chat-view');
    const chatInput = document.querySelector('.mobile-chat-input');
    const bottomNav = document.querySelector('[class*="fixed bottom-0"]');
    
    this.testResults.viewportHeight = viewportHeight;
    this.testResults.keyboardOpen = isKeyboardOpen;
    this.testResults.safeAreaBottom = safeAreaBottom;
    this.testResults.bottomNavHeight = bottomNav ? bottomNav.offsetHeight : 0;
    
    if (chatContainer) {
      const containerRect = chatContainer.getBoundingClientRect();
      this.testResults.containerHeight = containerRect.height;
      
      console.log('📱 [MobileChatInputTest] Chat container found:', {
        height: containerRect.height,
        top: containerRect.top,
        bottom: containerRect.bottom
      });
    }
    
    if (chatInput) {
      const inputRect = chatInput.getBoundingClientRect();
      this.testResults.inputVisible = inputRect.bottom <= viewportHeight;
      this.testResults.inputPosition = {
        top: inputRect.top,
        bottom: inputRect.bottom,
        height: inputRect.height
      };
      
      console.log('📱 [MobileChatInputTest] Chat input found:', {
        visible: this.testResults.inputVisible,
        position: this.testResults.inputPosition,
        withinViewport: inputRect.bottom <= viewportHeight
      });
    }
    
    return this.testResults;
  },
  
  // Monitor viewport changes
  startMonitoring() {
    console.log('📱 [MobileChatInputTest] Starting monitoring...');
    
    const checkVisibility = () => {
      const results = this.checkInputVisibility();
      console.log('📱 [MobileChatInputTest] Monitoring update:', results);
    };
    
    // Check every 2 seconds
    const interval = setInterval(checkVisibility, 2000);
    
    // Also listen for viewport changes
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', checkVisibility);
    }
    
    window.addEventListener('resize', checkVisibility);
    
    console.log('📱 [MobileChatInputTest] Monitoring started. Use window.testMobileChatInputFix.stopMonitoring() to stop.');
    
    // Store interval for cleanup
    this.monitoringInterval = interval;
    this.monitoringHandler = checkVisibility;
    
    // Initial check
    checkVisibility();
  },
  
  // Stop monitoring
  stopMonitoring() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    
    if (this.monitoringHandler) {
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', this.monitoringHandler);
      }
      window.removeEventListener('resize', this.monitoringHandler);
      this.monitoringHandler = null;
    }
    
    console.log('📱 [MobileChatInputTest] Monitoring stopped.');
  },
  
  // Run all tests
  runAllTests() {
    console.log('📱 [MobileChatInputTest] Running comprehensive mobile chat input tests...');
    console.log('📱 [MobileChatInputTest] ==========================================');
    
    const results = this.checkInputVisibility();
    
    console.log('📱 [MobileChatInputTest] Test Results:', {
      inputVisible: results.inputVisible,
      keyboardOpen: results.keyboardOpen,
      viewportHeight: results.viewportHeight,
      containerHeight: results.containerHeight,
      safeAreaBottom: results.safeAreaBottom,
      recommendation: results.inputVisible ? 
        '✅ Chat input is visible and properly positioned' :
        '❌ Chat input may be hidden or incorrectly positioned'
    });
    
    // Start monitoring for changes
    this.startMonitoring();
    
    return results;
  },
  
  // Emergency fix function
  emergencyInputFix() {
    console.log('📱 [MobileChatInputTest] Applying emergency input fix...');
    
    const chatInput = document.querySelector('.mobile-chat-input');
    if (chatInput) {
      chatInput.style.position = 'fixed';
      chatInput.style.bottom = '0';
      chatInput.style.left = '0';
      chatInput.style.right = '0';
      chatInput.style.zIndex = '9999';
      chatInput.style.backgroundColor = 'white';
      
      console.log('📱 [MobileChatInputTest] Emergency fix applied - input should now be visible');
    } else {
      console.log('📱 [MobileChatInputTest] No chat input found to fix');
    }
  }
};

// Auto-run test if on mobile
if (window.innerWidth <= 640) {
  console.log('📱 [MobileChatInputTest] Mobile device detected - auto-running tests...');
  window.testMobileChatInputFix.runAllTests();
} 