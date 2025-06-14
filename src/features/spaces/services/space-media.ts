/**
 * Space-specific media operations
 * Handles localStorage operations for space media
 */

import type { MediaItem } from '@/shared/types/media';

/**
 * Get all media items for a space from localStorage
 */
export const getSpaceMediaItems = (spaceId: string): MediaItem[] => {
  try {
    const savedMedia = localStorage.getItem(`space_media_${spaceId}`);
    if (!savedMedia) return [];
    
    const mediaItems = JSON.parse(savedMedia);
    if (!Array.isArray(mediaItems)) return [];
    
    return mediaItems;
  } catch (error) {
    console.error('Error getting media items:', error);
    return [];
  }
};

/**
 * Save media items to localStorage
 */
export const saveSpaceMediaItems = (spaceId: string, mediaItems: MediaItem[]): boolean => {
  try {
    if (mediaItems.length > 0) {
      localStorage.setItem(`space_media_${spaceId}`, JSON.stringify(mediaItems));
    } else {
      localStorage.removeItem(`space_media_${spaceId}`);
    }
    return true;
  } catch (error) {
    console.error('Error saving media items:', error);
    return false;
  }
};

/**
 * Add a media item to localStorage for a space
 */
export const addSpaceMediaItem = (spaceId: string, mediaItem: MediaItem): boolean => {
  try {
    const currentItems = getSpaceMediaItems(spaceId);
    const updatedItems = [...currentItems, mediaItem];
    return saveSpaceMediaItems(spaceId, updatedItems);
  } catch (error) {
    console.error('Error adding media item:', error);
    return false;
  }
};

/**
 * Remove a media item from localStorage for a space
 */
export const removeSpaceMediaItem = (spaceId: string, mediaId: string): boolean => {
  try {
    const currentItems = getSpaceMediaItems(spaceId);
    const updatedItems = currentItems.filter(item => item.id !== mediaId);
    return saveSpaceMediaItems(spaceId, updatedItems);
  } catch (error) {
    console.error('Error removing media item:', error);
    return false;
  }
};

/**
 * Update a media item in localStorage for a space
 */
export const updateSpaceMediaItem = (spaceId: string, updatedItem: MediaItem): boolean => {
  try {
    const currentItems = getSpaceMediaItems(spaceId);
    const updatedItems = currentItems.map(item => 
      item.id === updatedItem.id ? updatedItem : item
    );
    return saveSpaceMediaItems(spaceId, updatedItems);
  } catch (error) {
    console.error('Error updating media item:', error);
    return false;
  }
}; 