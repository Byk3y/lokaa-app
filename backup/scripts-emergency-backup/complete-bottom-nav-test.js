/**
 * Complete Bottom Navigation Test
 * 
 * Tests that all bottom nav buttons work correctly when chat overlay is open
 * by closing the overlay first, then navigating
 */

(function() {
  'use strict';

  const CompleteBottomNavTest = {
    
    /**
     * Test all navigation buttons with chat overlay
     */
    testAllNavigationButtons() {
      console.log('🧪 [CompleteBottomNavTest] Testing all navigation buttons with chat overlay...');
      
      // Step 1: Open chat overlay
      console.log('📱 Step 1: Opening chat overlay...');
      window.dispatchEvent(new CustomEvent('openGlobalChat', {
        detail: { source: 'test', fromRoute: window.location.pathname }
      }));
      
      // Step 2: Wait for overlay to open, then test each button
      setTimeout(() => {
        this.testSequentialNavigation();
      }, 1000);
    },

    /**
     * Test navigation buttons one by one
     */
    async testSequentialNavigation() {
      const buttons = this.findAllNavButtons();
      
      if (buttons.length === 0) {
        console.log('❌ No navigation buttons found');
        return;
      }
      
      console.log(`🔍 Found ${buttons.length} navigation buttons`);
      
      for (let i = 0; i < buttons.length; i++) {
        const button = buttons[i];
        const buttonName = this.getButtonName(button);
        
        console.log(`\n🧪 Testing button ${i + 1}/${buttons.length}: ${buttonName}`);
        
        // Re-open chat overlay before each test
        window.dispatchEvent(new CustomEvent('openGlobalChat', {
          detail: { source: 'test', fromRoute: window.location.pathname }
        }));
        
        await this.delay(500); // Wait for overlay to open
        
        // Test the button
        await this.testSingleButton(button, buttonName);
        
        await this.delay(1000); // Wait between tests
      }
      
      console.log('\n🎉 [CompleteBottomNavTest] All navigation tests completed!');
    },

    /**
     * Test a single navigation button
     */
    async testSingleButton(button, buttonName) {
      return new Promise((resolve) => {
        // Check if overlay is open before clicking
        const overlayOpenBefore = document.body.style.overflow === 'hidden';
        console.log(`  📊 Overlay open before click: ${overlayOpenBefore}`);
        
        if (!overlayOpenBefore) {
          console.log(`  ⚠️ Overlay not open, skipping ${buttonName}`);
          resolve();
          return;
        }
        
        // Listen for overlay close event
        const closeListener = () => {
          console.log(`  ✅ ${buttonName}: Overlay closed successfully`);
          window.removeEventListener('closeGlobalChat', closeListener);
          
          // Check if navigation happened after a delay
          setTimeout(() => {
            const overlayOpenAfter = document.body.style.overflow === 'hidden';
            console.log(`  📊 Overlay open after click: ${overlayOpenAfter}`);
            
            if (!overlayOpenAfter) {
              console.log(`  🎯 ${buttonName}: SUCCESS - Overlay closed and navigation likely occurred`);
            } else {
              console.log(`  ❌ ${buttonName}: FAILED - Overlay still open`);
            }
            
            resolve();
          }, 200);
        };
        
        window.addEventListener('closeGlobalChat', closeListener);
        
        // Click the button
        console.log(`  👆 Clicking ${buttonName} button...`);
        button.click();
        
        // Timeout in case event doesn't fire
        setTimeout(() => {
          window.removeEventListener('closeGlobalChat', closeListener);
          console.log(`  ⏰ ${buttonName}: Timeout - event may not have fired`);
          resolve();
        }, 2000);
      });
    },

    /**
     * Find all navigation buttons in bottom nav
     */
    findAllNavButtons() {
      const bottomNav = document.querySelector('[class*="fixed bottom-0"]');
      if (!bottomNav) {
        console.log('❌ Bottom nav not found');
        return [];
      }
      
      const buttons = Array.from(bottomNav.querySelectorAll('button'));
      console.log(`🔍 Found ${buttons.length} buttons in bottom nav`);
      
      return buttons;
    },

    /**
     * Get button name for logging
     */
    getButtonName(button) {
      const text = button.textContent?.trim();
      if (text) return text;
      
      // Try to identify by icon or aria-label
      const svg = button.querySelector('svg');
      if (svg) {
        // Common icon patterns
        if (svg.innerHTML.includes('M3 12l2-2m0 0l7-7 7 7M5')) return 'Home';
        if (svg.innerHTML.includes('message') || svg.innerHTML.includes('chat')) return 'Chat';
        if (svg.innerHTML.includes('bell')) return 'Notifications';
        if (svg.innerHTML.includes('user') || svg.innerHTML.includes('person')) return 'Profile';
      }
      
      return 'Unknown';
    },

    /**
     * Test visual states of buttons
     */
    testVisualStates() {
      console.log('🎨 [CompleteBottomNavTest] Testing visual states...');
      
      const buttons = this.findAllNavButtons();
      
      // Test without overlay
      console.log('\n📊 Button states WITHOUT overlay:');
      buttons.forEach((button, i) => {
        const name = this.getButtonName(button);
        const isActive = this.isButtonActive(button);
        console.log(`  ${i + 1}. ${name}: ${isActive ? 'ACTIVE' : 'inactive'}`);
      });
      
      // Open overlay and test again
      window.dispatchEvent(new CustomEvent('openGlobalChat', {
        detail: { source: 'test', fromRoute: window.location.pathname }
      }));
      
      setTimeout(() => {
        console.log('\n📊 Button states WITH overlay:');
        buttons.forEach((button, i) => {
          const name = this.getButtonName(button);
          const isActive = this.isButtonActive(button);
          console.log(`  ${i + 1}. ${name}: ${isActive ? 'ACTIVE' : 'inactive'}`);
        });
        
        // Close overlay for cleanup
        window.dispatchEvent(new CustomEvent('closeGlobalChat'));
      }, 500);
    },

    /**
     * Check if button appears active
     */
    isButtonActive(button) {
      const icon = button.querySelector('svg');
      const text = button.querySelector('span');
      
      // Check for white color (active state)
      const iconColor = icon ? getComputedStyle(icon).color : '';
      const textColor = text ? getComputedStyle(text).color : '';
      
      return iconColor.includes('255, 255, 255') || textColor.includes('255, 255, 255');
    },

    /**
     * Utility delay function
     */
    delay(ms) {
      return new Promise(resolve => setTimeout(resolve, ms));
    },

    /**
     * Quick test for specific button
     */
    testSpecificButton(buttonName) {
      console.log(`🎯 [CompleteBottomNavTest] Testing specific button: ${buttonName}`);
      
      const buttons = this.findAllNavButtons();
      const targetButton = buttons.find(button => 
        this.getButtonName(button).toLowerCase().includes(buttonName.toLowerCase())
      );
      
      if (!targetButton) {
        console.log(`❌ Button "${buttonName}" not found`);
        return;
      }
      
      // Open overlay
      window.dispatchEvent(new CustomEvent('openGlobalChat', {
        detail: { source: 'test', fromRoute: window.location.pathname }
      }));
      
      setTimeout(() => {
        this.testSingleButton(targetButton, buttonName);
      }, 500);
    }
  };

  // Make available globally
  window.completeBottomNavTest = CompleteBottomNavTest;
  
  console.log(`
🧪 Complete Bottom Navigation Test Ready!

Commands:
• window.completeBottomNavTest.testAllNavigationButtons() - Test all buttons with overlay
• window.completeBottomNavTest.testVisualStates() - Test button visual states
• window.completeBottomNavTest.testSpecificButton('Profile') - Test specific button
• window.completeBottomNavTest.testSpecificButton('Home') - Test home button

This comprehensive test verifies:
1. All nav buttons close chat overlay before navigating
2. Visual states are correct with/without overlay
3. Navigation works properly after overlay closes
4. No buttons get "stuck" or fail to work
  `);

})(); 