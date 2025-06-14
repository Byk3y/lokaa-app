import { useState, useEffect } from 'react';
import { getSupabaseClient } from '@/integrations/supabase/client';

export interface SpaceMedia {
  id: string;
  type: 'image' | 'video';
  url: string;
  thumbnail?: string;
  videoId?: string;
  position?: number;
}

export interface SpaceBenefit {
  icon: string;
  text: string;
}

export interface SpaceOwner {
  id: string;
  name: string;
  email?: string;
  avatar_url?: string;
}

export interface SpaceData {
  id: string;
  name: string;
  description: string | null;
  about_description?: string | null;
  cover_image: string | null;
  is_private: boolean;
  subdomain: string;
  member_count: number;
  online_count: number; 
  admin_count: number;
  pricing_type: 'free' | 'paid';
  price_per_month?: number | null;
  owner: SpaceOwner;
  media_items: SpaceMedia[];
  benefits: SpaceBenefit[];
}

// Define an interface for the raw data from the 'spaces' table
interface RawSpaceRow {
  id: string;
  name: string;
  description: string | null;
  about_description?: string | null;
  cover_image: string | null;
  is_private: boolean;
  subdomain: string;
  pricing_type?: 'free' | 'paid' | string; // Made optional to match potential DB state
  price_per_month?: number | null;
  owner_id: string;
  created_at?: string;
  updated_at?: string;
  // Add any other direct fields from the 'spaces' table from your Supabase schema
}

/**
 * FIXED: Converted to const export for React Fast Refresh compatibility
 */
export const useSpaceData = (spaceId: string | null) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [spaceData, setSpaceData] = useState<SpaceData | null>(null);
  
  useEffect(() => {
    async function fetchData() {
      if (!spaceId) {
        setLoading(false);
        return;
      }
      
      try {
        setLoading(true);
        setError(null);
        
        // Get space details
        const { data: spaceData, error: spaceError } = await getSupabaseClient()
          .from('spaces')
          .select('*')
          .eq('id', spaceId)
          .single();
          
        if (spaceError) throw spaceError;
        
        // Cast to the defined RawSpaceRow type
        const space = spaceData as RawSpaceRow;
        
        // Get media items from localStorage (temporarily until we migrate them to DB)
        let mediaItems: SpaceMedia[] = [];
        try {
          const savedMedia = localStorage.getItem(`space_media_${spaceId}`);
          if (savedMedia) {
            mediaItems = JSON.parse(savedMedia);
          }
        } catch (e) {
          console.error("Failed to parse saved media", e);
        }
        
        // Get member count
        const { count: memberCount } = await getSupabaseClient()
          .from('space_members')
          .select('*', { count: 'exact', head: true })
          .eq('space_id', spaceId)
          .eq('status', 'active');
          
        // Get admin count (default to 1 if query fails)
        let adminCount = 1;
        try {
          const { count } = await getSupabaseClient()
            .from('space_members')
            .select('*', { count: 'exact', head: true })
            .eq('space_id', spaceId)
            .eq('status', 'active')
            .eq('role', 'admin');
            
          if (count !== null) {
            adminCount = count;
          }
        } catch (e) {
          console.error("Error fetching admin count:", e);
        }
        
        // For online count, we'd ideally use a presence system
        // This is a simplified placeholder 
        const onlineCount = Math.floor(Math.random() * 20); // Random online users for demo
        
        // Default benefits if not stored elsewhere
        const defaultBenefits: SpaceBenefit[] = [
          { icon: '🌟', text: 'Supportive and motivated community' },
          { icon: '📚', text: 'Free resources and exclusive content' },
          { icon: '🎯', text: 'Live feedback sessions and discussions' },
          { icon: '🤝', text: 'Networking and collaboration opportunities' }
        ];
        
        // Create space data object
        const spaceDataObj: SpaceData = {
          id: space.id,
          name: space.name,
          description: space.description,
          about_description: space.about_description || null,
          cover_image: space.cover_image,
          is_private: space.is_private || false,
          subdomain: space.subdomain,
          member_count: memberCount || 1,
          admin_count: adminCount,
          online_count: onlineCount,
          pricing_type: (space.pricing_type === 'paid') ? 'paid' : 'free',
          price_per_month: space.price_per_month,
          owner: {
            id: space.owner_id,
            name: 'Space Owner', // Simplified for now
            email: null,
            avatar_url: null
          },
          media_items: mediaItems,
          benefits: defaultBenefits
        };
        
        setSpaceData(spaceDataObj);
        
      } catch (err: unknown) {
        console.error('Error fetching space data:', err);
        const message = err instanceof Error ? err.message : String(err);
        setError(message || 'Failed to load space data');
        setSpaceData(null);
      } finally {
        setLoading(false);
      }
    }
    
    fetchData();
  }, [spaceId]);
  
  const refreshData = () => {
    setLoading(true);
    // This will trigger the useEffect to run again
  };
  
  return { spaceData, loading, error, refreshData };
} 