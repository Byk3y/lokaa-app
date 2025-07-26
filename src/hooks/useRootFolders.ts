import { useEffect, useState } from 'react';
import { getSupabaseClient } from '@/integrations/supabase/client';
import { log } from '@/utils/logger';

export interface Folder {
  id: string;
  title: string;
  module_order: number;
  is_published: boolean;
  space_id: string;
  course_id: string | null;
  created_at: string;
}

export function useRootFolders(spaceId: string | undefined, courseId?: string) {
  const [folders, setFolders] = useState<Folder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchFolders() {
      if (!spaceId || !courseId) {
        setFolders([]);
        setLoading(false);
        return;
      }

      try {
        const supabase = getSupabaseClient();
        const { data, error: fetchError } = await supabase
          .from('course_modules')
          .select('*')
          .eq('space_id', spaceId)
          .eq('course_id', courseId)
          .eq('module_type', 'folder')
          .neq('title', 'Pages') // Exclude the Pages module
          .order('module_order', { ascending: true });

        if (fetchError) {
          throw new Error(`Failed to fetch folders: ${fetchError.message}`);
        }

        log.debug('Component', `Course folders fetched:`, data);
        setFolders(data || []);
        setError(null);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to fetch folders';
        log.error('Component', 'Error fetching folders:', err);
        setError(errorMessage);
        setFolders([]);
      } finally {
        setLoading(false);
      }
    }

    fetchFolders();
  }, [spaceId, courseId]);

  return { folders, loading, error };
} 