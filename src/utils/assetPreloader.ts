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
        console.log(`[Asset Preloader] Successfully loaded: ${url}`);
        resolve();
      };
      
      img.onerror = () => {
        console.warn(`[Asset Preloader] Failed to load: ${url}`);
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
    console.log(`[Asset Preloader] Preloading ${imagesToPreload.length} space assets`);
    preloadImages(imagesToPreload).catch(err => {
      console.warn('[Asset Preloader] Error during preload:', err);
    });
  }
} 