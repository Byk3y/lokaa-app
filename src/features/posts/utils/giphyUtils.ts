import { GiphyFetch } from '@giphy/js-fetch-api';

// Create a singleton instance of GiphyFetch
export const giphyFetch = new GiphyFetch('qxDEgnQgoVhD1Hj4sNOwwzJv4sZANK5v');

/**
 * Available GIF categories for quick access
 */
export const GIF_CATEGORIES = [
  'trending',
  'reactions',
  'memes',
  'agree',
  'celebrate',
  'laugh',
  'thank you',
  'love',
  'confused'
];

/**
 * Fetches trending GIFs or searches for GIFs based on a search term
 * 
 * @param searchTerm Search term for GIFs (optional - fetches trending if empty)
 * @param offset Pagination offset
 * @param limit Number of GIFs to fetch (default: 10)
 * @returns Promise resolving to Giphy API response
 */
export async function fetchGifs(searchTerm: string, offset: number = 0, limit: number = 10) {
  try {
    if (searchTerm) {
      return await giphyFetch.search(searchTerm, { offset, limit });
    } else {
      return await giphyFetch.trending({ offset, limit });
    }
  } catch (error) {
    console.error('Error fetching GIFs:', error);
    throw error;
  }
}

/**
 * Fetches GIFs by category
 * 
 * @param category Category to fetch GIFs for
 * @param offset Pagination offset
 * @param limit Number of GIFs to fetch (default: 10)
 * @returns Promise resolving to Giphy API response
 */
export async function fetchGifsByCategory(category: string, offset: number = 0, limit: number = 10) {
  try {
    // For "trending", use the trending endpoint instead of search
    if (category.toLowerCase() === 'trending') {
      return await giphyFetch.trending({ offset, limit });
    }
    
    // Otherwise, search by category
    return await giphyFetch.search(category, { offset, limit, type: 'gifs' });
  } catch (error) {
    console.error(`Error fetching GIFs for category ${category}:`, error);
    throw error;
  }
} 