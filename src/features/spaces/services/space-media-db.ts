/**
 * Space media database operations for Supabase
 * Handles CRUD operations for space_media table
 */

import { getSupabaseClient } from '@/integrations/supabase/client';
import type { MediaItem, AddMediaRequest } from '@/shared/types/media';
import { deleteFileFromStorage } from '@/shared/services/storage';

// Database row interface
interface SpaceMediaRow {
  id: string;
  type: 'image' | 'video';
  url: string;
  thumbnail: string | null;
  video_id: string | null;
  storage_path: string | null;
  space_id: string;
  order: number;
  created_by: string | null;
  created_at: string;
}

/**
 * Fetch all media items for a space from Supabase, ordered by `order`.
 */
export const fetchSpaceMediaFromSupabase = async (spaceId: string): Promise<MediaItem[]> => {
  const { data, error } = await getSupabaseClient()
    .from('space_media')
    .select('*')
    .eq('space_id', spaceId)
    .order('order', { ascending: true });
    
  if (error) {
    console.error('Error fetching space media from Supabase:', error);
    return [];
  }
  
  // Map DB rows to MediaItem interface
  return (data || []).map((item: SpaceMediaRow) => ({
    id: item.id,
    type: item.type,
    url: item.url,
    thumbnail: item.thumbnail || undefined,
    videoId: item.video_id || undefined,
    storagePath: item.storage_path || undefined,
  }));
};

/**
 * Add a new media item to Supabase for a space.
 * Returns the inserted MediaItem.
 */
export const addMediaToSupabase = async (
  spaceId: string,
  media: AddMediaRequest
): Promise<MediaItem | null> => {
  const { data, error } = await getSupabaseClient()
    .from('space_media')
    .insert([
      {
        space_id: spaceId,
        type: media.type,
        url: media.url,
        thumbnail: media.thumbnail || null,
        video_id: media.videoId || null,
        storage_path: media.storagePath || null,
        order: media.order,
        created_by: media.created_by || null,
      },
    ])
    .select()
    .single();
    
  if (error) {
    console.error('Error adding media to Supabase:', error);
    return null;
  }
  
  const row = data as SpaceMediaRow;
  return {
    id: row.id,
    type: row.type,
    url: row.url,
    thumbnail: row.thumbnail || undefined,
    videoId: row.video_id || undefined,
    storagePath: row.storage_path || undefined,
  };
};

/**
 * Update a media item in Supabase
 */
export const updateMediaInSupabase = async (
  mediaId: string,
  updates: Partial<MediaItem>
): Promise<MediaItem | null> => {
  const dbUpdates: any = {};
  
  if (updates.type !== undefined) dbUpdates.type = updates.type;
  if (updates.url !== undefined) dbUpdates.url = updates.url;
  if (updates.thumbnail !== undefined) dbUpdates.thumbnail = updates.thumbnail;
  if (updates.videoId !== undefined) dbUpdates.video_id = updates.videoId;
  if (updates.storagePath !== undefined) dbUpdates.storage_path = updates.storagePath;
  
  const { data, error } = await getSupabaseClient()
    .from('space_media')
    .update(dbUpdates)
    .eq('id', mediaId)
    .select()
    .single();
    
  if (error) {
    console.error('Error updating media in Supabase:', error);
    return null;
  }
  
  const row = data as SpaceMediaRow;
  return {
    id: row.id,
    type: row.type,
    url: row.url,
    thumbnail: row.thumbnail || undefined,
    videoId: row.video_id || undefined,
    storagePath: row.storage_path || undefined,
  };
};

/**
 * Reorder media items for a space in Supabase by updating their `order` field.
 * Accepts an array of media IDs in the new order.
 */
export const reorderSpaceMediaInSupabase = async (
  spaceId: string,
  orderedIds: string[]
): Promise<void> => {
  // Batch update: for each id, set its order
  const updates = orderedIds.map((id, idx) => ({ id, order: idx }));
  
  for (const update of updates) {
    const { error } = await getSupabaseClient()
      .from('space_media')
      .update({ order: update.order })
      .eq('id', update.id)
      .eq('space_id', spaceId);
      
    if (error) {
      console.error('Error reordering media in Supabase:', error);
    }
  }
};

/**
 * Delete a media item from Supabase (and from storage if image).
 */
export const deleteMediaFromSupabase = async (
  mediaId: string,
  storagePath?: string
): Promise<void> => {
  // Delete from storage if image
  if (storagePath) {
    await deleteFileFromStorage(storagePath);
  }
  
  // Delete from DB
  const { error } = await getSupabaseClient()
    .from('space_media')
    .delete()
    .eq('id', mediaId);
    
  if (error) {
    console.error('Error deleting media from Supabase:', error);
  }
};

/**
 * Get media count for a space
 */
export const getSpaceMediaCount = async (spaceId: string): Promise<number> => {
  const { count, error } = await getSupabaseClient()
    .from('space_media')
    .select('*', { count: 'exact', head: true })
    .eq('space_id', spaceId);
    
  if (error) {
    console.error('Error getting media count:', error);
    return 0;
  }
  
  return count || 0;
}; 