// Chat Fixes Validation
// Tests both scroll positioning and transition flicker fixes

console.log('🧪 [ChatFixes] Validation script loaded');

window.validateChatFixes = {
  
  // Test scroll positioning
  testScrollPositioning: function() {
    console.log('📊 [ChatFixes] Testing scroll positioning...');
    
    const container = document.querySelector('.chat-messages-container');
    if (!container) {
      console.warn('⚠️ [ChatFixes] Chat container not found');
      return false;
    }
    
    const isAtBottom = Math.abs(
      (container.scrollHeight - container.scrollTop - container.clientHeight)
    ) < 5; // Allow 5px tolerance
    
    const positioning = {
      scrollTop: container.scrollTop,
      scrollHeight: container.scrollHeight,
      clientHeight: container.clientHeight,
      distanceFromBottom: container.scrollHeight - container.scrollTop - container.clientHeight,
      isAtBottom
    };
    
    console.log('📊 [ChatFixes] Scroll positioning:', positioning);
    
    if (isAtBottom) {
      console.log('✅ [ChatFixes] Scroll positioning is correct - at bottom');
    } else {
      console.warn('⚠️ [ChatFixes] Scroll positioning issue - not at bottom');
    }
    
    return isAtBottom;
  },
  
  // Test transition classes
  testTransitionClasses: function() {
    console.log('📊 [ChatFixes] Testing transition classes...');
    
    const modalElement = document.querySelector('.chat-modal-instant');
    const popoverElement = document.querySelector('.chat-popover-immediate-close');
    
    const results = {
      modalClassExists: !!modalElement,
      popoverClassExists: !!popoverElement,
      modalVisible: modalElement ? window.getComputedStyle(modalElement).display !== 'none' : false
    };
    
    console.log('📊 [ChatFixes] Transition classes:', results);
    
    return results;
  },
  
  // Run all tests
  runAllTests: function() {
    console.log('🧪 [ChatFixes] Running all validation tests...');
    
    const results = {
      scrollPositioning: this.testScrollPositioning(),
      transitionClasses: this.testTransitionClasses(),
      timestamp: new Date().toISOString()
    };
    
    console.log('📊 [ChatFixes] Test results:', results);
    
    return results;
  }
};

// Auto-run basic tests when chat is detected
setTimeout(() => {
  if (document.querySelector('.chat-messages-container')) {
    console.log('🧪 [ChatFixes] Chat detected, running validation...');
    window.validateChatFixes.runAllTests();
  } else {
    console.log('🧪 [ChatFixes] Available commands:');
    console.log('  - window.validateChatFixes.runAllTests() - Run all tests');
    console.log('  - window.validateChatFixes.testScrollPositioning() - Test scroll positioning');
  }
}, 1000); 