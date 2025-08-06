import { log } from '@/utils/logger';
import { shouldEnableMobileFeatures } from '@/utils/mobileDetection';

/**
 * Mobile-optimized component preloader to prevent module loading failures
 * during navigation transitions on mobile browsers
 */
export class MobileComponentPreloader {
  private static preloadedComponents = new Set<string>();
  private static preloadPromises = new Map<string, Promise<any>>();

  /**
   * Preload critical components for mobile users
   */
  static async preloadCriticalComponents(): Promise<void> {
    if (!shouldEnableMobileFeatures()) {
      return;
    }

    log.debug('Utils', '📱 [MobilePreloader] Starting critical component preload for mobile');

    const criticalComponents = [
      {
        name: 'Discover',
        loader: () => import('@/views/Discover')
      },
      {
        name: 'Dashboard', 
        loader: () => import('@/views/Dashboard')
      },
      {
        name: 'Profile',
        loader: () => import('@/views/Profile')
      }
    ];

    const preloadPromises = criticalComponents.map(async (component) => {
      if (this.preloadedComponents.has(component.name)) {
        return;
      }

      try {
        log.debug('Utils', `📱 [MobilePreloader] Preloading ${component.name}...`);
        
        const preloadPromise = component.loader();
        this.preloadPromises.set(component.name, preloadPromise);
        
        await preloadPromise;
        
        this.preloadedComponents.add(component.name);
        log.debug('Utils', `✅ [MobilePreloader] ${component.name} preloaded successfully`);
        
      } catch (error) {
        log.warn('Utils', `⚠️ [MobilePreloader] Failed to preload ${component.name}:`, error);
      }
    });

    await Promise.allSettled(preloadPromises);
    log.debug('Utils', '📱 [MobilePreloader] Critical component preload completed');
  }

  /**
   * Preload a specific component with retry logic
   */
  static async preloadComponent(name: string, loader: () => Promise<any>): Promise<boolean> {
    if (!shouldEnableMobileFeatures()) {
      return true;
    }

    if (this.preloadedComponents.has(name)) {
      return true;
    }

    // Return existing promise if already in progress
    if (this.preloadPromises.has(name)) {
      try {
        await this.preloadPromises.get(name);
        return true;
      } catch {
        return false;
      }
    }

    const maxRetries = 3;
    const retryDelays = [500, 1000, 2000];

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        log.debug('Utils', `📱 [MobilePreloader] Preloading ${name} (attempt ${attempt + 1})`);
        
        const preloadPromise = loader();
        this.preloadPromises.set(name, preloadPromise);
        
        await preloadPromise;
        
        this.preloadedComponents.add(name);
        this.preloadPromises.delete(name);
        
        log.debug('Utils', `✅ [MobilePreloader] ${name} preloaded successfully`);
        return true;
        
      } catch (error) {
        log.warn('Utils', `⚠️ [MobilePreloader] ${name} preload attempt ${attempt + 1} failed:`, error);
        
        if (attempt < maxRetries - 1) {
          await new Promise(resolve => setTimeout(resolve, retryDelays[attempt]));
        }
      }
    }

    this.preloadPromises.delete(name);
    log.error('Utils', `❌ [MobilePreloader] ${name} preload failed after ${maxRetries} attempts`);
    return false;
  }

  /**
   * Check if a component has been preloaded
   */
  static isPreloaded(name: string): boolean {
    return this.preloadedComponents.has(name);
  }

  /**
   * Initialize mobile preloading on app startup
   */
  static initialize(): void {
    if (!shouldEnableMobileFeatures()) {
      return;
    }

    log.debug('Utils', '📱 [MobilePreloader] Initializing mobile component preloader');

    // Start preloading critical components in background
    this.preloadCriticalComponents().catch(error => {
      log.warn('Utils', '⚠️ [MobilePreloader] Background preload failed:', error);
    });

    // Preload on network connection recovery
    window.addEventListener('online', () => {
      log.debug('Utils', '📱 [MobilePreloader] Network reconnected, restarting preload');
      this.preloadCriticalComponents().catch(error => {
        log.warn('Utils', '⚠️ [MobilePreloader] Reconnect preload failed:', error);
      });
    });
  }

  /**
   * Clear preload cache (useful for testing or memory management)
   */
  static clearCache(): void {
    this.preloadedComponents.clear();
    this.preloadPromises.clear();
    log.debug('Utils', '📱 [MobilePreloader] Cache cleared');
  }
}