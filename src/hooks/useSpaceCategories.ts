import { log } from '@/utils/logger';
import { useState, useEffect, useCallback } from 'react';
import { getSupabaseClient } from '@/integrations/supabase/client'; // Assuming supabase client is exported from here
import { PostgrestError } from '@supabase/supabase-js';

export interface SpaceCategory {
  id: string;
  space_id: string;
  name: string;
  created_by: string;
  is_archived: boolean;
  created_at?: string;
  updated_at?: string;
  icon?: string; // Optional icon for the category
}

interface UseSpaceCategoriesReturn {
  categories: SpaceCategory[];
  isLoading: boolean;
  error: PostgrestError | null;
  refreshCategories: () => Promise<void>;
}

/**
 * FIXED: Converted to const export for React Fast Refresh compatibility
 */
export const useSpaceCategories = (spaceId: string | undefined): UseSpaceCategoriesReturn => {
  const [categories, setCategories] = useState<SpaceCategory[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<PostgrestError | null>(null);

  const fetchCategories = useCallback(async () => {
    if (!spaceId) {
      setCategories([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Explicitly type `data` as `SpaceCategory[] | null`
      const { data, error: fetchError } = await getSupabaseClient()
        .from('space_categories')
        .select('*')
        .eq('space_id', spaceId)
        .eq('is_archived', false)
        .order('created_at', { ascending: true });

      if (fetchError) {
        log.error('Hook', 'Error fetching space categories:', fetchError);
        setError(fetchError);
        setCategories([]);
      } else {
        // Filter out any invalid categories (like "Non-Member" or "Attempt")
        const filteredData = data ? data.filter(cat => 
          cat && cat.name && 
          !cat.name.includes("Non-Member") && 
          !cat.name.includes("Attempt")
        ) : [];
        
        // Sort categories with "General Discussion" first, then by creation order
        const sortedData = filteredData.sort((a, b) => {
          // Check if either category is "General Discussion"
          const aIsGeneral = a.name.toLowerCase() === 'general discussion';
          const bIsGeneral = b.name.toLowerCase() === 'general discussion';
          
          // If a is General Discussion and b is not, a comes first
          if (aIsGeneral && !bIsGeneral) return -1;
          // If b is General Discussion and a is not, b comes first
          if (bIsGeneral && !aIsGeneral) return 1;
          // If both or neither are General Discussion, maintain creation order
          return new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime();
        });
        
        log.debug('Hook', '📋 Categories ordered for space:', spaceId, 'Sorted:', sortedData.map(c => c.name));
        
        // Ensure the fetched data conforms to SpaceCategory[] before setting state
        setCategories(sortedData as SpaceCategory[] || []);
      }
    } catch (e: unknown) {
      // Safely handle the error, ensuring it's an instance of Error or PostgrestError before accessing specific properties
      let processedError: PostgrestError | Error;
      if (e instanceof Error) {
        processedError = e;
      } else if (typeof e === 'object' && e !== null && 'message' in e) {
        // Attempt to cast to PostgrestError if it has common PostgrestError properties
        // This is a simplified check; a more robust check might involve more properties
        processedError = e as PostgrestError;
      } else {
        processedError = new Error('An unknown error occurred');
      }
      log.error('Hook', 'Unexpected error fetching space categories:', processedError.message);
      setError(processedError as PostgrestError); // Still need to cast for setError type if it's specific
      setCategories([]);
    } finally {
      setIsLoading(false);
    }
  }, [spaceId]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  return { categories, isLoading, error, refreshCategories: fetchCategories };
}
