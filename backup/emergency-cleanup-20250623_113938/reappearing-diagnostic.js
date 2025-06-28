/**
 * Navigation Reappearing Issue Diagnostic
 * 
 * This script will track exactly what's causing posts to reappear during navigation
 */

window.ReappearingDiagnostic = (function() {
  'use strict';

  let isMonitoring = false;
  let componentStates = new Map();
  let renderCounts = new Map();
  let propChanges = new Map();

  /**
   * Track PostCard component lifecycle
   */
  function trackPostCardLifecycle() {
    // Monitor for PostCard DOM changes
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList') {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === 1 && node.classList) {
              // Check if this looks like a PostCard
              if (node.classList.contains('bg-white') && 
                  node.classList.contains('border') && 
                  node.classList.contains('h-[240px]')) {
                
                const postId = extractPostIdFromElement(node);
                if (postId) {
                  const currentCount = renderCounts.get(postId) || 0;
                  renderCounts.set(postId, currentCount + 1);
                  
                  if (currentCount > 0) {
                    console.warn(`🚨 [ReappearingDiagnostic] PostCard ${postId} RECREATED (render #${currentCount + 1})`);
                  } else {
                    console.log(`✅ [ReappearingDiagnostic] PostCard ${postId} initial render`);
                  }
                }
              }
            }
          });
          
          mutation.removedNodes.forEach((node) => {
            if (node.nodeType === 1 && node.classList) {
              if (node.classList.contains('bg-white') && 
                  node.classList.contains('border') && 
                  node.classList.contains('h-[240px]')) {
                
                const postId = extractPostIdFromElement(node);
                if (postId) {
                  console.warn(`🗑️ [ReappearingDiagnostic] PostCard ${postId} REMOVED from DOM`);
                }
              }
            }
          });
        }
      });
    });

    // Monitor the posts container
    const postsContainer = document.querySelector('.space-y-4');
    if (postsContainer) {
      observer.observe(postsContainer, { 
        childList: true, 
        subtree: true 
      });
      console.log('📊 [ReappearingDiagnostic] Monitoring posts container for changes');
    }

    return observer;
  }

  /**
   * Extract post ID from a DOM element
   */
  function extractPostIdFromElement(element) {
    // Try to find a unique identifier
    const titleElement = element.querySelector('.post-title');
    const authorElement = element.querySelector('.post-author');
    const timeElement = element.querySelector('.post-time');
    
    if (titleElement && authorElement) {
      // Create a pseudo-ID from title + author
      const title = titleElement.textContent?.slice(0, 20) || 'untitled';
      const author = authorElement.textContent?.slice(0, 10) || 'unknown';
      return `${title}-${author}`;
    }
    
    return null;
  }

  /**
   * Check current navigation status
   */
  function checkNavigationStatus() {
    const currentRoute = window.location.pathname;
    const navigationService = window.navigationAwareRealtimeService;
    
    console.log('🧭 [ReappearingDiagnostic] Current Navigation Status:', {
      currentRoute,
      serviceAvailable: !!navigationService,
      stats: navigationService?.getStats(),
      tabManagerAvailable: !!window.globalTabComponentManager,
      componentCount: window.globalTabComponentManager?.getComponentCount?.() || 'unknown'
    });
  }

  /**
   * Run comprehensive diagnostic
   */
  function runDiagnostic() {
    console.log('%c🔬 Starting Reappearing Issue Diagnostic', 'color: #3B82F6; font-weight: bold; font-size: 16px;');
    console.log('==========================================');
    
    isMonitoring = true;
    renderCounts.clear();
    propChanges.clear();
    componentStates.clear();
    
    // Check current status
    checkNavigationStatus();
    
    // Start monitoring
    const domObserver = trackPostCardLifecycle();
    
    // Store observers for cleanup
    window.ReappearingDiagnostic.domObserver = domObserver;
    
    console.log('\n🚀 DIAGNOSTIC INSTRUCTIONS:');
    console.log('============================');
    console.log('1. Navigate to Chat tab');
    console.log('2. Wait 2 seconds');
    console.log('3. Navigate back to Home/Feed tab');
    console.log('4. Watch the console for diagnostic messages');
    console.log('5. Run: ReappearingDiagnostic.getResults() for summary');
    
    console.log('\n📊 Monitoring started...');
  }

  /**
   * Get diagnostic results
   */
  function getResults() {
    console.log('\n📊 REAPPEARING DIAGNOSTIC RESULTS');
    console.log('==================================');
    
    console.log('🔢 Component Render Counts:');
    renderCounts.forEach((count, component) => {
      if (count > 1) {
        console.warn(`❌ ${component}: ${count} renders (RECREATED)`);
      } else {
        console.log(`✅ ${component}: ${count} render (STABLE)`);
      }
    });
    
    console.log('\n🎯 LIKELY CAUSES:');
    const multipleRenders = Array.from(renderCounts.entries()).filter(([_, count]) => count > 1);
    
    if (multipleRenders.length > 0) {
      console.error('❌ COMPONENTS ARE BEING RECREATED:');
      multipleRenders.forEach(([component, count]) => {
        console.error(`   - ${component} recreated ${count - 1} times`);
      });
      console.log('\n💡 Possible fixes:');
      console.log('   - Check for unstable keys in map functions');
      console.log('   - Check for unstable props (functions, objects)');
      console.log('   - Check parent component rerendering');
    } else {
      console.log('✅ No component recreation detected');
      console.log('   The reappearing might be due to CSS animations or transitions');
    }
    
    return {
      renderCounts: Object.fromEntries(renderCounts),
      hasRecreation: multipleRenders.length > 0
    };
  }

  /**
   * Stop monitoring
   */
  function stopMonitoring() {
    isMonitoring = false;
    
    if (window.ReappearingDiagnostic.domObserver) {
      window.ReappearingDiagnostic.domObserver.disconnect();
    }
    
    console.log('🛑 [ReappearingDiagnostic] Monitoring stopped');
  }

  /**
   * Quick test for the "new comment" issue
   */
  function testNewCommentDisplay() {
    console.log('\n💬 Testing "New Comment" Display Logic...');
    
    const postCards = document.querySelectorAll('.bg-white.border');
    console.log(`Found ${postCards.length} post cards`);
    
    postCards.forEach((card, index) => {
      const commentInfo = card.querySelector('.typography-caption.text-blue-600');
      const authorName = card.querySelector('.post-author')?.textContent;
      
      console.log(`Post ${index + 1} (${authorName}):`, {
        hasCommentInfo: !!commentInfo,
        commentText: commentInfo?.textContent,
        hasAvatars: card.querySelector('.w-8.h-8.border-2') !== null
      });
    });
  }

  return {
    runDiagnostic,
    getResults,
    stopMonitoring,
    checkNavigationStatus,
    testNewCommentDisplay,
    isMonitoring: () => isMonitoring
  };
})();

console.log('🔬 Reappearing Issue Diagnostic loaded');
console.log('📖 Usage:');
console.log('  - ReappearingDiagnostic.runDiagnostic() - Start monitoring');
console.log('  - ReappearingDiagnostic.getResults() - Get results');
console.log('  - ReappearingDiagnostic.testNewCommentDisplay() - Test comment display');
console.log('  - ReappearingDiagnostic.stopMonitoring() - Stop monitoring'); 