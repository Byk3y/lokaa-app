/**
 * 🎯 SILENT MOBILE WORKSPACE LOADING
 * 
 * Makes workspace initialization happen completely in background
 * without visual disruption - like Skool's seamless experience
 */

(function() {
  
  // Only run on mobile devices
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
                   window.innerWidth <= 768;
  
  if (!isMobile) {
    console.log('🖥️ [SilentLoading] Desktop detected - silent loading not needed');
    return;
  }
  
  console.log('📱 [SilentLoading] Mobile silent workspace loading initialized');
  
  /**
   * STRATEGY: Show cached content immediately, load fresh data silently
   */
  const SilentWorkspaceLoader = {
    
    // Cache for instant display
    cache: {
      workspaceData: null,
      userSpaces: null,
      lastUpdate: 0,
      isValid: function() {
        return this.lastUpdate && (Date.now() - this.lastUpdate) < 30000; // 30s
      }
    },
    
    // Background loading without UI changes
    loadWorkspaceInBackground: function() {
      console.log('📱 [SilentLoading] Starting background workspace load...');
      
      // Show cached content immediately if available
      if (this.cache.isValid()) {
        console.log('📱 [SilentLoading] Using cached workspace data');
        this.displayWorkspace(this.cache.workspaceData);
      }
      
      // Load fresh data in background (no loading states)
      this.fetchWorkspaceDataSilently()
        .then(data => {
          console.log('📱 [SilentLoading] Background load complete');
          this.cache.workspaceData = data;
          this.cache.lastUpdate = Date.now();
          
          // Update UI silently (no loading indicators)
          this.updateWorkspaceSilently(data);
        })
        .catch(error => {
          console.log('📱 [SilentLoading] Background load failed, using cache');
          // Fail silently - user keeps seeing cached content
        });
    },
    
    // Fetch data without showing loading states
    fetchWorkspaceDataSilently: async function() {
      // Create invisible loader to prevent UI loading states
      const silentLoader = document.createElement('div');
      silentLoader.style.display = 'none';
      document.body.appendChild(silentLoader);
      
      try {
        // Simulate workspace data fetch
        const response = await fetch('/api/workspace', {
          headers: { 'X-Silent-Load': 'true' }
        });
        return await response.json();
      } finally {
        document.body.removeChild(silentLoader);
      }
    },
    
    // Display workspace without loading indicators
    displayWorkspace: function(data) {
      console.log('📱 [SilentLoading] Displaying workspace silently');
      
      // Prevent "Setting up your workspace" messages
      this.suppressLoadingMessages();
      
      // Show content immediately
      this.renderWorkspaceContent(data);
    },
    
    // Update workspace content without visual disruption
    updateWorkspaceSilently: function(newData) {
      console.log('📱 [SilentLoading] Updating workspace silently');
      
      // Batch DOM updates to prevent reflow
      requestAnimationFrame(() => {
        // Update content in single frame
        this.renderWorkspaceContent(newData);
      });
    },
    
    // Suppress all loading-related messages
    suppressLoadingMessages: function() {
      // Override common loading message functions
      const originalLog = console.log;
      console.log = function(...args) {
        const message = args.join(' ');
        if (message.includes('Setting up') || 
            message.includes('Loading') || 
            message.includes('Initializing')) {
          return; // Suppress loading messages
        }
        originalLog.apply(console, args);
      };
      
      // Hide loading spinners
      const loadingElements = document.querySelectorAll('[class*="loading"], [class*="spinner"]');
      loadingElements.forEach(el => {
        if (el.textContent.includes('workspace') || el.textContent.includes('Setting up')) {
          el.style.display = 'none';
        }
      });
    },
    
    // Render workspace content
    renderWorkspaceContent: function(data) {
      // This would integrate with your React components
      // to update content without triggering loading states
      
      const workspaceContainer = document.querySelector('#root');
      if (workspaceContainer && data) {
        // Update workspace data without remounting components
        if (window.React && window.ReactDOM) {
          // Use React's concurrent features for seamless updates
          this.updateReactWorkspace(data);
        }
      }
    },
    
    // Update React workspace without remounting
    updateReactWorkspace: function(data) {
      // Dispatch custom event for React components to update silently
      const event = new CustomEvent('silent-workspace-update', {
        detail: { workspaceData: data }
      });
      document.dispatchEvent(event);
      
      console.log('📱 [SilentLoading] React workspace updated silently');
    },
    
    // Handle mobile background/foreground transitions
    handleMobileTransition: function() {
      console.log('📱 [SilentLoading] Mobile transition detected');
      
      // Start background loading immediately
      this.loadWorkspaceInBackground();
      
      // Prevent any visual loading states during transition
      this.suppressLoadingMessages();
      
      // Maintain current app state
      this.preserveAppState();
    },
    
    // Preserve current app state during loading
    preserveAppState: function() {
      // Prevent page scrolling to top
      const currentScroll = window.scrollY;
      
      // Prevent form data loss
      const formInputs = document.querySelectorAll('input, textarea');
      const formData = {};
      formInputs.forEach(input => {
        if (input.value) {
          formData[input.name || input.id] = input.value;
        }
      });
      
      // Restore state after loading
      setTimeout(() => {
        window.scrollTo(0, currentScroll);
        Object.keys(formData).forEach(key => {
          const input = document.querySelector(`[name="${key}"], #${key}`);
          if (input) input.value = formData[key];
        });
      }, 100);
    }
  };
  
  // Listen for mobile background/foreground events
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
      // User returned to app - load silently in background
      SilentWorkspaceLoader.handleMobileTransition();
    }
  });
  
  // Listen for React workspace update events
  document.addEventListener('silent-workspace-update', (event) => {
    console.log('📱 [SilentLoading] Received silent workspace update');
    // React components can listen for this event to update without loading states
  });
  
  // Initialize immediately
  SilentWorkspaceLoader.loadWorkspaceInBackground();
  
  // Global interface
  window.silentWorkspaceLoader = SilentWorkspaceLoader;
  
  console.log('📱 [SilentLoading] Available commands:');
  console.log('  - window.silentWorkspaceLoader.loadWorkspaceInBackground()');
  console.log('  - window.silentWorkspaceLoader.handleMobileTransition()');
  
})(); 