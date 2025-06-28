/**
 * 🎯 SKOOL-STYLE SILENT LOADING
 * 
 * Makes workspace loading completely invisible on mobile
 * No "Setting up workspace", no loading states, no visual disruption
 */

(function() {
  
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  
  if (!isMobile) {
    console.log('🖥️ Desktop - silent loading not needed');
    return;
  }
  
  console.log('📱 [SkoolSilent] Initializing silent workspace loading...');
  
  const SkoolStyleLoader = {
    
    // STRATEGY 1: Instant Cache Display
    showCachedContentImmediately: function() {
      const cachedWorkspace = localStorage.getItem('workspace_cache');
      const cachedSpaces = localStorage.getItem('spaces_cache');
      
      if (cachedWorkspace && cachedSpaces) {
        console.log('📱 [SkoolSilent] Showing cached content instantly');
        
        // Display cached content without any loading indicators
        this.displayContentSilently(JSON.parse(cachedWorkspace));
        return true;
      }
      return false;
    },
    
    // STRATEGY 2: Suppress All Loading Messages
    suppressLoadingStates: function() {
      console.log('📱 [SkoolSilent] Suppressing loading states...');
      
      // 1. Hide "Setting up your workspace" messages
      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === 1) { // Element node
              const text = node.textContent || '';
              if (text.includes('Setting up') || 
                  text.includes('Loading') || 
                  text.includes('Initializing') ||
                  text.includes('workspace')) {
                node.style.display = 'none';
                console.log('📱 [SkoolSilent] Hid loading message:', text.slice(0, 50));
              }
            }
          });
        });
      });
      
      observer.observe(document.body, {
        childList: true,
        subtree: true
      });
      
      // 2. Override loading state setters
      this.overrideLoadingStates();
    },
    
    // STRATEGY 3: Background Data Loading
    loadDataInBackground: function() {
      console.log('📱 [SkoolSilent] Loading fresh data in background...');
      
      // Create invisible iframe for background loading
      const backgroundLoader = document.createElement('iframe');
      backgroundLoader.style.display = 'none';
      backgroundLoader.style.width = '0';
      backgroundLoader.style.height = '0';
      document.body.appendChild(backgroundLoader);
      
      // Load data without affecting main UI
      Promise.all([
        this.fetchWorkspaceDataSilently(),
        this.fetchSpacesDataSilently(),
        this.fetchUserProfileSilently()
      ]).then(([workspace, spaces, profile]) => {
        console.log('📱 [SkoolSilent] Background loading complete');
        
        // Cache new data
        localStorage.setItem('workspace_cache', JSON.stringify(workspace));
        localStorage.setItem('spaces_cache', JSON.stringify(spaces));
        localStorage.setItem('profile_cache', JSON.stringify(profile));
        
        // Update UI silently
        this.updateUISilently({ workspace, spaces, profile });
        
        // Remove background loader
        document.body.removeChild(backgroundLoader);
      }).catch(error => {
        console.log('📱 [SkoolSilent] Background loading failed - using cache');
        document.body.removeChild(backgroundLoader);
      });
    },
    
    // Fetch data without triggering loading states
    fetchWorkspaceDataSilently: async function() {
      try {
        const response = await fetch('/api/workspace', {
          headers: {
            'X-Background-Load': 'true',
            'X-Silent-Mode': 'true'
          }
        });
        return await response.json();
      } catch (error) {
        throw new Error('Silent fetch failed');
      }
    },
    
    fetchSpacesDataSilently: async function() {
      try {
        const response = await fetch('/api/spaces', {
          headers: {
            'X-Background-Load': 'true',
            'X-Silent-Mode': 'true'
          }
        });
        return await response.json();
      } catch (error) {
        throw new Error('Silent fetch failed');
      }
    },
    
    fetchUserProfileSilently: async function() {
      try {
        const response = await fetch('/api/profile', {
          headers: {
            'X-Background-Load': 'true',
            'X-Silent-Mode': 'true'
          }
        });
        return await response.json();
      } catch (error) {
        throw new Error('Silent fetch failed');
      }
    },
    
    // Display content without loading indicators
    displayContentSilently: function(data) {
      console.log('📱 [SkoolSilent] Displaying content silently');
      
      // Prevent any loading spinners
      const style = document.createElement('style');
      style.textContent = `
        .loading-spinner,
        .loading-indicator,
        .workspace-loading,
        [class*="loading"],
        [class*="spinner"] {
          display: none !important;
        }
        
        /* Hide text containing loading words */
        *:contains("Setting up"),
        *:contains("Loading"),
        *:contains("Initializing") {
          display: none !important;
        }
      `;
      document.head.appendChild(style);
      
      // Show content immediately
      this.renderWorkspaceContent(data);
    },
    
    // Update UI without visual disruption
    updateUISilently: function(data) {
      console.log('📱 [SkoolSilent] Updating UI silently');
      
      // Use requestAnimationFrame for smooth updates
      requestAnimationFrame(() => {
        // Update React state silently
        const event = new CustomEvent('silent-update', {
          detail: data
        });
        document.dispatchEvent(event);
      });
    },
    
    // Override React loading states
    overrideLoadingStates: function() {
      // Intercept React setState calls that set loading states
      if (window.React) {
        console.log('📱 [SkoolSilent] Overriding React loading states');
        
        // Override useState for loading states
        const originalUseState = window.React.useState;
        if (originalUseState) {
          window.React.useState = function(initialState) {
            if (typeof initialState === 'boolean' && initialState === true) {
              // If initial state is true (loading), set it to false
              return originalUseState(false);
            }
            return originalUseState(initialState);
          };
        }
      }
    },
    
    // Render workspace content
    renderWorkspaceContent: function(data) {
      // This integrates with your existing React components
      // but prevents loading states from showing
      
      const workspaceContainer = document.querySelector('#root');
      if (workspaceContainer && data) {
        // Update without triggering component remounts
        this.updateReactComponentsSilently(data);
      }
    },
    
    // Update React components without loading states
    updateReactComponentsSilently: function(data) {
      // Dispatch event that React components can listen to
      const event = new CustomEvent('workspace-silent-update', {
        detail: {
          workspace: data,
          silentMode: true,
          skipLoading: true
        }
      });
      
      document.dispatchEvent(event);
      console.log('📱 [SkoolSilent] React components updated silently');
    },
    
    // Handle mobile app transitions
    handleMobileTransition: function() {
      console.log('📱 [SkoolSilent] Handling mobile transition...');
      
      // 1. Show cached content immediately
      const hasCachedContent = this.showCachedContentImmediately();
      
      // 2. Suppress any loading states
      this.suppressLoadingStates();
      
      // 3. Load fresh data in background
      this.loadDataInBackground();
      
      // 4. Prevent app from showing initialization messages
      this.preventInitializationMessages();
      
      console.log('📱 [SkoolSilent] Mobile transition handled - no visual disruption');
    },
    
    // Prevent initialization messages
    preventInitializationMessages: function() {
      // Override console.log to filter out initialization messages
      const originalLog = console.log;
      console.log = function(...args) {
        const message = args.join(' ');
        if (message.includes('🚀 [AppInitialization]') ||
            message.includes('Setting up') ||
            message.includes('Initializing') ||
            message.includes('Starting app') ||
            message.includes('workspace')) {
          return; // Silently ignore these messages
        }
        originalLog.apply(console, args);
      };
    }
  };
  
  // AUTO-INITIALIZE when page loads
  document.addEventListener('DOMContentLoaded', () => {
    SkoolStyleLoader.handleMobileTransition();
  });
  
  // Handle visibility changes (background/foreground)
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
      // User returned to app - handle silently
      SkoolStyleLoader.handleMobileTransition();
    }
  });
  
  // Global interface for testing
  window.skoolStyleLoader = SkoolStyleLoader;
  
  console.log('📱 [SkoolSilent] Silent loading system ready');
  console.log('🧪 Test: window.skoolStyleLoader.handleMobileTransition()');
  
})(); 