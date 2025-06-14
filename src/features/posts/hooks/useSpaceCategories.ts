import { useState, useEffect } from 'react';
import { getSupabaseClient } from '@/integrations/supabase/client';

export interface SpaceCategory {
  id: string;
  name: string;
  icon?: string;
}

/**
 * Custom hook to fetch categories for a space
 * FIXED: Converted to const export for React Fast Refresh compatibility
 */
export const useSpaceCategories = (spaceId: string) => {
  const [categories, setCategories] = useState<SpaceCategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<SpaceCategory | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  
  useEffect(() => {
    if (spaceId) {
      fetchCategories();
    }
  }, [spaceId]);
  
  const fetchCategories = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const { data, error } = await getSupabaseClient()
        .from('space_categories')
        .select('id, name, icon')
        .eq('space_id', spaceId)
        .eq('is_archived', false)
        .order('created_at');
      
      if (error) {
        throw error;
      }
      
      const formattedCategories = data.map(cat => ({
        id: cat.id,
        name: cat.name,
        icon: cat.icon || undefined
      }));
      
      // Sort categories with "General Discussion" first, then by creation order
      const sortedCategories = formattedCategories.sort((a, b) => {
        // Check if either category is "General Discussion"
        const aIsGeneral = a.name.toLowerCase() === 'general discussion';
        const bIsGeneral = b.name.toLowerCase() === 'general discussion';
        
        // If a is General Discussion and b is not, a comes first
        if (aIsGeneral && !bIsGeneral) return -1;
        // If b is General Discussion and a is not, b comes first
        if (bIsGeneral && !aIsGeneral) return 1;
        // If both or neither are General Discussion, maintain creation order (already sorted by created_at)
        return 0;
      });
      
      setCategories(sortedCategories);
    } catch (err) {
      console.error('Error fetching categories:', err);
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  };
  
  return {
    categories,
    selectedCategory,
    setSelectedCategory,
    isLoading,
    error
  };
} 