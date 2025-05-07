/**
 * Preloads images to improve perceived performance
 * @param urls Array of image URLs to preload
 * @returns Promise that resolves when all images have loaded or failed
 */
export function preloadImages(urls: (string | null | undefined)[]): Promise<void[]> {
  // Filter out null/undefined values and create a unique list
  const validUrls = [...new Set(urls.filter(Boolean) as string[])];
  
  if (validUrls.length === 0) {
    return Promise.resolve([]);
  }
  
  console.log(`[preloadImages] Preloading ${validUrls.length} images`);
  
  // Create an array of promises for each image
  const preloadPromises = validUrls.map(url => {
    return new Promise<void>((resolve) => {
      const img = new Image();
      
      img.onload = () => {
        console.log(`[preloadImages] Successfully preloaded: ${url}`);
        resolve();
      };
      
      img.onerror = () => {
        console.warn(`[preloadImages] Failed to preload: ${url}`);
        resolve(); // Resolve anyway to not block other images
      };
      
      img.src = url;
    });
  });
  
  return Promise.all(preloadPromises);
}

/**
 * Resolves image URLs that might be stored in localStorage
 * @param imageUrl Image URL to resolve
 * @param fallbackUrl Fallback URL if image can't be resolved
 * @returns Resolved image URL
 */
export function resolveImageUrl(imageUrl: string | null | undefined, fallbackUrl: string = '/default-cover.jpg'): string {
  if (!imageUrl) return fallbackUrl;
  
  // If the URL starts with 'local:', retrieve from localStorage
  if (imageUrl.startsWith('local:')) {
    const storageKey = imageUrl.replace('local:', '');
    const storedImage = localStorage.getItem(storageKey);
    return storedImage || fallbackUrl;
  }
  
  // Otherwise, use the URL directly
  return imageUrl;
}

/**
 * Preloads critical space assets
 * @param space Space data object
 */
export function preloadSpaceAssets(space: any): void {
  if (!space) return;
  
  const assetsToPreload = [
    space.cover_image,
    space.icon_image,
    // Add any other critical assets here
  ];
  
  // Preload in background, don't await
  preloadImages(assetsToPreload)
    .then(() => console.log('[preloadSpaceAssets] All space assets preloaded'))
    .catch(err => console.warn('[preloadSpaceAssets] Error preloading assets:', err));
} 