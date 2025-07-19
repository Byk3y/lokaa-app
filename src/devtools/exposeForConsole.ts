import { log } from '@/utils/logger';
/**
 * Development Console Helpers
 * 
 * Exposes testing utilities to window.lokaaTest for debugging and development.
 * Only loaded in development mode.
 */

import { FileValidationService, validateImageDimensionsInternal } from '@/services/FileValidationService';
import { getSupabaseClient } from '@/integrations/supabase/client';
import { chatApiService } from '@/features/chat/services/ChatApiService';
import { migrationAdapter } from '@/utils/indexeddb/migration/MigrationAdapter';

// Mock SupabaseIndexedDBBridge for development testing
class DevSupabaseIndexedDBBridge {
  private initialized = false;

  init() {
    if (process.env.NODE_ENV === 'development') {
      log.debug('App', '[DevBridge] Initialized');
    }
  }

  isInitialized() {
    return this.initialized;
  }

  cleanup() {
    if (process.env.NODE_ENV === 'development') {
      log.debug('App', '[DevBridge] Cleaned up');
    }
  }

  async getHealthStatus() {
    return { isHealthy: this.initialized, timestamp: Date.now() };
  }

  async getMetrics() {
    return { 
      cacheHits: Math.floor(Math.random() * 100),
      averageResponseTime: Math.floor(Math.random() * 50) + 10,
      initialized: this.initialized
    };
  }

  async getSpaceMembers(spaceId?: string) {
    if (process.env.NODE_ENV === 'development') {
      log.debug('App', `[DevBridge] Getting space members for: ${spaceId}`);
    }
    return [
      { id: 'user1', name: 'Test User 1', avatar_url: null },
      { id: 'user2', name: 'Test User 2', avatar_url: null }
    ];
  }

  async getMemberCounts(spaceId?: string) {
    if (process.env.NODE_ENV === 'development') {
      log.debug('App', `[DevBridge] Getting member counts for: ${spaceId}`);
    }
    return { total: 2, online: 1, admins: 1 };
  }

  async getOnlineMembers(spaceId?: string) {
    if (process.env.NODE_ENV === 'development') {
      log.debug('App', `[DevBridge] Getting online members for: ${spaceId}`);
    }
    return [{ id: 'user1', name: 'Test User 1', last_seen: new Date() }];
  }

  async getUserMembership(spaceId?: string, userId?: string) {
    if (process.env.NODE_ENV === 'development') {
      log.debug('App', `[DevBridge] Getting membership for user ${userId} in space ${spaceId}`);
    }
    return { role: 'member', joined_at: new Date(), is_online: true };
  }

  isMobileBrowser() {
    return /Mobi|Android/i.test(navigator.userAgent);
  }

  shouldUseCacheFirst() {
    return this.isMobileBrowser();
  }

  async clearAllCaches() {
    if (process.env.NODE_ENV === 'development') {
      log.debug('App', '[DevBridge] Clearing all caches');
    }
    return true;
  }

  async getCacheStatus(spaceId?: string) {
    return { 
      size: Math.floor(Math.random() * 1000), 
      isValid: Math.random() > 0.5,
      spaceId,
      lastUpdated: new Date()
    };
  }

  async invalidateSpaceCache(spaceId?: string) {
    if (process.env.NODE_ENV === 'development') {
      log.debug('App', `[DevBridge] Invalidating cache for space: ${spaceId}`);
    }
    return true;
  }

  async handleError(error: Error) {
    if (process.env.NODE_ENV === 'development') {
      log.error('App', '[DevBridge] Handling error:', error);
    }
    return { 
      message: error.message, 
      code: 'DEV_ERROR',
      timestamp: Date.now()
    };
  }
}

/**
 * Get mock information about the Supabase client
 */
function getSupabaseMockInfo() {
  const client = getSupabaseClient();
  
  return {
    isMocked: typeof client === 'function' || client?.constructor?.name === 'Object',
    methods: Object.getOwnPropertyNames(client || {}),
    from: typeof client?.from,
    auth: typeof client?.auth,
    storage: typeof client?.storage,
    rpc: typeof client?.rpc,
    // Test if methods are mocked
    testMockChain: () => {
      try {
        const chain = client?.from?.('test')?.select?.('*')?.eq?.('id', 1);
        return {
          chainable: !!chain,
          hasEq: typeof chain?.eq === 'function',
          hasMaybeSingle: typeof chain?.maybeSingle === 'function'
        };
      } catch (error) {
        return { error: error.message };
      }
    }
  };
}

/**
 * File validation testing helpers
 */
function getFileValidationHelpers() {
  const service = FileValidationService.getInstance();
  
  return {
    service,
    validateImageDimensionsInternal,
    
    // Helper to create test files
    createTestFile: (name: string, type: string, size: number = 1024) => {
      const content = new Array(size).fill('a').join('');
      return new File([content], name, { type });
    },
    
    // Helper to test image validation
    testImageValidation: async (file: File) => {
      try {
        const result = await validateImageDimensionsInternal(file);
        if (process.env.NODE_ENV === 'development') {
          log.debug('App', '[FileValidation] Image validation result:', result);
        }
        return result;
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
          log.error('App', '[FileValidation] Error:', error);
        }
        return { isValid: false, errors: [error.message] };
      }
    },
    
    // Helper to test file metadata
    testFileMetadata: async (file: File, type: 'image' | 'video' | 'document') => {
      try {
        const result = await service.validateFileMetadata(file, type);
        if (process.env.NODE_ENV === 'development') {
          log.debug('App', '[FileValidation] Metadata validation result:', result);
        }
        return result;
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
          log.error('App', '[FileValidation] Error:', error);
        }
        return { isValid: false, errors: [error.message] };
      }
    },
    
    // Get file type configurations
    getConfigs: () => {
      return {
        image: service.getFileConfig('image'),
        video: service.getFileConfig('video'),
        document: service.getFileConfig('document')
      };
    }
  };
}

/**
 * Initialize and expose development testing utilities
 */
export async function exposeForConsole() {
  if (!import.meta.env.DEV) {
    if (process.env.NODE_ENV === 'development') {
      log.warn('App', '[DevTools] Console helpers only available in development mode');
    }
    return;
  }

  // Initialize bridge
  const bridge = new DevSupabaseIndexedDBBridge();
  bridge.init();

  // Expose to window
  (window as any).lokaaTest = {
    // Bridge instance
    bridge,
    
    // File validation helpers
    fileValidation: getFileValidationHelpers(),
    
    // Chat services for adapter testing
    chat: {
      apiService: chatApiService,
      migrationAdapter,
      testUserConversations: async (userId = 'test-user') => {
        try {
          const result = await chatApiService.getUserConversations(userId);
          log.debug('App', '[ChatTest] getUserConversations result:', result);
          return result;
        } catch (error) {
          log.error('App', '[ChatTest] Error:', error);
          return { error: error.message };
        }
      }
    },
    
    // Supabase mock info
    supabase: {
      client: getSupabaseClient(),
      mockInfo: getSupabaseMockInfo(),
      testConnection: async () => {
        try {
          const client = getSupabaseClient();
          const result = await client?.from?.('test')?.select?.('*')?.eq?.('id', 1)?.maybeSingle?.();
          if (process.env.NODE_ENV === 'development') {
            log.debug('App', '[Supabase] Test connection result:', result);
          }
          return result;
        } catch (error) {
          if (process.env.NODE_ENV === 'development') {
            log.error('App', '[Supabase] Test connection error:', error);
          }
          return { error: error.message };
        }
      }
    },
    
    // Utility functions
    utils: {
      // Test environment info
      getEnvInfo: () => ({
        isDev: import.meta.env.DEV,
        mode: import.meta.env.MODE,
        userAgent: navigator.userAgent,
        isMobile: /Mobi|Android/i.test(navigator.userAgent),
        hasIndexedDB: 'indexedDB' in window,
        hasLocalStorage: 'localStorage' in window,
        hasSessionStorage: 'sessionStorage' in window
      }),
      
      // Storage helpers
      storage: {
        clear: () => {
          localStorage.clear();
          sessionStorage.clear();
          if (process.env.NODE_ENV === 'development') {
            log.debug('App', '[Storage] Cleared localStorage and sessionStorage');
          }
        },
        
        inspect: () => ({
          localStorage: Object.keys(localStorage).reduce((acc, key) => {
            acc[key] = localStorage.getItem(key);
            return acc;
          }, {} as Record<string, string | null>),
          
          sessionStorage: Object.keys(sessionStorage).reduce((acc, key) => {
            acc[key] = sessionStorage.getItem(key);
            return acc;
          }, {} as Record<string, string | null>)
        })
      },
      
      // Test data generators
      generateTestData: {
        user: (id = 'test-user') => ({
          id,
          email: `${id}@example.com`,
          full_name: `Test User ${id}`,
          avatar_url: null,
          created_at: new Date().toISOString()
        }),
        
        space: (id = 'test-space') => ({
          id,
          name: `Test Space ${id}`,
          subdomain: id.toLowerCase(),
          description: 'A test space for development',
          created_at: new Date().toISOString()
        }),
        
        post: (id = 'test-post') => ({
          id,
          title: `Test Post ${id}`,
          content: 'This is a test post for development',
          created_at: new Date().toISOString()
        })
      }
    }
  };

  // Also expose individual services for direct testing access
  (window as any).chatApiService = chatApiService;
  (window as any).migrationAdapter = migrationAdapter;

  if (process.env.NODE_ENV === 'development') {
    log.debug('App', '🛠️ [DevTools] Console helpers exposed to window.lokaaTest');
    log.debug('App', '📖 Available commands:');
    log.debug('App', '  window.lokaaTest.bridge - SupabaseIndexedDBBridge instance');
    log.debug('App', '  window.lokaaTest.fileValidation - File validation helpers');
    log.debug('App', '  window.lokaaTest.chat - Chat services and testing');
    log.debug('App', '  window.lokaaTest.supabase - Supabase client and mock info');
    log.debug('App', '  window.lokaaTest.utils - Environment and utility functions');
    log.debug('App', '  window.chatApiService - Direct ChatApiService access');
    log.debug('App', '  window.migrationAdapter - Direct MigrationAdapter access');
  }
} 