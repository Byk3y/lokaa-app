import { log } from '@/utils/logger';
// Development Tools Service - extracted from App.tsx
// Consolidates all development utilities, debugging interfaces, and Phase imports

export interface DevelopmentToolsOptions {
  enablePhaseIntegrations?: boolean;
  enableDebugUtilities?: boolean;
  enableConsoleDebuggers?: boolean;
}

export class DevelopmentTools {
  private static instance: DevelopmentTools;
  private isInitialized = false;

  static getInstance(): DevelopmentTools {
    if (!DevelopmentTools.instance) {
      DevelopmentTools.instance = new DevelopmentTools();
    }
    return DevelopmentTools.instance;
  }

  async initialize(options: DevelopmentToolsOptions = {}): Promise<void> {
    if (this.isInitialized) {
      log.warn('Utils', '🔧 [DevelopmentTools] Already initialized');
      return;
    }

    const {
      enablePhaseIntegrations = import.meta.env?.DEV,
      enableDebugUtilities = import.meta.env?.DEV,
      enableConsoleDebuggers = import.meta.env?.DEV
    } = options;

    log.debug('Utils', '🔧 [DevelopmentTools] Initializing development tools...');

    try {
      if (enablePhaseIntegrations) {
        await this.initializePhaseIntegrations();
      }

      if (enableDebugUtilities) {
        await this.setupDebugUtilities();
      }

      if (enableConsoleDebuggers) {
        this.setupConsoleDebuggers();
      }

      this.isInitialized = true;
      log.debug('Utils', '✅ [DevelopmentTools] Development tools initialized successfully');

    } catch (error) {
      log.error('Utils', '❌ [DevelopmentTools] Initialization failed:', error);
    }
  }

  private async initializePhaseIntegrations(): Promise<void> {
    log.debug('Utils', '🔧 [DevelopmentTools] Loading Phase integrations...');

    try {
      // Note: All phase files were cleaned up in Phase 1 refactoring
      // Removed phase3RenderOptimizer, phase3UXPatterns, phase3CacheStrategy, etc.
      // as they were development artifacts and redundant with current systems

      log.debug('Utils', '✅ [DevelopmentTools] Phase integrations cleaned up - using current systems');
    } catch (error) {
      log.warn('Utils', '⚠️ [DevelopmentTools] Phase integration cleanup failed:', error);
    }
  }

  private async setupDebugUtilities(): Promise<void> {
    log.debug('Utils', '🔧 [DevelopmentTools] Setting up debug utilities...');

    try {
      // Only load essential debug utilities
      await import('@/utils/developmentLogger');
      await import('@/utils/consoleCleanup');
      await import('@/utils/mobileDetection');
      await import('@/utils/globalErrorInterceptor');

      log.debug('Utils', '✅ [DevelopmentTools] Essential debug utilities loaded');
    } catch (error) {
      log.warn('Utils', '⚠️ [DevelopmentTools] Some debug utilities failed to load:', error);
    }
  }

  private setupConsoleDebuggers(): void {
    if (typeof window === 'undefined') return;

    log.debug('Utils', '🔧 [DevelopmentTools] Setting up console debuggers...');

    (window as any).debugPostsCache = () => {
      const postsCache = localStorage.getItem('posts_cache_235e68d1-89df-4d2d-8945-e7756d60de20');
      if (postsCache) {
        const parsed = JSON.parse(postsCache);
        log.debug('Utils', '📦 [Debug] Posts cache:', parsed);
        
        if (parsed.data && Array.isArray(parsed.data)) {
          const postsWithMedia = parsed.data.filter((post: any) => post.media_urls && post.media_urls.length > 0);
          log.debug('Utils', '📦 [Debug] Posts with media:', postsWithMedia.length);
          postsWithMedia.forEach((post: any) => {
            log.debug('Utils', `📦 [Debug] Post "${post.title}" media:`, post.media_urls);
          });
        }
      } else {
        log.debug('Utils', '📦 [Debug] No posts cache found');
      }
    };

    log.debug('Utils', '✅ [DevelopmentTools] Console debuggers available:', [
      'debugPostsCache()'
    ]);
  }

  cleanup(): void {
    log.debug('Utils', '🧹 [DevelopmentTools] Cleaning up...');
    
    if (typeof window !== 'undefined') {
      delete (window as any).debugPostsCache;
    }
  }

  isToolsInitialized(): boolean {
    return this.isInitialized;
  }
}

export const developmentTools = DevelopmentTools.getInstance();

if (import.meta.env?.DEV) {
  developmentTools.initialize().catch(error => {
    log.warn('Utils', '⚠️ [DevelopmentTools] Auto-initialization failed:', error);
  });
} 