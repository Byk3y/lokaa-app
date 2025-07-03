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
      console.warn('🔧 [DevelopmentTools] Already initialized');
      return;
    }

    const {
      enablePhaseIntegrations = import.meta.env?.DEV,
      enableDebugUtilities = import.meta.env?.DEV,
      enableConsoleDebuggers = import.meta.env?.DEV
    } = options;

    console.log('🔧 [DevelopmentTools] Initializing development tools...');

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
      console.log('✅ [DevelopmentTools] Development tools initialized successfully');

    } catch (error) {
      console.error('❌ [DevelopmentTools] Initialization failed:', error);
    }
  }

  private async initializePhaseIntegrations(): Promise<void> {
    console.log('🔧 [DevelopmentTools] Loading Phase integrations...');

    try {
      // Only load essential Phase integrations that provide production value
      await import('@/utils/phase3RenderOptimizer');
      await import('@/utils/phase3UXPatterns');
      
      // Note: Removed phase3CacheStrategy and phase3TestingFramework 
      // as they are redundant with V2 system and experimental utilities

      console.log('✅ [DevelopmentTools] Essential Phase integrations loaded');
    } catch (error) {
      console.warn('⚠️ [DevelopmentTools] Some Phase integrations failed to load:', error);
    }
  }

  private async setupDebugUtilities(): Promise<void> {
    console.log('🔧 [DevelopmentTools] Setting up debug utilities...');

    try {
      // Only load essential debug utilities
      await import('@/utils/developmentLogger');
      await import('@/utils/consoleCleanup');
      await import('@/utils/mobileDetection');
      await import('@/utils/globalErrorInterceptor');

      console.log('✅ [DevelopmentTools] Essential debug utilities loaded');
    } catch (error) {
      console.warn('⚠️ [DevelopmentTools] Some debug utilities failed to load:', error);
    }
  }

  private setupConsoleDebuggers(): void {
    if (typeof window === 'undefined') return;

    console.log('🔧 [DevelopmentTools] Setting up console debuggers...');

    (window as any).debugPostsCache = () => {
      const postsCache = localStorage.getItem('posts_cache_235e68d1-89df-4d2d-8945-e7756d60de20');
      if (postsCache) {
        const parsed = JSON.parse(postsCache);
        console.log('📦 [Debug] Posts cache:', parsed);
        
        if (parsed.data && Array.isArray(parsed.data)) {
          const postsWithMedia = parsed.data.filter((post: any) => post.media_urls && post.media_urls.length > 0);
          console.log('📦 [Debug] Posts with media:', postsWithMedia.length);
          postsWithMedia.forEach((post: any) => {
            console.log(`📦 [Debug] Post "${post.title}" media:`, post.media_urls);
          });
        }
      } else {
        console.log('📦 [Debug] No posts cache found');
      }
    };

    console.log('✅ [DevelopmentTools] Console debuggers available:', [
      'debugPostsCache()'
    ]);
  }

  cleanup(): void {
    console.log('🧹 [DevelopmentTools] Cleaning up...');
    
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
    console.warn('⚠️ [DevelopmentTools] Auto-initialization failed:', error);
  });
} 