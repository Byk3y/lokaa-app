#!/usr/bin/env node

/**
 * Fix Chat List Popover Cache - Targeted Fix
 * 
 * The chat list popover has persistent cache that survives hard refresh
 * This script creates a more aggressive cache invalidation approach
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function createAggressiveCacheInvalidation() {
  console.log('🎯 [PopoverCacheFix] Creating aggressive cache invalidation...');
  
  const aggressiveScript = `
// Aggressive Cache Invalidation - ${new Date().toISOString()}
// Targets persistent chat list popover cache

(function() {
  console.log('🎯 Aggressive cache invalidation starting...');
  
  // Step 1: Nuclear storage clearing
  try {
    // Clear all possible storage mechanisms
    if (typeof localStorage !== 'undefined') localStorage.clear();
    if (typeof sessionStorage !== 'undefined') sessionStorage.clear();
    if (typeof indexedDB !== 'undefined') {
      // Clear all IndexedDB databases
      indexedDB.databases().then(databases => {
        databases.forEach(db => {
          if (db.name) {
            indexedDB.deleteDatabase(db.name);
            console.log('🗑️ Deleted IndexedDB:', db.name);
          }
        });
      });
    }
    console.log('✅ Cleared all storage');
  } catch (e) {
    console.warn('⚠️ Storage clear error:', e);
  }
  
  // Step 2: Reset ALL possible chat stores
  const allStoreNames = [
    'useChatStore',
    'useConversationStore', 
    'useMessageStore',
    'useRealtimeStore',
    'useNavigationStore',
    'useChatUnified',
    'useChatRealtime',
    'useChatNavigation'
  ];
  
  allStoreNames.forEach(storeName => {
    try {
      const store = window[storeName];
      if (store?.getState) {
        const state = store.getState();
        
        // Try multiple reset strategies
        if (typeof state.reset === 'function') {
          state.reset();
          console.log(\`✅ Reset \${storeName} (method 1)\`);
        } else if (typeof store.setState === 'function') {
          // Force reset state manually
          store.setState({
            conversations: [],
            messages: {},
            hasInitialized: false,
            loading: false,
            error: null,
            lastUpdate: 0,
            lastMessageUpdate: 0,
            activeConversationId: null
          });
          console.log(\`✅ Reset \${storeName} (method 2)\`);
        } else if (typeof store.destroy === 'function') {
          store.destroy();
          console.log(\`✅ Destroyed \${storeName}\`);
        }
      }
    } catch (e) {
      console.warn(\`⚠️ Could not reset \${storeName}:\`, e);
    }
  });
  
  // Step 3: Clear all cache coordinators and bridges
  const cacheTargets = [
    'globalCacheCoordinator',
    'supabaseIndexedDBBridge',
    'globalTabComponentManager',
    'globalSpaceStateManager',
    'chatCacheManager',
    'conversationCacheManager',
    'messageCacheManager'
  ];
  
  cacheTargets.forEach(target => {
    try {
      if (window[target]) {
        if (typeof window[target].clear === 'function') {
          window[target].clear();
          console.log(\`✅ Cleared \${target}\`);
        } else if (typeof window[target].clearCache === 'function') {
          window[target].clearCache();
          console.log(\`✅ Cleared \${target} cache\`);
        } else if (typeof window[target].clearAll === 'function') {
          window[target].clearAll();
          console.log(\`✅ Cleared all \${target}\`);
        } else if (window[target].cache) {
          window[target].cache = {};
          console.log(\`✅ Reset \${target} cache object\`);
        }
      }
    } catch (e) {
      console.warn(\`⚠️ Could not clear \${target}:\`, e);
    }
  });
  
  // Step 4: Clear React Query cache if present
  try {
    if (window.queryClient) {
      window.queryClient.clear();
      console.log('✅ Cleared React Query cache');
    }
    if (window.useQueryClient) {
      const queryClient = window.useQueryClient();
      if (queryClient?.clear) {
        queryClient.clear();
        console.log('✅ Cleared React Query client');
      }
    }
  } catch (e) {
    console.warn('⚠️ Could not clear React Query:', e);
  }
  
  // Step 5: Force invalidate Service Worker cache
  try {
    if ('serviceWorker' in navigator && 'caches' in window) {
      caches.keys().then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            console.log('🗑️ Deleting cache:', cacheName);
            return caches.delete(cacheName);
          })
        );
      }).then(() => {
        console.log('✅ Cleared all service worker caches');
      });
    }
  } catch (e) {
    console.warn('⚠️ Could not clear service worker caches:', e);
  }
  
  // Step 6: Override cache-first logic temporarily
  try {
    // Disable cache-first for mobile
    if (window.supabaseIndexedDBBridge) {
      const originalGetUserConversations = window.supabaseIndexedDBBridge.getUserConversations;
      window.supabaseIndexedDBBridge.getUserConversations = function(userId, options = {}) {
        // Force network for next few calls
        return originalGetUserConversations.call(this, userId, { ...options, forceNetwork: true });
      };
      console.log('✅ Overrode cache-first logic');
      
      // Restore after 30 seconds
      setTimeout(() => {
        window.supabaseIndexedDBBridge.getUserConversations = originalGetUserConversations;
        console.log('🔄 Restored original cache logic');
      }, 30000);
    }
  } catch (e) {
    console.warn('⚠️ Could not override cache logic:', e);
  }
  
  // Step 7: Aggressive page reload
  console.log('🔄 Force reloading page in 3 seconds...');
  
  setTimeout(() => {
    // Try multiple reload strategies
    try {
      // Method 1: Hard reload with cache busting
      const url = new URL(window.location.href);
      url.searchParams.set('cache_bust', Date.now());
      url.searchParams.set('force_refresh', 'true');
      url.searchParams.set('clear_cache', 'true');
      window.location.href = url.toString();
    } catch (e) {
      try {
        // Method 2: Force reload
        window.location.reload(true);
      } catch (e2) {
        // Method 3: Simple reload
        window.location.reload();
      }
    }
  }, 3000);
  
  console.log('🎯 Aggressive cache invalidation completed');
})();
`;

  const scriptPath = path.join(__dirname, '../public/aggressive-cache-fix.js');
  fs.writeFileSync(scriptPath, aggressiveScript);
  console.log('✅ Created aggressive cache invalidation script');
  
  return scriptPath;
}

function addCacheInvalidationToIndex() {
  console.log('📝 [PopoverCacheFix] Adding cache invalidation to index.html...');
  
  const indexPath = path.join(__dirname, '../index.html');
  
  if (!fs.existsSync(indexPath)) {
    console.log('⚠️ index.html not found, checking public directory...');
    const publicIndexPath = path.join(__dirname, '../public/index.html');
    if (fs.existsSync(publicIndexPath)) {
      addScriptToHTML(publicIndexPath);
    } else {
      console.log('⚠️ Could not find index.html');
    }
  } else {
    addScriptToHTML(indexPath);
  }
}

function addScriptToHTML(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Check if script is already added
    if (content.includes('aggressive-cache-fix.js')) {
      console.log('⚠️ Cache fix script already present in HTML');
      return;
    }
    
    // Add script before closing head tag
    const scriptTag = '  <script src="/aggressive-cache-fix.js"></script>\n</head>';
    content = content.replace('</head>', scriptTag);
    
    fs.writeFileSync(filePath, content);
    console.log('✅ Added cache invalidation script to HTML');
  } catch (error) {
    console.log('⚠️ Could not modify HTML file:', error.message);
  }
}

// Execute the fix
console.log('🎯 [PopoverCacheFix] Starting targeted popover cache fix...');

try {
  const scriptPath = createAggressiveCacheInvalidation();
  addCacheInvalidationToIndex();
  
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✅ [PopoverCacheFix] Aggressive cache fix created');
  console.log('');
  console.log('🎯 This will:');
  console.log('1. Clear ALL storage (localStorage, sessionStorage, IndexedDB)');
  console.log('2. Reset ALL chat stores (including Phase 5 stores)');
  console.log('3. Clear ALL cache coordinators and bridges');
  console.log('4. Override cache-first logic temporarily');
  console.log('5. Force hard reload with cache busting');
  console.log('');
  console.log('📱 Next step: Refresh your browser');
  console.log('⏱️  The script will auto-execute and reload the page');
  console.log('');
  
} catch (error) {
  console.error('❌ [PopoverCacheFix] Failed:', error);
  process.exit(1);
} 