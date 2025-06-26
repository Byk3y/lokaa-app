/**
 * 🧪 Layout Fixes Test Script
 * 
 * Simple test to verify the mobile layout fixes are working
 */

window.testLayoutFixes = {
  /**
   * Quick test to check if layout issues are fixed
   */
  runQuickTest() {
    console.log('🧪 [LayoutTest] Running layout fix verification...');
    
    const results = {
      debugElementsHidden: true,
      viewportProperlySet: true,
      noOverflowIssues: true,
      positioningCorrect: true
    };
    
    // Check for visible debug elements
    const debugElements = Array.from(document.querySelectorAll('*')).filter(el => {
      const text = el.textContent || '';
      return text.includes('Shell:') || 
             text.includes('Skool Mobile Debug') ||
             text.includes('debug') ||
             text.includes('Debug');
    });
    
    if (debugElements.length > 0) {
      results.debugElementsHidden = false;
      console.log('❌ Found visible debug elements:', debugElements.length);
      debugElements.forEach(el => {
        console.log('  -', el.textContent?.slice(0, 50));
      });
    } else {
      console.log('✅ No debug elements visible');
    }
    
    // Check viewport
    const meta = document.querySelector('meta[name="viewport"]');
    if (!meta || !meta.content.includes('width=device-width')) {
      results.viewportProperlySet = false;
      console.log('❌ Viewport not properly set');
    } else {
      console.log('✅ Viewport properly configured');
    }
    
    // Check for overflow issues
    const bodyStyles = window.getComputedStyle(document.body);
    if (bodyStyles.overflowX === 'scroll' || bodyStyles.overflowX === 'auto') {
      // Check if there's actual horizontal scrolling
      if (document.body.scrollWidth > window.innerWidth) {
        results.noOverflowIssues = false;
        console.log('❌ Body has horizontal overflow');
      }
    }
    
    if (results.noOverflowIssues) {
      console.log('✅ No overflow issues detected');
    }
    
    // Check positioning
    const fixedElements = document.querySelectorAll('[class*="fixed"]');
    let positioningIssues = 0;
    
    fixedElements.forEach(el => {
      const rect = el.getBoundingClientRect();
      // Check if element is completely outside viewport
      if (rect.right < -50 || rect.left > window.innerWidth + 50 || 
          rect.bottom < -50 || rect.top > window.innerHeight + 50) {
        positioningIssues++;
      }
    });
    
    if (positioningIssues > 0) {
      results.positioningCorrect = false;
      console.log(`❌ Found ${positioningIssues} elements with positioning issues`);
    } else {
      console.log('✅ No positioning issues detected');
    }
    
    // Overall result
    const allPassed = Object.values(results).every(result => result === true);
    
    console.log('\n📊 Layout Test Results:');
    console.log('='.repeat(30));
    Object.entries(results).forEach(([test, passed]) => {
      console.log(`${passed ? '✅' : '❌'} ${test}: ${passed ? 'PASS' : 'FAIL'}`);
    });
    
    console.log(`\n🎯 Overall: ${allPassed ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}`);
    
    if (!allPassed) {
      console.log('\n🔧 Try running: window.mobileLayoutFixer.quickMobileFix()');
    }
    
    return results;
  },
  
  /**
   * Check specifically for the debug elements you mentioned
   */
  checkDebugElements() {
    console.log('🔍 [LayoutTest] Checking for specific debug elements...');
    
    const issues = [];
    
    // Check for "Shell: space" text
    const shellElements = Array.from(document.querySelectorAll('*')).filter(el =>
      el.textContent && el.textContent.includes('Shell:')
    );
    
    if (shellElements.length > 0) {
      issues.push('Shell: debug element found');
      console.log('❌ Found "Shell:" debug element(s)');
      shellElements.forEach(el => console.log('  -', el.textContent));
    }
    
    // Check for "Skool Mobile Debug" panel
    const skoolElements = Array.from(document.querySelectorAll('*')).filter(el =>
      el.textContent && el.textContent.includes('Skool Mobile Debug')
    );
    
    if (skoolElements.length > 0) {
      issues.push('Skool Mobile Debug panel found');
      console.log('❌ Found "Skool Mobile Debug" panel(s)');
      skoolElements.forEach(el => console.log('  -', el.textContent?.slice(0, 100)));
    }
    
    if (issues.length === 0) {
      console.log('✅ No debug elements found - layout is clean!');
    }
    
    return issues;
  },
  
  /**
   * Check if layout requires swiping to see content
   */
  checkSwipingIssues() {
    console.log('📱 [LayoutTest] Checking for swiping/scrolling issues...');
    
    const issues = [];
    
    // Check horizontal scrolling
    if (document.body.scrollWidth > window.innerWidth) {
      issues.push(`Horizontal scroll detected: ${document.body.scrollWidth}px > ${window.innerWidth}px`);
    }
    
    // Check for elements positioned off-screen that might require swiping
    const allElements = document.querySelectorAll('div, section, header, main');
    let offScreenElements = 0;
    
    allElements.forEach(el => {
      const rect = el.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) { // Element is visible
        if (rect.left < -100 || rect.right > window.innerWidth + 100) {
          offScreenElements++;
        }
      }
    });
    
    if (offScreenElements > 5) { // Allow some tolerance for hidden menus etc
      issues.push(`${offScreenElements} elements positioned off-screen`);
    }
    
    if (issues.length === 0) {
      console.log('✅ No swiping issues detected');
    } else {
      console.log('❌ Swiping issues found:');
      issues.forEach(issue => console.log('  -', issue));
    }
    
    return issues;
  }
};

// Add to window for global access
if (typeof window !== 'undefined') {
  window.testLayoutFixes = window.testLayoutFixes;
}

console.log('🧪 Layout test script loaded. Run window.testLayoutFixes.runQuickTest()'); 