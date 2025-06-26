/**
 * Final Motion Element Check
 * 
 * Verifies that all motion animations have been eliminated
 */

window.FinalMotionCheck = (function() {
  'use strict';

  function checkMotionElements() {
    console.log('%c🎯 Final Motion Element Check', 'color: #10B981; font-weight: bold; font-size: 14px;');
    console.log('=====================================');
    
    // Check for various types of motion elements
    const motionElements = document.querySelectorAll('[style*="opacity: 0"], [style*="transform"]');
    const framerMotionElements = document.querySelectorAll('[data-framer-motion-id]');
    const animatePulse = document.querySelectorAll('.animate-pulse:not(.bg-gray-300)');
    const animateSpin = document.querySelectorAll('.animate-spin');
    const animateBounce = document.querySelectorAll('.animate-bounce');
    const animatePing = document.querySelectorAll('.animate-ping');
    
    console.log(`📊 Motion elements (opacity/transform): ${motionElements.length}`);
    console.log(`📊 Framer Motion elements: ${framerMotionElements.length}`);
    console.log(`📊 Animate pulse elements: ${animatePulse.length}`);
    console.log(`📊 Animate spin elements: ${animateSpin.length}`);
    console.log(`📊 Animate bounce elements: ${animateBounce.length}`);
    console.log(`📊 Animate ping elements: ${animatePing.length}`);
    
    const totalMotionElements = motionElements.length + framerMotionElements.length + 
                               animatePulse.length + animateSpin.length + 
                               animateBounce.length + animatePing.length;
    
    console.log(`📊 Total motion elements: ${totalMotionElements}`);
    
    if (totalMotionElements === 0) {
      console.log('%c🎉 SUCCESS! All motion animations eliminated!', 'color: #10B981; font-weight: bold;');
    } else {
      console.log('%c⚠️ Some motion elements still detected', 'color: #F59E0B; font-weight: bold;');
      
      // Log details of remaining elements
      if (animatePulse.length > 0) {
        console.log('Animate pulse elements:', animatePulse);
      }
      if (animateSpin.length > 0) {
        console.log('Animate spin elements:', animateSpin);
      }
      if (animateBounce.length > 0) {
        console.log('Animate bounce elements:', animateBounce);
      }
      if (animatePing.length > 0) {
        console.log('Animate ping elements:', animatePing);
      }
    }
    
    return {
      motionElements: motionElements.length,
      framerMotionElements: framerMotionElements.length,
      animatePulse: animatePulse.length,
      animateSpin: animateSpin.length,
      animateBounce: animateBounce.length,
      animatePing: animatePing.length,
      total: totalMotionElements
    };
  }
  
  return {
    checkMotionElements
  };
})();

// Auto-run the check
console.log('🔧 Final Motion Check loaded. Run: FinalMotionCheck.checkMotionElements()'); 