import { getSupabaseClient } from '@/integrations/supabase/client';

/**
 * Pin a post with the specified category
 * @param postId The ID of the post to pin
 * @param categoryName The category name to pin the post in
 * @returns A promise that resolves when the operation completes
 */
export async function pinPost(postId: string, categoryName: string) {
  // Update the post directly in the database
  const { data, error } = await getSupabaseClient()
    .from('posts')
    .update({
      is_pinned: true,
      pinned_at: new Date().toISOString(),
      pin_category: categoryName,
      pin_position: 0 // Will be updated by trigger
    })
    .eq('id', postId);

  if (error) throw error;
  return data;
}

/**
 * Unpin a post
 * @param postId The ID of the post to unpin
 * @returns A promise that resolves when the operation completes
 */
export async function unpinPost(postId: string) {
  // Update the post directly in the database
  const { data, error } = await getSupabaseClient()
    .from('posts')
    .update({
      is_pinned: false,
      pinned_at: null,
      pin_category: null,
      pin_position: null
    })
    .eq('id', postId);

  if (error) throw error;
  return data;
} 