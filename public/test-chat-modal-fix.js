// Chat Modal Fix Test Script  
// Tests that "Select a Conversation" modal flash has been eliminated

window.testChatModalFix = {
  // Test data
  testResults: {
    modalFlashDetected: false,
    modalOpenedDirectlyToChat: false,
    modalClosedWithoutConversation: false,
    timestamp: null
  },
  
  // Monitor for modal behavior
  startMonitoring() {
    console.log('🔍 [ChatModalTest] Starting chat modal fix monitoring...');
    
    // Reset results
    this.testResults = {
      modalFlashDetected: false,
      modalOpenedDirectlyToChat: false,
      modalClosedWithoutConversation: false,
      timestamp: new Date().toISOString()
    };
    
    // Monitor for "Select a Conversation" text (should not appear)
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const element = node;
            
            // Check for the problematic "Select a Conversation" text
            if (element.textContent && element.textContent.includes('Select a Conversation')) {
              console.log('⚠️ [ChatModalTest] FLASH DETECTED: "Select a Conversation" text found');
              this.testResults.modalFlashDetected = true;
            }
            
            // Check for direct chat view opening (good)
            if (element.querySelector && element.querySelector('[class*="chat-messages-container"]')) {
              console.log('✅ [ChatModalTest] Chat view opened directly (no flash)');
              this.testResults.modalOpenedDirectlyToChat = true;
            }
          }
        });
      });
    });
    
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
    
    // Store observer for cleanup
    this.observer = observer;
    
    console.log('🔍 [ChatModalTest] Monitoring active. Click chat button to test.');
  },
  
  // Stop monitoring
  stopMonitoring() {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
    console.log('🔍 [ChatModalTest] Monitoring stopped.');
  },
  
  // Test conversation selection flow
  testConversationSelection() {
    console.log('🧪 [ChatModalTest] Testing conversation selection flow...');
    
    // Try to find chat button
    const chatButton = document.querySelector('[aria-label*="Messages"]');
    if (chatButton) {
      console.log('🧪 [ChatModalTest] Found chat button, simulating click...');
      chatButton.click();
      
      // Wait a moment and check results
      setTimeout(() => {
        this.checkResults();
      }, 1000);
    } else {
      console.log('⚠️ [ChatModalTest] No chat button found');
    }
  },
  
  // Check test results
  checkResults() {
    console.log('📊 [ChatModalTest] Test Results:', this.testResults);
    
    if (this.testResults.modalFlashDetected) {
      console.log('❌ [ChatModalTest] FAILED: Modal flash still detected');
    } else if (this.testResults.modalOpenedDirectlyToChat) {
      console.log('✅ [ChatModalTest] SUCCESS: Modal opened directly to chat (no flash)');
    } else {
      console.log('ℹ️ [ChatModalTest] No modal activity detected');
    }
    
    return this.testResults;
  },
  
  // Emergency test
  testEmergency() {
    console.log('🚨 [ChatModalTest] Running emergency test for modal flash...');
    
    // Look for any existing "Select a Conversation" text
    const selectText = document.querySelector('*:contains("Select a Conversation")');
    if (selectText) {
      console.log('❌ [ChatModalTest] EMERGENCY: Found existing "Select a Conversation" text');
      return false;
    }
    
    // Check for modal elements
    const modal = document.querySelector('[role="dialog"]');
    if (modal) {
      console.log('ℹ️ [ChatModalTest] Modal found, checking content...');
      if (modal.textContent.includes('Select a Conversation')) {
        console.log('❌ [ChatModalTest] EMERGENCY: Modal contains problematic text');
        return false;
      }
    }
    
    console.log('✅ [ChatModalTest] EMERGENCY: No problematic modal content found');
    return true;
  },
  
  // Run all tests
  runAllTests() {
    console.log('🧪 [ChatModalTest] Running comprehensive chat modal tests...');
    console.log('🧪 [ChatModalTest] ==========================================');
    
    // Start monitoring
    this.startMonitoring();
    
    // Emergency check
    const emergencyResult = this.testEmergency();
    
    // Test conversation selection if possible
    this.testConversationSelection();
    
    // Setup auto-stop monitoring after 30 seconds
    setTimeout(() => {
      this.stopMonitoring();
      console.log('📊 [ChatModalTest] Final Results:', this.checkResults());
    }, 30000);
    
    return {
      emergencyTest: emergencyResult,
      monitoringActive: true,
      timestamp: new Date().toISOString()
    };
  }
};

// Auto-run test if we detect we're on a page with chat functionality
if (document.querySelector('[aria-label*="Messages"]') || document.querySelector('[class*="chat"]')) {
  console.log('🧪 [ChatModalTest] Chat functionality detected - auto-running tests...');
  window.testChatModalFix.runAllTests();
} 