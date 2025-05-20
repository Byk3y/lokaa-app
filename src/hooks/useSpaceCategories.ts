import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase'; // Assuming supabase client is exported from here
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

export function useSpaceCategories(spaceId: string | undefined): UseSpaceCategoriesReturn {
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
      const { data, error: fetchError } = await supabase
        .from('space_categories')
        .select('*')
        .eq('space_id', spaceId)
        .eq('is_archived', false)
        .order('name', { ascending: true });

      if (fetchError) {
        console.error('Error fetching space categories:', fetchError);
        setError(fetchError);
        setCategories([]);
      } else {
        // Filter out any invalid categories (like "Non-Member" or "Attempt")
        const filteredData = data ? data.filter(cat => 
          cat && cat.name && 
          !cat.name.includes("Non-Member") && 
          !cat.name.includes("Attempt")
        ) : [];
        
        console.log('Fetched categories for space:', spaceId, 'Original:', data, 'Filtered:', filteredData);
        
        // Ensure the fetched data conforms to SpaceCategory[] before setting state
        setCategories(filteredData as SpaceCategory[] || []);
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
      console.error('Unexpected error fetching space categories:', processedError.message);
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
