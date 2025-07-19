import { log } from '@/utils/logger';
/**
 * Preloads an array of image URLs
 * Improves perceived performance by loading images before they're needed
 * 
 * @param imageUrls Array of image URLs to preload
 * @returns Promise that resolves when all images are loaded or failed
 */
export function preloadImages(imageUrls: (string | null | undefined)[]): Promise<void[]> {
  const validUrls = imageUrls.filter(Boolean) as string[];
  
  const preloadPromises = validUrls.map(url => {
    return new Promise<void>((resolve) => {
      const img = new Image();
      
      img.onload = () => {
        log.debug('Utils', `[Asset Preloader] Successfully loaded: ${url}`);
        resolve();
      };
      
      img.onerror = () => {
        log.warn('Utils', `[Asset Preloader] Failed to load: ${url}`);
        resolve(); // Resolve even on error to not block other images
      };
      
      img.src = url;
    });
  });
  
  return Promise.all(preloadPromises);
}

// Define a minimal interface for the space object for preloading assets
interface SpaceAssetData {
  cover_image?: string | null;
  icon_image?: string | null;
  // Add other potential image fields if they might be preloaded, e.g.:
  // banner_image?: string | null;
}

/**
 * Preloads space assets (cover image, icon, etc.)
 * 
 * @param space Space data object containing image URLs
 */
export function preloadSpaceAssets(space: SpaceAssetData | null | undefined): void {
  if (!space) return;
  
  const imagesToPreload = [
    space.cover_image,
    space.icon_image,
    // Add other important images here
  ].filter(Boolean);
  
  if (imagesToPreload.length > 0) {
    log.debug('Utils', `[Asset Preloader] Preloading ${imagesToPreload.length} space assets`);
    preloadImages(imagesToPreload).catch(err => {
      log.warn('Utils', '[Asset Preloader] Error during preload:', err);
    });
  }
} 