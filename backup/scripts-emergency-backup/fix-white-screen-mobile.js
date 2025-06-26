/**
 * 🚨 FIX WHITE SCREEN ON MOBILE
 * 
 * Comprehensive solution for white screen issues:
 * 1. Immediate skeleton loading
 * 2. React mounting fixes  
 * 3. Emergency recovery
 */

(function() {
  
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  
  console.log('🚨 [WhiteScreenFix] Initializing comprehensive mobile fix...');
  
  const WhiteScreenFix = {
    
    // STRATEGY 1: Show skeleton immediately
    showSkeletonImmediately: function() {
      console.log('💀 [WhiteScreenFix] Showing skeleton loader...');
      
      const root = document.querySelector('#root');
      if (!root || root.children.length === 0) {
        // Create skeleton HTML that looks like your app
        const skeletonHTML = `
          <div id="skeleton-loader" style="
            width: 100%;
            height: 100vh;
            background: #f8fafc;
            display: flex;
            flex-direction: column;
            font-family: -apple-system, BlinkMacSystemFont, sans-serif;
          ">
            <!-- Header Skeleton -->
            <div style="
              height: 60px;
              background: white;
              border-bottom: 1px solid #e2e8f0;
              display: flex;
              align-items: center;
              padding: 0 16px;
              box-shadow: 0 1px 3px rgba(0,0,0,0.1);
            ">
              <div style="
                width: 120px;
                height: 24px;
                background: linear-gradient(90deg, #e2e8f0 25%, #f1f5f9 50%, #e2e8f0 75%);
                background-size: 200px 100%;
                border-radius: 6px;
                animation: shimmer 1.5s infinite;
              "></div>
            </div>
            
            <!-- Content Skeleton -->
            <div style="
              flex: 1;
              padding: 20px 16px;
              overflow-y: auto;
            ">
              <!-- Post Skeleton -->
              <div style="
                background: white;
                border-radius: 12px;
                padding: 16px;
                margin-bottom: 12px;
                box-shadow: 0 1px 3px rgba(0,0,0,0.1);
              ">
                <!-- User Info -->
                <div style="display: flex; align-items: center; margin-bottom: 12px;">
                  <div style="
                    width: 40px;
                    height: 40px;
                    background: linear-gradient(90deg, #e2e8f0 25%, #f1f5f9 50%, #e2e8f0 75%);
                    background-size: 200px 100%;
                    border-radius: 50%;
                    animation: shimmer 1.5s infinite;
                  "></div>
                  <div style="margin-left: 12px;">
                    <div style="
                      width: 80px;
                      height: 14px;
                      background: linear-gradient(90deg, #e2e8f0 25%, #f1f5f9 50%, #e2e8f0 75%);
                      background-size: 200px 100%;
                      border-radius: 4px;
                      margin-bottom: 4px;
                      animation: shimmer 1.5s infinite;
                    "></div>
                    <div style="
                      width: 60px;
                      height: 12px;
                      background: linear-gradient(90deg, #e2e8f0 25%, #f1f5f9 50%, #e2e8f0 75%);
                      background-size: 200px 100%;
                      border-radius: 4px;
                      animation: shimmer 1.5s infinite;
                    "></div>
                  </div>
                </div>
                
                <!-- Post Content -->
                <div style="
                  width: 100%;
                  height: 16px;
                  background: linear-gradient(90deg, #e2e8f0 25%, #f1f5f9 50%, #e2e8f0 75%);
                  background-size: 200px 100%;
                  border-radius: 4px;
                  margin-bottom: 8px;
                  animation: shimmer 1.5s infinite;
                "></div>
                <div style="
                  width: 80%;
                  height: 16px;
                  background: linear-gradient(90deg, #e2e8f0 25%, #f1f5f9 50%, #e2e8f0 75%);
                  background-size: 200px 100%;
                  border-radius: 4px;
                  margin-bottom: 8px;
                  animation: shimmer 1.5s infinite;
                "></div>
              </div>
            </div>
            
            <!-- Bottom Navigation Skeleton -->
            <div style="
              height: 64px;
              background: white;
              border-top: 1px solid #e2e8f0;
              display: flex;
              align-items: center;
              justify-content: space-around;
              padding: 8px 0;
            ">
              <div style="width: 24px; height: 24px; background: #e2e8f0; border-radius: 6px;"></div>
              <div style="width: 24px; height: 24px; background: #e2e8f0; border-radius: 6px;"></div>
              <div style="width: 24px; height: 24px; background: #e2e8f0; border-radius: 6px;"></div>
              <div style="width: 24px; height: 24px; background: #e2e8f0; border-radius: 6px;"></div>
              <div style="width: 24px; height: 24px; background: #e2e8f0; border-radius: 6px;"></div>
            </div>
          </div>
          
          <style>
            @keyframes shimmer {
              0% { background-position: -200px 0; }
              100% { background-position: calc(200px + 100%) 0; }
            }
          </style>
        `;
        
        root.innerHTML = skeletonHTML;
        console.log('💀 [WhiteScreenFix] Skeleton displayed');
        
        return true;
      }
      return false;
    },
    
    // STRATEGY 2: Fix React mounting issues
    forceReactMount: function() {
      console.log('⚛️ [WhiteScreenFix] Attempting to force React mount...');
      
      // Trigger DOMContentLoaded if React didn't start
      const event = new Event('DOMContentLoaded');
      document.dispatchEvent(event);
      
      // Force module reload if needed
      setTimeout(() => {
        const mainScript = document.querySelector('script[src*="main.tsx"]');
        if (mainScript && document.querySelector('#root').children.length <= 1) {
          console.log('⚛️ [WhiteScreenFix] Reloading main script...');
          const newScript = document.createElement('script');
          newScript.type = 'module';
          newScript.src = mainScript.src + '?reload=' + Date.now();
          document.head.appendChild(newScript);
        }
      }, 2000);
    },
    
    // STRATEGY 3: Emergency recovery
    emergencyRecovery: function() {
      console.log('🚨 [WhiteScreenFix] Initiating emergency recovery...');
      
      // Force hard refresh as last resort
      setTimeout(() => {
        const root = document.querySelector('#root');
        const skeleton = document.querySelector('#skeleton-loader');
        if (root && skeleton && root.children.length === 1) {
          console.log('🚨 [WhiteScreenFix] Emergency: Hard refresh needed');
          if (isMobile) {
            window.location.reload(true);
          }
        }
      }, 15000); // 15 second timeout
    },
    
    // Remove skeleton when React loads
    removeSkeletonWhenReady: function() {
      const checkInterval = setInterval(() => {
        const root = document.querySelector('#root');
        const skeleton = document.querySelector('#skeleton-loader');
        
        if (root && skeleton && root.children.length > 1) {
          // React has loaded content alongside skeleton
          console.log('⚛️ [WhiteScreenFix] React loaded, removing skeleton');
          skeleton.remove();
          clearInterval(checkInterval);
        }
      }, 500);
      
      // Force remove skeleton after 20 seconds
      setTimeout(() => {
        const skeleton = document.querySelector('#skeleton-loader');
        if (skeleton) {
          console.log('⏰ [WhiteScreenFix] Timeout: Removing skeleton');
          skeleton.remove();
        }
        clearInterval(checkInterval);
      }, 20000);
    },
    
    // Main fix function
    applyComprehensiveFix: function() {
      console.log('🚨 [WhiteScreenFix] Applying comprehensive fix...');
      
      // Step 1: Show skeleton immediately
      const skeletonShown = this.showSkeletonImmediately();
      
      // Step 2: Try to fix React mounting
      this.forceReactMount();
      
      // Step 3: Set up skeleton removal
      if (skeletonShown) {
        this.removeSkeletonWhenReady();
      }
      
      // Step 4: Emergency recovery as backup
      this.emergencyRecovery();
      
      console.log('✅ [WhiteScreenFix] All fixes applied');
    }
  };
  
  // AUTO-APPLY on mobile
  if (isMobile) {
    console.log('📱 [WhiteScreenFix] Mobile detected - applying fixes');
    
    // Apply immediately
    WhiteScreenFix.applyComprehensiveFix();
    
    // Apply again on visibility change (background/foreground)
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        console.log('📱 [WhiteScreenFix] App returned from background');
        setTimeout(() => {
          const root = document.querySelector('#root');
          if (!root || root.children.length === 0) {
            WhiteScreenFix.applyComprehensiveFix();
          }
        }, 1000);
      }
    });
  }
  
  // Global interface
  window.whiteScreenFix = WhiteScreenFix;
  
  console.log('🚨 [WhiteScreenFix] Ready');
  
})();
