import { log } from '@/utils/logger';
import { useState, useEffect, useCallback, useRef } from 'react';
import { getSupabaseClient } from '@/integrations/supabase/client';
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';
import { toast } from '@/hooks/use-toast';
import EmergencyDatabaseRecovery from '@/utils/emergencyDatabaseRecovery';
import { AuthRecovery } from '@/utils/authRecovery';

// Interface for database space objects
export interface DatabaseSpace {
  id: string;
  name: string;
  description: string | null;
  subdomain: string;
  cover_image: string | null;
  icon_image: string | null;
  owner_id: string;
  primary_color: string | null;
  member_count: number | null;
  pricing_type: 'free' | 'paid' | string;
  price_per_month: number | null;
  created_at: string;
  updated_at: string;
  about_description: string | null;
  is_private: boolean;
  tags?: string[];
  post_count?: number;
}

// Processed space type after mapping
export interface Space {
  id: string;
  name: string;
  description: string;
  cover_image: string;
  icon_image?: string | null;
  owner_id: string;
  primary_color: string;
  subdomain: string;
  member_count: number;
  pricing_type: 'free' | 'paid';
  price_per_month: number | null;
  created_at: string;
  updated_at: string;
  members: number;
  posts: number;
  createdAt: string;
  updatedAt: string;
  tags?: string[];
  about_description?: string | null;
  is_private: boolean;
  ranking?: number;
  owner?: {
    name: string;
    avatar_url?: string | null;
  };
}

function generateTags(space: DatabaseSpace): string[] {
  const tags: string[] = [];
  
  if (space.name) {
    const name = space.name.toLowerCase();
    if (name.includes('tech') || name.includes('dev') || name.includes('code')) tags.push('tech');
    if (name.includes('music')) tags.push('music');
    if (name.includes('art') || name.includes('design')) tags.push('hobbies');
    if (name.includes('fitness') || name.includes('health')) tags.push('health');
    if (name.includes('money') || name.includes('finance') || name.includes('business')) tags.push('money');
    if (name.includes('sport')) tags.push('sports');
  }
  
  return tags.length > 0 ? tags : ['general'];
}

export default function useSpacesData(initialCategory = 'all') {
  const { user } = useOptimizedAuth();
  
  // FIXED: Simplified state management without complex optimization layers
  const [joinedSpaces, setJoinedSpaces] = useState<Space[]>([]);
  const [joinedSpacesLoading, setJoinedSpacesLoading] = useState(false);
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [filteredSpaces, setFilteredSpaces] = useState<Space[]>([]);
  const [trendingSpaces, setTrendingSpaces] = useState<Space[]>([]);
  const [featuredSpaces, setFeaturedSpaces] = useState<Space[]>([]);
  const [categorySpaces, setCategorySpaces] = useState<{ [key: string]: Space[] }>({});
  const [loading, setLoading] = useState(false);
  const [activeCategory, setActiveCategory] = useState(initialCategory);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState<string | null>(null);

  // FIXED: Simple direct database fetch with emergency recovery ONLY for 406 errors
  const fetchSpaces = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      log.debug('Hook', '[useSpacesData] Fetching spaces with direct query');
      
      // RECOVERY FIX: Try direct table query first (more reliable after outages)
      const { data: directData, error: directError } = await getSupabaseClient()
        .from('spaces')
        .select('*')
        .or('is_private.is.false,is_private.is.null')
        .order('created_at', { ascending: false });
      
      if (!directError && directData && Array.isArray(directData) && directData.length > 0) {
        log.debug('Hook', `✅ [useSpacesData] Direct table query successful: ${directData.length} spaces`);
        
        const processedSpaces = directData.map((space: any, index: number): Space => ({
          id: space.id,
          name: space.name,
          description: space.description || '',
          subdomain: space.subdomain,
          icon_image: space.icon_image,
          cover_image: space.cover_image || '',
          owner_id: space.owner_id,
          member_count: space.member_count || 0,
          is_private: space.is_private,
          created_at: space.created_at,
          primary_color: space.primary_color || '#1A8A7E',
          pricing_type: (space.pricing_type as 'free' | 'paid') || 'free',
          price_per_month: space.price_per_month,
          updated_at: space.updated_at || space.created_at,
          ranking: index + 1,
          members: space.member_count || 0,
          posts: 0,
          createdAt: space.created_at,
          updatedAt: space.updated_at || space.created_at,
          tags: generateTags(space),
          about_description: space.about_description,
        }));
        
        setSpaces(processedSpaces);
        return;
      }

      // FALLBACK: Try RPC call if direct query fails
      log.debug('Hook', '⚠️ [useSpacesData] Direct query failed, trying RPC fallback');
      const { data: rpcData, error: rpcError } = await getSupabaseClient().rpc('get_public_spaces');
      
      if (!rpcError && rpcData && Array.isArray(rpcData) && rpcData.length > 0) {
        log.debug('Hook', `✅ [useSpacesData] RPC fallback successful: ${rpcData.length} spaces`);
        
        const processedSpaces = rpcData.map((space: any, index: number): Space => ({
          id: space.id,
          name: space.name,
          description: space.description || '',
          subdomain: space.subdomain,
          icon_image: space.icon_image,
          cover_image: space.cover_image || '',
          owner_id: space.owner_id,
          member_count: space.member_count || 0,
          is_private: space.is_private,
          created_at: space.created_at,
          primary_color: '#1A8A7E',
          pricing_type: 'free' as const,
          price_per_month: null,
          updated_at: space.created_at,
          ranking: index + 1,
          members: space.member_count || 0,
          posts: 0,
          createdAt: space.created_at,
          updatedAt: space.created_at,
          tags: generateTags(space),
        }));
        
        setSpaces(processedSpaces);
        return;
      }

      // FIXED: Only use emergency recovery if we get actual 406/policy errors
      if (EmergencyDatabaseRecovery.isPolicyError(directError) || EmergencyDatabaseRecovery.isPolicyError(rpcError)) {
        log.debug('Hook', '🚨 [useSpacesData] Policy error detected, using emergency recovery');
        
        const recoveryResult = await EmergencyDatabaseRecovery.safeSpaceQuery(
          user?.id || 'anonymous',
          {
            retryAttempts: 2,
            fallbackToPublic: true,
            useCache: true
          }
        );

        if (recoveryResult.success && recoveryResult.data) {
          const processedSpaces = recoveryResult.data.map((space: any, index: number): Space => ({
            id: space.id,
            name: space.name,
            description: space.description || '',
            subdomain: space.subdomain,
            icon_image: space.icon_image,
            cover_image: space.cover_image || '',
            owner_id: space.owner_id,
            member_count: space.member_count || 0,
            is_private: space.is_private,
            created_at: space.created_at,
            primary_color: '#1A8A7E',
            pricing_type: 'free' as const,
            price_per_month: null,
            updated_at: space.created_at,
            ranking: index + 1,
            members: space.member_count || 0,
            posts: 0,
            createdAt: space.created_at,
            updatedAt: space.created_at,
            tags: generateTags(space),
          }));
          
          setSpaces(processedSpaces);
          return;
        }
      }

      // If we get here, it's a real error
      throw directError || rpcError || new Error('Failed to fetch spaces');

    } catch (err) {
      log.error('Hook', '[useSpacesData] Error fetching spaces:', err);
      
      // Check if this is an authentication error that might need recovery
      if (AuthRecovery.isAuthError(err)) {
        log.debug('Hook', '🔄 [useSpacesData] Detected auth error, attempting recovery...');
        
        try {
          const recovered = await AuthRecovery.recoverAuth({
            clearCache: true,
            forceRefresh: true,
            resetSession: false
          });
          
          if (recovered) {
            log.debug('Hook', '✅ [useSpacesData] Auth recovery successful, retrying fetch...');
            // Don't retry immediately to avoid infinite loops
            setTimeout(() => {
              fetchSpaces();
            }, 1000);
            return;
          }
        } catch (recoveryError) {
          log.error('Hook', '❌ [useSpacesData] Auth recovery failed:', recoveryError);
        }
      }
      
      setError(err instanceof Error ? err.message : 'Failed to fetch spaces');
      setSpaces([]);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  // FIXED: Simple fetch on mount
  useEffect(() => {
    fetchSpaces();
  }, [fetchSpaces]);

  // FIXED: Simple joined spaces fetch
  useEffect(() => {
    const fetchJoinedSpaces = async () => {
      if (!user) {
        setJoinedSpaces([]);
        return;
      }
      
      setJoinedSpacesLoading(true);
      
      try {
        // Simple direct query first
        const { data: memberData, error: memberError } = await getSupabaseClient()
          .from('space_members')
          .select(`
            space_id,
            spaces:space_id(*)
          `)
          .eq('user_id', user.id)
          .eq('status', 'active');

        if (!memberError && memberData) {
          const userSpaces = memberData
            .filter(record => record.spaces)
            .map(record => mapDatabaseSpaceToSpace(record.spaces as DatabaseSpace));
          
          setJoinedSpaces(userSpaces);
        } else if (EmergencyDatabaseRecovery.isPolicyError(memberError)) {
          // Only use recovery for policy errors
          log.debug('Hook', '🚨 [useSpacesData] Using emergency recovery for joined spaces');
          const recoveryResult = await EmergencyDatabaseRecovery.safeSpaceQuery(
            user.id,
            { retryAttempts: 2, fallbackToPublic: false, useCache: true }
          );
          
          if (recoveryResult.success && recoveryResult.data) {
            const userSpaces = [];
            for (const space of recoveryResult.data) {
              const membershipCheck = await EmergencyDatabaseRecovery.safeMembershipCheck(space.id, user.id);
              if (membershipCheck.isMember || membershipCheck.isOwner) {
                userSpaces.push(mapDatabaseSpaceToSpace(space));
              }
            }
            setJoinedSpaces(userSpaces);
          } else {
            setJoinedSpaces([]);
          }
        } else {
          throw memberError || new Error('Failed to fetch joined spaces');
        }
        
      } catch (error) {
        log.error('Hook', '[useSpacesData] Error fetching joined spaces:', error);
        setJoinedSpaces([]);
      } finally {
        setJoinedSpacesLoading(false);
      }
    };

    fetchJoinedSpaces();
  }, [user]);

  // Helper function to map database space to interface
  function mapDatabaseSpaceToSpace(dbSpace: DatabaseSpace): Space {
    return {
      id: dbSpace.id,
      name: dbSpace.name,
      description: dbSpace.description || "",
      cover_image: dbSpace.cover_image || "",
      icon_image: dbSpace.icon_image || null,
      owner_id: dbSpace.owner_id || "",
      primary_color: dbSpace.primary_color || "",
      subdomain: dbSpace.subdomain,
      member_count: dbSpace.member_count || 1,
      pricing_type: dbSpace.pricing_type as 'free' | 'paid' || 'free',
      price_per_month: dbSpace.price_per_month || null,
      created_at: dbSpace.created_at || new Date().toISOString(),
      updated_at: dbSpace.updated_at || new Date().toISOString(),
      members: dbSpace.member_count || 1,
      posts: dbSpace.post_count || 0,
      createdAt: dbSpace.created_at || new Date().toISOString(),
      updatedAt: dbSpace.updated_at || new Date().toISOString(),
      tags: dbSpace.tags || generateTags(dbSpace),
      about_description: dbSpace.about_description || null,
      is_private: dbSpace.is_private || false,
      owner: {
        name: "Space Owner",
        avatar_url: null
      }
    };
  }

  // Set trending, featured and category spaces
  useEffect(() => {
    if (spaces.length > 0) {
      // Sort spaces by member count for trending
      const trending = [...spaces].sort((a, b) => 
        (b.member_count || 0) - (a.member_count || 0)
      ).slice(0, 5);
      
      setTrendingSpaces(trending);
      
      // Set featured spaces to those with special tags or characteristics
      const featured = spaces.filter(space => 
        (space.tags && space.tags.includes('featured'))
      );
      
      setFeaturedSpaces(featured.length ? featured : spaces.slice(0, 1));
      
      // Organize spaces by category
      const byCategory: { [key: string]: Space[] } = {};
      
      spaces.forEach(space => {
        if (space.tags) {
          space.tags.forEach(tag => {
            if (!byCategory[tag]) {
              byCategory[tag] = [];
            }
            byCategory[tag].push(space);
          });
        }
      });
      
      setCategorySpaces(byCategory);
    } else {
      // Reset all when no spaces are available
      setTrendingSpaces([]);
      setFeaturedSpaces([]);
      setCategorySpaces({});
    }
  }, [spaces]);

  // Filter spaces when category or search query changes
  useEffect(() => {
    let filtered = [...spaces];
    
    // Filter by category if not 'all'
    if (activeCategory !== 'all') {
      filtered = filtered.filter(space => 
        space.tags?.some(tag => tag.toLowerCase() === activeCategory.toLowerCase())
      );
    }
    
    // Apply search filter if there's a query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(space => 
        space.name.toLowerCase().includes(query) || 
        space.description.toLowerCase().includes(query)
      );
    }
    
    setFilteredSpaces(filtered);
  }, [activeCategory, searchQuery, spaces]);

  return {
    joinedSpaces,
    setJoinedSpaces,
    trendingSpaces,
    featuredSpaces,
    categorySpaces,
    loading: joinedSpacesLoading || loading,
    joinedSpacesLoading,
    spaces,
    filteredSpaces,
    isLoading: loading,
    activeCategory,
    setActiveCategory,
    searchQuery,
    setSearchQuery,
    error
  };
}
