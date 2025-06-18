// 🚫 PHASE 8 DISABLE SCRIPT - Copy & Paste into Browser Console
// This script temporarily disables all Phase 8 AI systems to test if they cause the white cast

console.log('🚫 STARTING PHASE 8 DISABLE SCRIPT...');

// Function to disable all Phase 8 systems
function disableAllPhase8Systems() {
    console.log('🚫 DISABLING ALL PHASE 8 SYSTEMS...');
    
    const results = {
        phase8a: false,
        phase8b: false, 
        phase8c: false,
        dashboardsRemoved: 0,
        overlaysRemoved: 0,
        aiSystemsDisabled: 0
    };
    
    try {
        // 1. Disable Phase 8A (Content Intelligence)
        if (typeof window.phase8a !== 'undefined') {
            console.log('🚫 Disabling Phase 8A (Content Intelligence)...');
            if (window.phase8a.disable) window.phase8a.disable();
            if (window.phase8a.stop) window.phase8a.stop();
            if (window.phase8a.cleanup) window.phase8a.cleanup();
            window.__PHASE_8A_DISABLED__ = true;
            results.phase8a = true;
            results.aiSystemsDisabled++;
        }
        
        // 2. Disable Phase 8B (Predictive UX)
        if (typeof window.phase8b !== 'undefined') {
            console.log('🚫 Disabling Phase 8B (Predictive UX)...');
            if (window.phase8b.disable) window.phase8b.disable();
            if (window.phase8b.stop) window.phase8b.stop();
            if (window.phase8b.cleanup) window.phase8b.cleanup();
            if (window.phase8b.resetAdaptations) window.phase8b.resetAdaptations();
            window.__PHASE_8B_DISABLED__ = true;
            results.phase8b = true;
            results.aiSystemsDisabled++;
        }
        
        // 3. Disable Phase 8C (Automated Optimization)
        if (typeof window.phase8cIntegration !== 'undefined') {
            console.log('🚫 Disabling Phase 8C (Automated Optimization)...');
            if (window.phase8cIntegration.disable) window.phase8cIntegration.disable();
            if (window.phase8cIntegration.stop) window.phase8cIntegration.stop();
            if (window.phase8cIntegration.cleanup) window.phase8cIntegration.cleanup();
            window.__PHASE_8C_DISABLED__ = true;
            results.phase8c = true;
            results.aiSystemsDisabled++;
        }
        
        // 4. Disable all dashboard flags
        console.log('🚫 Disabling all dashboard flags...');
        delete window.__ENABLE_REALTIME_DASHBOARD__;
        delete window.__ENABLE_PERFORMANCE_DASHBOARD__;
        delete window.__ENABLE_AI_DASHBOARD__;
        delete window.__ENABLE_DEBUG_DASHBOARD__;
        
        // 5. Remove any existing dashboard/overlay elements
        console.log('🚫 Removing existing dashboards and overlays...');
        const selectors = [
            '[class*="fixed inset"]',
            '[class*="fixed bottom-4 right-4"]',
            '[class*="backdrop-blur"]',
            '[id*="dashboard"]',
            '[id*="debug"]',
            '[class*="z-50"]'
        ];
        
        selectors.forEach(selector => {
            const elements = document.querySelectorAll(selector);
            elements.forEach((element, index) => {
                const styles = window.getComputedStyle(element);
                // Only remove if it looks like a dashboard/overlay
                if (styles.position === 'fixed' && 
                    (parseInt(styles.zIndex) > 40 || 
                     styles.backdropFilter !== 'none' ||
                     element.textContent.includes('Dashboard') ||
                     element.textContent.includes('Performance') ||
                     element.textContent.includes('Real-time'))) {
                    console.log(`Removing element: ${selector}[${index}]`, element);
                    element.remove();
                    results.dashboardsRemoved++;
                }
            });
        });
        
        // 6. Disable predictive UI components
        console.log('🚫 Disabling predictive UI components...');
        if (typeof window.predictiveUIEngine !== 'undefined') {
            if (window.predictiveUIEngine.disable) window.predictiveUIEngine.disable();
            window.__PREDICTIVE_UI_DISABLED__ = true;
        }
        
        if (typeof window.userBehaviorPredictor !== 'undefined') {
            if (window.userBehaviorPredictor.disable) window.userBehaviorPredictor.disable();
            window.__BEHAVIOR_PREDICTOR_DISABLED__ = true;
        }
        
        if (typeof window.personalizationEngine !== 'undefined') {
            if (window.personalizationEngine.disable) window.personalizationEngine.disable();
            window.__PERSONALIZATION_DISABLED__ = true;
        }
        
        if (typeof window.adaptiveInterfaceManager !== 'undefined') {
            if (window.adaptiveInterfaceManager.disable) window.adaptiveInterfaceManager.disable();
            window.__ADAPTIVE_INTERFACE_DISABLED__ = true;
        }
        
        // 7. Clear any AI-related styles that might cause overlays
        console.log('🚫 Clearing AI-related styles...');
        const style = document.createElement('style');
        style.id = 'phase8-disable-styles';
        style.textContent = `
            /* Disable any AI-related overlays */
            [class*="phase8"], 
            [class*="ai-"], 
            [class*="predictive-"],
            [class*="adaptive-"] {
                display: none !important;
            }
            
            /* Remove any backdrop filters that might cause white cast */
            [style*="backdrop-filter"] {
                backdrop-filter: none !important;
            }
            
            /* Ensure no AI overlays */
            .fixed[class*="z-"] {
                z-index: auto !important;
            }
        `;
        document.head.appendChild(style);
        
        console.log('✅ Phase 8 systems disabled:', results);
        console.log('🔍 Navigate around and check if white cast is gone');
        console.log('🔄 If white cast persists, the issue is NOT Phase 8');
        
        return results;
        
    } catch (error) {
        console.error('❌ Error disabling Phase 8 systems:', error);
        return results;
    }
}

// Function to re-enable Phase 8 systems
function enableAllPhase8Systems() {
    console.log('🔄 RE-ENABLING ALL PHASE 8 SYSTEMS...');
    
    try {
        // Remove disable flags
        delete window.__PHASE_8A_DISABLED__;
        delete window.__PHASE_8B_DISABLED__;
        delete window.__PHASE_8C_DISABLED__;
        delete window.__PREDICTIVE_UI_DISABLED__;
        delete window.__BEHAVIOR_PREDICTOR_DISABLED__;
        delete window.__PERSONALIZATION_DISABLED__;
        delete window.__ADAPTIVE_INTERFACE_DISABLED__;
        
        // Remove disable styles
        const disableStyles = document.getElementById('phase8-disable-styles');
        if (disableStyles) disableStyles.remove();
        
        // Re-enable systems if they have enable methods
        if (typeof window.phase8a !== 'undefined' && window.phase8a.enable) window.phase8a.enable();
        if (typeof window.phase8b !== 'undefined' && window.phase8b.enable) window.phase8b.enable();
        if (typeof window.phase8cIntegration !== 'undefined' && window.phase8cIntegration.enable) window.phase8cIntegration.enable();
        
        console.log('✅ Phase 8 systems re-enabled');
        console.log('🔄 Refresh the page to fully restore Phase 8 functionality');
        
    } catch (error) {
        console.error('❌ Error re-enabling Phase 8 systems:', error);
    }
}

// Function to check Phase 8 status
function testPhase8Status() {
    console.log('🔍 TESTING PHASE 8 STATUS...');
    
    const status = {
        phase8a: {
            exists: typeof window.phase8a !== 'undefined',
            disabled: window.__PHASE_8A_DISABLED__ === true
        },
        phase8b: {
            exists: typeof window.phase8b !== 'undefined',
            disabled: window.__PHASE_8B_DISABLED__ === true
        },
        phase8c: {
            exists: typeof window.phase8cIntegration !== 'undefined',
            disabled: window.__PHASE_8C_DISABLED__ === true
        },
        dashboards: {
            realtimeDashboardEnabled: window.__ENABLE_REALTIME_DASHBOARD__ === true,
            performanceDashboardEnabled: window.__ENABLE_PERFORMANCE_DASHBOARD__ === true
        }
    };
    
    console.log('Phase 8 Status:', status);
    console.table(status);
    
    return status;
}

// Function to apply permanent fix
function applyPermanentPhase8Fix() {
    console.log('🔧 APPLYING PERMANENT PHASE 8 VISUAL FIX...');
    
    try {
        // 1. Set localStorage flag to prevent visual overlays
        localStorage.setItem('disablePhase8Visuals', 'true');
        console.log('✅ Set localStorage flag to disable Phase 8 visuals');
        
        // 2. Add persistent CSS rules
        const style = document.createElement('style');
        style.id = 'phase8-permanent-fix';
        style.textContent = `
            /* Permanent Phase 8 visual overlay prevention */
            [class*="fixed"][class*="inset"][class*="backdrop-blur"]:not([data-allowed-overlay]) {
                display: none !important;
            }
            
            [class*="fixed"][class*="z-50"][class*="bg-background"]:not([data-allowed-overlay]) {
                display: none !important;
            }
            
            .phase8-debug-overlay,
            .realtime-performance-dashboard,
            [class*="phase8"],
            [id*="phase8"] {
                display: none !important;
            }
            
            /* Prevent any AI debug overlays */
            [class*="ai-debug"],
            [class*="predictive-debug"],
            [class*="adaptive-debug"] {
                display: none !important;
            }
        `;
        document.head.appendChild(style);
        console.log('✅ Added permanent CSS rules to prevent overlays');
        
        // 3. Set global flags to prevent re-initialization
        window.__DISABLE_PHASE8_VISUALS__ = true;
        window.__PHASE8_VISUAL_FIX_APPLIED__ = true;
        
        // 4. Create a detection system for future overlays
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === 1) { // Element node
                        const element = node;
                        const styles = window.getComputedStyle(element);
                        
                        // Check if it's a potential overlay
                        if (styles.position === 'fixed' && 
                            parseInt(styles.zIndex) > 40 &&
                            (styles.backdropFilter !== 'none' || 
                             element.className.includes('backdrop-blur'))) {
                            
                            // Check if it's not an allowed overlay
                            if (!element.hasAttribute('data-allowed-overlay') &&
                                !element.closest('[data-allowed-overlay]')) {
                                console.log('🚫 Prevented Phase 8 overlay from appearing:', element);
                                element.style.display = 'none';
                            }
                        }
                    }
                });
            });
        });
        
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
        
        window.__phase8OverlayPrevention__ = observer;
        
        console.log('✅ Permanent Phase 8 visual fix applied successfully!');
        console.log('🔄 The fix will persist across page refreshes');
        console.log('💡 To re-enable Phase 8 visuals: localStorage.removeItem("disablePhase8Visuals")');
        
        return true;
        
    } catch (error) {
        console.error('❌ Error applying permanent fix:', error);
        return false;
    }
}

// Make functions globally available
window.disableAllPhase8Systems = disableAllPhase8Systems;
window.enableAllPhase8Systems = enableAllPhase8Systems;
window.testPhase8Status = testPhase8Status;
window.applyPermanentPhase8Fix = applyPermanentPhase8Fix;

// Auto-run the disable function
console.log('🚀 Phase 8 disable script loaded!');
console.log('');
console.log('📋 Available commands:');
console.log('- disableAllPhase8Systems() - Disable all Phase 8 systems');
console.log('- enableAllPhase8Systems() - Re-enable all Phase 8 systems');
console.log('- testPhase8Status() - Check current status');
console.log('- applyPermanentPhase8Fix() - Apply permanent fix');
console.log('');
console.log('🧪 TESTING PROCEDURE:');
console.log('1. Run: disableAllPhase8Systems()');
console.log('2. Navigate around your app');
console.log('3. Check if white cast disappears');
console.log('4. Report back results!');
console.log('');

// Automatically run a quick test to see what's available
testPhase8Status();

// Phase 8 Disable Script - Test Modal Functionality
// Run this script in the browser console to disable all Phase 8 systems and test the sign-in modal

console.log('🔧 Phase 8 Disable Script Starting...');

// 1. Disable Phase 8 Global Flags
window.__DISABLE_PHASE_8__ = true;
window.__ENABLE_REALTIME_DASHBOARD__ = false;
window.__DISABLE_AI_OVERLAYS__ = true;
window.__DISABLE_PHASE_8_VISUAL_OVERLAYS__ = true;

// 2. Clear Phase 8 DOM Elements
function clearPhase8Elements() {
  console.log('🧹 Clearing Phase 8 DOM elements...');
  
  // Remove any Phase 8 overlays
  const overlays = document.querySelectorAll('[data-phase8], [class*="phase8"], [id*="phase8"]');
  overlays.forEach(el => {
    console.log('🗑️ Removing Phase 8 element:', el);
    el.remove();
  });
  
  // Remove RealtimePerformanceDashboard
  const dashboards = document.querySelectorAll('[class*="RealtimePerformance"], [data-testid*="dashboard"]');
  dashboards.forEach(el => {
    console.log('🗑️ Removing dashboard element:', el);
    el.remove();
  });
  
  // Remove any fixed positioned overlays that might be blocking modals
  const fixedElements = document.querySelectorAll('[style*="position: fixed"], [class*="fixed"]');
  fixedElements.forEach(el => {
    if (el.style.zIndex > 1000 && el.style.background && el.style.background.includes('background')) {
      console.log('🗑️ Removing potential blocking overlay:', el);
      el.remove();
    }
  });
}

// 3. Disable Phase 8 Global Functions
function disablePhase8Functions() {
  console.log('🚫 Disabling Phase 8 functions...');
  
  // Disable Phase 8A
  if (window.phase8a) {
    window.phase8a.disable = () => true;
    window.phase8a.enabled = false;
  }
  
  // Disable Phase 8B
  if (window.phase8b) {
    window.phase8b.disable = () => true;
    window.phase8b.enabled = false;
  }
  
  // Disable Phase 8C
  if (window.phase8c) {
    window.phase8c.disable = () => true;
    window.phase8c.enabled = false;
  }
  
  // Disable any AI overlays
  if (window.disableRealtimeDashboard) {
    window.disableRealtimeDashboard();
  }
}

// 4. Clear Phase 8 CSS that might be blocking modals
function clearPhase8CSS() {
  console.log('🎨 Clearing Phase 8 CSS...');
  
  // Remove any backdrop-blur or overlay styles that might interfere
  const style = document.createElement('style');
  style.innerHTML = `
    /* Disable Phase 8 visual overlays */
    [class*="backdrop-blur"],
    [class*="bg-background/95"],
    [data-phase8="true"] {
      display: none !important;
    }
    
    /* Ensure modals can appear */
    .modal, [role="dialog"], [data-modal="true"] {
      z-index: 9999 !important;
      display: block !important;
    }
    
    /* Remove any potential blocking overlays */
    .fixed.inset-4.z-50 {
      display: none !important;
    }
  `;
  document.head.appendChild(style);
}

// 5. Test Modal System
function testModalSystem() {
  console.log('🧪 Testing modal system...');
  
  // Check if modal context is available
  try {
    // Try to open the login modal directly
    if (window.openLoginModal) {
      console.log('✅ Found window.openLoginModal function');
      window.openLoginModal();
    } else {
      console.log('❌ window.openLoginModal not available');
    }
    
    // Check for modal elements
    setTimeout(() => {
      const modals = document.querySelectorAll('[role="dialog"], .modal, [data-modal="true"]');
      console.log('🔍 Modal elements found:', modals.length);
      modals.forEach((modal, index) => {
        console.log(`Modal ${index + 1}:`, {
          element: modal,
          visible: modal.offsetHeight > 0,
          display: getComputedStyle(modal).display,
          zIndex: getComputedStyle(modal).zIndex
        });
      });
      
      if (modals.length === 0) {
        console.log('❌ No modal elements found - modal system may not be working');
      }
    }, 1000);
    
  } catch (error) {
    console.error('❌ Error testing modal system:', error);
  }
}

// 6. Check for blocking elements
function checkForBlockingElements() {
  console.log('🔍 Checking for elements that might block modals...');
  
  const highZIndexElements = [];
  const allElements = document.querySelectorAll('*');
  
  allElements.forEach(el => {
    const style = getComputedStyle(el);
    const zIndex = parseInt(style.zIndex);
    
    if (zIndex > 1000 && style.position === 'fixed') {
      highZIndexElements.push({
        element: el,
        zIndex: zIndex,
        className: el.className,
        id: el.id
      });
    }
  });
  
  console.log('🎯 High z-index fixed elements:', highZIndexElements);
  return highZIndexElements;
}

// 7. Main execution function
function disablePhase8AndTest() {
  console.log('🚀 Starting Phase 8 disable and modal test...');
  
  // Step 1: Disable Phase 8
  disablePhase8Functions();
  clearPhase8Elements();
  clearPhase8CSS();
  
  // Step 2: Check for blocking elements
  checkForBlockingElements();
  
  // Step 3: Test modal system
  setTimeout(() => {
    testModalSystem();
  }, 500);
  
  console.log('✅ Phase 8 disabled. Try clicking the Sign In button now.');
  console.log('💡 If modal still doesn\'t work, run: window.debugModalSystem()');
}

// 8. Debug function for further investigation
window.debugModalSystem = function() {
  console.log('🔧 Running modal system debug...');
  
  // Check modal provider
  console.log('Modal entries in DOM:', document.querySelectorAll('[data-modal]'));
  
  // Check React DevTools if available
  if (window.__REACT_DEVTOOLS_GLOBAL_HOOK__) {
    console.log('✅ React DevTools available - check component tree for modal state');
  }
  
  // Check for modal context
  const modalElements = document.querySelectorAll('[class*="modal"], [role="dialog"]');
  modalElements.forEach(el => {
    console.log('Modal element:', el, {
      styles: getComputedStyle(el),
      attributes: Array.from(el.attributes)
    });
  });
};

// 9. Auto-run the disable script
disablePhase8AndTest();

// 10. Create easy access functions
window.disablePhase8 = disablePhase8AndTest;
window.testModal = testModalSystem;

console.log('🔧 Phase 8 Disable Script Complete!');
console.log('📋 Available commands:');
console.log('  - window.disablePhase8() - Re-run disable script');
console.log('  - window.testModal() - Test modal system');
console.log('  - window.debugModalSystem() - Debug modal issues'); 