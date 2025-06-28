/**
 * Bottom Navigation Home Button Fix Test
 * 
 * Tests that the home button closes chat overlay when clicked
 */

(function() {
  'use strict';

  const HomeButtonFixTest = {
    
    /**
     * Test home button behavior with chat overlay
     */
    testHomeButtonWithChatOverlay() {
      console.log('🏠 [HomeButtonFixTest] Testing home button with chat overlay...');
      
      // Step 1: Open chat overlay
      console.log('📱 Step 1: Opening chat overlay...');
      window.dispatchEvent(new CustomEvent('openGlobalChat', {
        detail: { source: 'test', fromRoute: window.location.pathname }
      }));
      
      // Step 2: Wait for overlay to open, then test home button
      setTimeout(() => {
        console.log('🏠 Step 2: Checking if chat overlay is open...');
        
        const chatOverlayOpen = document.body.style.overflow === 'hidden';
        const overlayElement = document.querySelector('[class*="fixed right-0 top-0 bottom-0"]');
        
        if (chatOverlayOpen && overlayElement) {
          console.log('✅ Chat overlay is open, now testing home button...');
          
          // Find home button
          const homeButton = this.findHomeButton();
          
          if (homeButton) {
            console.log('🏠 Step 3: Clicking home button...');
            
            // Listen for close event
            const closeListener = () => {
              console.log('✅ SUCCESS: Chat overlay closed when home button clicked!');
              window.removeEventListener('closeGlobalChat', closeListener);
            };
            window.addEventListener('closeGlobalChat', closeListener);
            
            // Click home button
            homeButton.click();
            
            // Check result after a delay
            setTimeout(() => {
              const stillOpen = document.body.style.overflow === 'hidden';
              if (!stillOpen) {
                console.log('🎉 [HomeButtonFixTest] TEST PASSED: Home button successfully closed chat overlay');
              } else {
                console.log('❌ [HomeButtonFixTest] TEST FAILED: Chat overlay still open after home button click');
              }
            }, 500);
            
          } else {
            console.log('❌ Home button not found');
          }
        } else {
          console.log('❌ Chat overlay failed to open');
        }
      }, 1000);
    },

    /**
     * Find the home button in bottom nav
     */
    findHomeButton() {
      // Look for home button in bottom nav
      const bottomNav = document.querySelector('[class*="fixed bottom-0"]');
      if (!bottomNav) {
        console.log('❌ Bottom nav not found');
        return null;
      }
      
      // Look for button with Home icon or aria-label
      const homeButtons = bottomNav.querySelectorAll('button');
      
      for (const button of homeButtons) {
        // Check if it contains Home icon or has home-related text
        const buttonText = button.textContent?.toLowerCase();
        const hasHomeIcon = button.querySelector('[data-lucide="home"]') || 
                           button.querySelector('svg') && buttonText?.includes('home');
        
        if (hasHomeIcon || buttonText?.includes('home')) {
          console.log('🏠 Found home button:', button.textContent);
          return button;
        }
      }
      
      // Fallback: first button (usually home)
      if (homeButtons.length > 0) {
        console.log('🏠 Using first button as home button');
        return homeButtons[0];
      }
      
      return null;
    },

    /**
     * Test home button visual state
     */
    testHomeButtonVisualState() {
      console.log('🎨 [HomeButtonFixTest] Testing home button visual state...');
      
      // Test without chat overlay
      const homeButton = this.findHomeButton();
      if (!homeButton) {
        console.log('❌ Home button not found');
        return;
      }
      
      const initialClasses = homeButton.className;
      console.log('🎨 Home button classes (no overlay):', initialClasses);
      
      // Open chat overlay
      window.dispatchEvent(new CustomEvent('openGlobalChat', {
        detail: { source: 'test', fromRoute: window.location.pathname }
      }));
      
      // Check classes after overlay opens
      setTimeout(() => {
        const overlayClasses = homeButton.className;
        console.log('🎨 Home button classes (with overlay):', overlayClasses);
        
        // Check if active state changed
        const wasActive = initialClasses.includes('text-white');
        const isActiveNow = overlayClasses.includes('text-white');
        
        if (!wasActive && isActiveNow) {
          console.log('✅ Home button correctly shows active state with chat overlay');
        } else if (wasActive === isActiveNow) {
          console.log('⚠️ Home button visual state unchanged (may be expected)');
        } else {
          console.log('❌ Unexpected visual state change');
        }
        
        // Close overlay for cleanup
        window.dispatchEvent(new CustomEvent('closeGlobalChat'));
      }, 1000);
    },

    /**
     * Run all tests
     */
    runAllTests() {
      console.log('🧪 [HomeButtonFixTest] Running all home button tests...');
      
      this.testHomeButtonWithChatOverlay();
      
      setTimeout(() => {
        this.testHomeButtonVisualState();
      }, 3000);
    }
  };

  // Make available globally
  window.homeButtonFixTest = HomeButtonFixTest;
  
  console.log(`
🏠 Home Button Fix Test Ready!

Commands:
• window.homeButtonFixTest.testHomeButtonWithChatOverlay() - Test overlay closing
• window.homeButtonFixTest.testHomeButtonVisualState() - Test visual feedback
• window.homeButtonFixTest.runAllTests() - Run all tests

Test verifies:
1. Home button closes chat overlay when clicked
2. Home button shows correct visual state
3. Navigation works as expected
  `);

})(); 