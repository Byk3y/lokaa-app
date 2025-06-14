import { useState, useEffect } from 'react';
import { getSupabaseClient } from '@/integrations/supabase/client';

/**
 * Custom hook to check if a space has any posts
 * @param spaceId - The ID of the space to check
 * @returns An object with isEmptySpace and loading flags
 */
export const useSpaceHasPosts = (spaceId: string) => {
  const [isEmptySpace, setIsEmptySpace] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkSpaceHasPosts = async () => {
      try {
        setLoading(true);
        
        // Check if there are any posts in this space
        const { count, error } = await getSupabaseClient()
          .from('posts')
          .select('id', { count: 'exact', head: true })
          .eq('space_id', spaceId);
        
        if (error) {
          console.error('Error checking space posts:', error);
          return;
        }
        
        // If count is 0, the space is empty
        setIsEmptySpace(count === 0);
      } catch (error) {
        console.error('Error in useSpaceHasPosts:', error);
      } finally {
        setLoading(false);
      }
    };

    if (spaceId) {
      checkSpaceHasPosts();
    }
  }, [spaceId]);

  return { isEmptySpace, loading };
} 