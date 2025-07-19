import { log } from '@/utils/logger';
import { useState, useEffect, useCallback } from 'react';
import { getSupabaseClient } from '@/integrations/supabase/client';
import type { Space } from '@/types/space'; // Assuming you have a Space type

export interface SpaceAboutData extends Partial<Space> { // Allow partial for flexibility initially
  id: string;
  name?: string | null;
  spaceIconUrl?: string | null;      // from spaces.icon_image
  coverPhotoUrl?: string | null;     // from spaces.cover_image
  shortDescription?: string | null;  // from spaces.description
  aboutContent?: string | null;      // from spaces.about_description
  introMediaType?: 'image' | 'video' | 'none' | null;
  introMediaUrl?: string | null;
  introMediaThumbnailUrl?: string | null;
  primaryColor?: string | null;
  subdomain?: string | null; // Added subdomain to the interface
  member_count?: number | null;
  is_private?: boolean | null;
  pricing_type?: 'free' | 'paid' | null;
  price_per_month?: number | null;
  owner?: {  // Basic owner info, might need a separate fetch for more details if complex
    id: string;
    full_name: string;
    avatar_url?: string | null;
  } | null;
  // Add other fields as necessary, e.g., member_count if displayed consistently
}

interface UseSpaceAboutDataProps {
  spaceId?: string | null;
  subdomain?: string | null;
}

/**
 * FIXED: Converted to const export for React Fast Refresh compatibility
 */
export const useSpaceAboutData = ({
  spaceId,
  subdomain,
}: UseSpaceAboutDataProps): {
  spaceAboutData: SpaceAboutData | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
} => {
  const [spaceAboutData, setSpaceAboutData] = useState<SpaceAboutData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSpaceData = useCallback(async () => {
    if (!spaceId && !subdomain) {
      setError("Space ID or subdomain must be provided.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Note: For Supabase to correctly join and nest the owner's user data under an 'owner' alias,
      // the foreign key relationship must be correctly defined in your database schema.
      // The 'spaces' table should have an 'owner_id' column that references 'users(id)'.
      // The select query uses 'owner:owner_id(id, full_name, avatar_url)' which tells Supabase:
      // "For the column 'owner_id' in 'spaces', fetch the related 'users' record and alias it as 'owner' in the result."
      // If the related table is 'users' and the FK is 'owner_id', this syntax should work.
      // Alternatively, if you have a view or a differently named relationship, adjust accordingly.
      let query = getSupabaseClient().from('spaces').select(`
        id,
        name,
        description,
        about_description,
        icon_image,
        cover_image,
        intro_media_type,
        intro_media_url,
        intro_media_thumbnail_url,
        primary_color,
        subdomain,
        member_count,
        is_private,
        pricing_type,
        price_per_month,
        owner:users!owner_id ( id, full_name, avatar_url )
      `);

      if (spaceId) {
        query = query.eq('id', spaceId);
      } else if (subdomain) {
        query = query.eq('subdomain', subdomain);
      } else {
        setError("Query requires either spaceId or subdomain.");
        setLoading(false);
        setSpaceAboutData(null);
        return;
      }
      
      const { data, error: dbError } = await query.single();

      if (dbError) {
        if (dbError.code === 'PGRST116') { 
          setError('Space not found.');
          setSpaceAboutData(null);
        } else {
          throw dbError;
        }
      } else if (data) {
        setSpaceAboutData({
          id: data.id,
          name: data.name,
          shortDescription: data.description,
          aboutContent: data.about_description,
          spaceIconUrl: data.icon_image,
          coverPhotoUrl: data.cover_image,
          introMediaType: data.intro_media_type as SpaceAboutData['introMediaType'],
          introMediaUrl: data.intro_media_url,
          introMediaThumbnailUrl: data.intro_media_thumbnail_url,
          primaryColor: data.primary_color,
          subdomain: data.subdomain,
          member_count: data.member_count,
          is_private: data.is_private,
          pricing_type: data.pricing_type as SpaceAboutData['pricing_type'],
          price_per_month: data.price_per_month,
          owner: data.owner ? { // data.owner should now be the user object or null
            id: data.owner.id,
            full_name: data.owner.full_name, 
            avatar_url: data.owner.avatar_url
          } : null,
        });
      } else {
        setError('Space not found.'); 
        setSpaceAboutData(null);
      }
    } catch (e: any) {
      log.error('Hook', "Error fetching space about data:", e);
      setError(e.message || 'Failed to fetch space data.');
      setSpaceAboutData(null);
    } finally {
      setLoading(false);
    }
  }, [spaceId, subdomain]);

  useEffect(() => {
    fetchSpaceData();
  }, [fetchSpaceData]);

  return { spaceAboutData, loading, error, refetch: fetchSpaceData };
} 