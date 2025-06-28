/**
 * Mobile Category Dropdown Test Script
 * 
 * This script helps debug category dropdown issues on mobile CreatePost modal
 * and tests file attachment functionality
 */

// Chat Popover Redesign Test - Desktop Focus
// Tests the improved scrollable chat popover functionality

const ChatPopoverTest = {
  name: 'Chat Popover Redesign Test',
  
  async runAllTests() {
    console.log('🧪 Starting Chat Popover Redesign Tests...');
    
    const results = {
      responsiveHeight: await this.testResponsiveHeight(),
      scrollability: await this.testScrollability(),
      viewport: await this.testViewportConstraints(),
      performance: await this.testPerformance()
    };
    
    const passedTests = Object.values(results).filter(r => r.passed).length;
    const totalTests = Object.keys(results).length;
    
    console.log(`\n📊 Chat Popover Test Results: ${passedTests}/${totalTests} passed`);
    
    if (passedTests === totalTests) {
      console.log('✅ All chat popover tests passed! Popover is properly responsive and scrollable.');
    } else {
      console.log('❌ Some tests failed. Check individual test results above.');
    }
    
    return results;
  },
  
  async testResponsiveHeight() {
    console.log('\n🔍 Testing responsive height constraints...');
    
    try {
      // Find chat button and trigger popover
      const chatButton = document.querySelector('[aria-label*="Messages"]');
      if (!chatButton) {
        return { passed: false, reason: 'Chat button not found' };
      }
      
      // Click to open popover
      chatButton.click();
      
      // Wait for popover to appear
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const popover = document.querySelector('[data-radix-popper-content-wrapper]');
      if (!popover) {
        return { passed: false, reason: 'Popover not found after opening' };
      }
      
      const popoverContent = popover.querySelector('.bg-white');
      if (!popoverContent) {
        return { passed: false, reason: 'Popover content not found' };
      }
      
      const computedStyle = window.getComputedStyle(popoverContent);
      const maxHeight = computedStyle.maxHeight;
      const minHeight = computedStyle.minHeight;
      
      console.log(`📏 Popover max-height: ${maxHeight}, min-height: ${minHeight}`);
      
      // Check if responsive height is applied
      const has70vhMaxHeight = maxHeight.includes('70vh') || 
                               parseInt(maxHeight) < window.innerHeight * 0.8;
      const hasMinHeight = minHeight === '400px' || parseInt(minHeight) >= 400;
      
      // Close popover
      chatButton.click();
      
      return {
        passed: has70vhMaxHeight && hasMinHeight,
        reason: has70vhMaxHeight && hasMinHeight ? 
          'Responsive height constraints applied correctly' :
          `Height constraints not applied: max-height ${has70vhMaxHeight ? '✅' : '❌'}, min-height ${hasMinHeight ? '✅' : '❌'}`
      };
      
    } catch (error) {
      return { passed: false, reason: `Error testing height: ${error.message}` };
    }
  },
  
  async testScrollability() {
    console.log('\n🔍 Testing popover scrollability...');
    
    try {
      const chatButton = document.querySelector('[aria-label*="Messages"]');
      if (!chatButton) {
        return { passed: false, reason: 'Chat button not found' };
      }
      
      chatButton.click();
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const scrollArea = document.querySelector('[data-radix-scroll-area-viewport]');
      if (!scrollArea) {
        chatButton.click(); // Close popover
        return { passed: false, reason: 'ScrollArea not found' };
      }
      
      const scrollHeight = scrollArea.scrollHeight;
      const clientHeight = scrollArea.clientHeight;
      
      console.log(`📐 ScrollArea - scrollHeight: ${scrollHeight}px, clientHeight: ${clientHeight}px`);
      
      const isScrollable = scrollHeight > clientHeight;
      
      // Test overflow styles
      const computedStyle = window.getComputedStyle(scrollArea);
      const overflowY = computedStyle.overflowY;
      
      console.log(`🔄 Overflow-Y: ${overflowY}`);
      
      chatButton.click(); // Close popover
      
      return {
        passed: (isScrollable || overflowY === 'auto' || overflowY === 'scroll'),
        reason: isScrollable ? 
          'Content is scrollable' : 
          `Overflow properly configured: ${overflowY}`
      };
      
    } catch (error) {
      return { passed: false, reason: `Error testing scrollability: ${error.message}` };
    }
  },
  
  async testViewportConstraints() {
    console.log('\n🔍 Testing viewport constraints...');
    
    try {
      const viewportHeight = window.innerHeight;
      const viewportWidth = window.innerWidth;
      
      console.log(`🖥️  Viewport: ${viewportWidth}x${viewportHeight}`);
      
      const chatButton = document.querySelector('[aria-label*="Messages"]');
      if (!chatButton) {
        return { passed: false, reason: 'Chat button not found' };
      }
      
      chatButton.click();
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const popover = document.querySelector('[data-radix-popper-content-wrapper]');
      if (!popover) {
        return { passed: false, reason: 'Popover not found' };
      }
      
      const rect = popover.getBoundingClientRect();
      
      console.log(`📦 Popover position: top=${rect.top}, bottom=${rect.bottom}, height=${rect.height}`);
      
      const fitsInViewport = rect.bottom <= viewportHeight && rect.height <= viewportHeight * 0.8;
      const hasReasonableWidth = rect.width <= Math.min(380, viewportWidth * 0.9);
      
      chatButton.click(); // Close popover
      
      return {
        passed: fitsInViewport && hasReasonableWidth,
        reason: fitsInViewport && hasReasonableWidth ?
          'Popover fits within viewport constraints' :
          `Viewport issues: fits=${fitsInViewport ? '✅' : '❌'}, width=${hasReasonableWidth ? '✅' : '❌'}`
      };
      
    } catch (error) {
      return { passed: false, reason: `Error testing viewport: ${error.message}` };
    }
  },
  
  async testPerformance() {
    console.log('\n🔍 Testing popover performance...');
    
    try {
      const chatButton = document.querySelector('[aria-label*="Messages"]');
      if (!chatButton) {
        return { passed: false, reason: 'Chat button not found' };
      }
      
      // Test open performance
      const openStart = performance.now();
      chatButton.click();
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const popover = document.querySelector('[data-radix-popper-content-wrapper]');
      const openEnd = performance.now();
      const openTime = openEnd - openStart;
      
      // Test close performance
      const closeStart = performance.now();
      if (popover) {
        chatButton.click();
      }
      const closeEnd = performance.now();
      const closeTime = closeEnd - closeStart;
      
      console.log(`⚡ Performance - Open: ${openTime.toFixed(2)}ms, Close: ${closeTime.toFixed(2)}ms`);
      
      const performanceOk = openTime < 500 && closeTime < 200;
      
      return {
        passed: performanceOk,
        reason: performanceOk ?
          'Popover performance is acceptable' :
          `Performance issues: open=${openTime.toFixed(2)}ms, close=${closeTime.toFixed(2)}ms`
      };
      
    } catch (error) {
      return { passed: false, reason: `Error testing performance: ${error.message}` };
    }
  },
  
  // Helper methods for manual testing
  async openPopover() {
    const chatButton = document.querySelector('[aria-label*="Messages"]');
    if (chatButton) {
      chatButton.click();
      console.log('📂 Chat popover opened');
    } else {
      console.log('❌ Chat button not found');
    }
  },
  
  async closePopover() {
    const chatButton = document.querySelector('[aria-label*="Messages"]');
    if (chatButton) {
      chatButton.click();
      console.log('📁 Chat popover closed');
    }
  },
  
  inspectPopover() {
    const popover = document.querySelector('[data-radix-popper-content-wrapper]');
    if (popover) {
      const rect = popover.getBoundingClientRect();
      const style = window.getComputedStyle(popover.querySelector('.bg-white') || popover);
      
      console.log('🔍 Popover inspection:', {
        position: { top: rect.top, left: rect.left, width: rect.width, height: rect.height },
        maxHeight: style.maxHeight,
        minHeight: style.minHeight,
        overflow: style.overflow
      });
    } else {
      console.log('❌ Popover not found - try opening it first');
    }
  }
};

// Global access
window.chatPopoverTest = ChatPopoverTest;

// Auto-run on load
console.log('🚀 Chat Popover Test Suite loaded');
console.log('📋 Available commands:');
console.log('  - window.chatPopoverTest.runAllTests()');
console.log('  - window.chatPopoverTest.openPopover()');
console.log('  - window.chatPopoverTest.closePopover()');
console.log('  - window.chatPopoverTest.inspectPopover()');

// Auto-run basic test after a delay
setTimeout(() => {
  ChatPopoverTest.runAllTests();
}, 2000); 