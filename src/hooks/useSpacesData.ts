import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

// Interface for database space objects
export interface DatabaseSpace {
  id: string;
  name: string;
  description: string;
  owner_id: string;
  subdomain: string;
  cover_image: string;
  primary_color: string;
  created_at: string;
  updated_at: string;
  pricing_type: 'free' | 'paid';
  price_per_month: number | null;
  member_count?: number;
  post_count?: number;
  instructor?: string;
  // Additional fields for our frontend
  ranking?: number;
  tags?: string[];
  // Fields from the join
  profiles?: {
    name?: string;
    avatar_url?: string;
  };
  // Added fields
  about_description?: string | null;
  is_private: boolean;
}

// Processed space type after mapping
export interface Space {
  id: string;
  name: string;
  description: string;
  cover_image: string;
  owner_id: string;
  primary_color: string;
  subdomain: string;
  member_count: number;
  pricing_type: 'free' | 'paid';
  price_per_month: number | null;
  created_at: string;
  updated_at: string;
  tags?: string[];
  ranking?: number;
  instructor?: string;
  post_count?: number;
  // These legacy fields are for compatibility
  members?: number;
  posts?: number;
  createdAt?: string;
  updatedAt?: string;
  // Add missing fields that are used in SpaceCard
  about_description?: string | null;
  is_private: boolean;
  owner?: {
    name?: string;
    avatar_url?: string;
  };
}

export default function useSpacesData(initialCategory = 'all') {
  const { user } = useAuth();
  const [joinedSpaces, setJoinedSpaces] = useState<Space[]>([]);
  const [joinedSpacesLoading, setJoinedSpacesLoading] = useState(false);
  const [trendingSpaces, setTrendingSpaces] = useState<Space[]>([]);
  const [featuredSpaces, setFeaturedSpaces] = useState<Space[]>([]);
  const [categorySpaces, setCategorySpaces] = useState<{ [key: string]: Space[] }>({});
  const [loading, setLoading] = useState(true);
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [filteredSpaces, setFilteredSpaces] = useState<Space[]>([]);
  const [activeCategory, setActiveCategory] = useState(initialCategory);
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch joined spaces
  useEffect(() => {
    const fetchJoinedSpaces = async () => {
      if (!user) {
        setJoinedSpaces([]);
        return;
      }
      
      try {
      setJoinedSpacesLoading(true);
        console.log("Fetching joined spaces for user:", user.id);
        
        // First try to fetch directly from spaces table based on ownership
        const { data: ownedSpaces, error: ownedError } = await supabase
          .from('spaces')
          .select('*')
          .eq('owner_id', user.id);
          
        if (ownedError) {
          console.error("Error fetching owned spaces:", ownedError);
        } else {
          console.log("Found owned spaces:", ownedSpaces?.length || 0);
        }
        
        // Also fetch joined spaces from space_access table
        const { data: accessData, error: accessError } = await supabase
          .from('space_access')
          .select(`
            spaces:space_id(*)
          `)
          .eq('user_id', user.id)
          .eq('is_active', true);
        
        if (accessError) {
          console.error("Error fetching space access:", accessError);
        } else {
          console.log("Found space access records:", accessData?.length || 0);
        }

        // Combine both owned and accessed spaces
        const ownedSpacesArray = ownedSpaces || [];
        const accessedSpaces = accessData
          ?.filter(item => item.spaces) // Filter out any null values
          .map(item => item.spaces as DatabaseSpace) || [];
          
        // Merge and deduplicate by space ID
        const spaceMap = new Map();
        
        // Add owned spaces first
        ownedSpacesArray.forEach(space => {
          spaceMap.set(space.id, mapDatabaseSpaceToSpace(space));
        });
        
        // Add accessed spaces if not already included
        accessedSpaces.forEach(space => {
          if (!spaceMap.has(space.id)) {
            spaceMap.set(space.id, mapDatabaseSpaceToSpace(space));
          }
        });
        
        // Convert map to array
        const joinedSpacesArray = Array.from(spaceMap.values());
        console.log("Combined spaces found:", joinedSpacesArray.length);
        
        setJoinedSpaces(joinedSpacesArray);
      } catch (error) {
        console.error('Error fetching joined spaces:', error);
        setJoinedSpaces([]);
      } finally {
        setJoinedSpacesLoading(false);
      }
    };

    // Clear joined spaces when user logs out
    if (!user) {
      setJoinedSpaces([]);
      setJoinedSpacesLoading(false);
    } else {
    fetchJoinedSpaces();
    }
  }, [user]); // Only depend on user to prevent unnecessary refetches

  // Helper function to map database space to interface
  function mapDatabaseSpaceToSpace(dbSpace: DatabaseSpace): Space {
    return {
      id: dbSpace.id,
      name: dbSpace.name,
      description: dbSpace.description || "",
      cover_image: dbSpace.cover_image || "",
      owner_id: dbSpace.owner_id || "",
      primary_color: dbSpace.primary_color || "",
      subdomain: dbSpace.subdomain,
      member_count: dbSpace.member_count || 1,
      pricing_type: dbSpace.pricing_type || 'free',
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
        name: "Space Owner", // Default value
        avatar_url: null
      }
    };
  }

  // Fetch spaces from Supabase
  useEffect(() => {
    async function fetchSpaces() {
      console.log("Fetching all spaces");
        setLoading(true);
        
      try {
        // Attempt to fetch spaces from database
        const { data: spacesData, error: spacesError } = await supabase
          .from('spaces')
          .select('*');
        
        if (spacesError) {
          console.error('Error fetching spaces:', spacesError);
          throw spacesError;
        }
        
        if (!spacesData || spacesData.length === 0) {
          console.log('No spaces found in database');
          
          // Set empty arrays when no spaces found
          setSpaces([]);
          setFilteredSpaces([]);
        } else {
          console.log('Fetched spaces from database:', spacesData.length);
          
          // Process the spaces
          const processedSpaces = spacesData.map((space: DatabaseSpace, index) => ({
            ...mapDatabaseSpaceToSpace(space),
            ranking: index + 1
          }));
          
          setSpaces(processedSpaces);
          setFilteredSpaces(processedSpaces);
        }
      } catch (error) {
        console.error('Error in fetchSpaces:', error);
        
        // Set empty arrays on error
        setSpaces([]);
        setFilteredSpaces([]);
        
        toast({
          title: "Error",
          description: "Failed to fetch spaces. Please try again later.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    }

    fetchSpaces();
  }, []);

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
    setSearchQuery
  };
}

// Helper function to generate tags based on space name
function generateTags(space: DatabaseSpace): string[] {
  // Get tags that match our actual category IDs
  const name = space.name?.toLowerCase() || '';
  const description = space.description?.toLowerCase() || '';
  
  // Assign specific tags based on space name/content
  if (name.includes('calligraphy') || name.includes('art') || name.includes('design') || 
      description.includes('calligraphy') || description.includes('art') || description.includes('design')) {
    return ['hobbies', 'self-improvement'];
  } else if (name.includes('pickleball') || name.includes('sport') || name.includes('fitness') || 
             description.includes('sport') || description.includes('fitness') || description.includes('workout')) {
    return ['sports', 'health'];
  } else if (name.includes('founder') || name.includes('business') || name.includes('financial') || 
             name.includes('crypto') || name.includes('investing') || 
             description.includes('founder') || description.includes('business') || 
             description.includes('financial') || description.includes('crypto') || 
             description.includes('investing')) {
    return ['money', 'personal-dev'];
  } else if (name.includes('marketing') || name.includes('tech') || name.includes('coding') || 
             description.includes('marketing') || description.includes('tech') || 
             description.includes('coding') || description.includes('programming')) {
    return ['tech', 'money'];
  } else if (name.includes('hormone') || name.includes('health') || name.includes('wellness') || 
             description.includes('health') || description.includes('wellness') || 
             description.includes('nutrition')) {
    return ['health', 'self-improvement'];
  } else if (name.includes('photo') || name.includes('photography') || 
             description.includes('photo') || description.includes('photography')) {
    return ['hobbies', 'tech'];
  } else if (name.includes('automation') || description.includes('automation')) {
    return ['tech', 'self-improvement'];
  } else if (name.includes('music') || description.includes('music') || 
             name.includes('instrument') || description.includes('instrument')) {
    return ['music', 'hobbies'];
  } else if (name.includes('relationship') || description.includes('relationship') || 
             name.includes('dating') || description.includes('dating')) {
    return ['relationships', 'self-improvement'];
  } else if (name.includes('spiritual') || description.includes('spiritual') || 
             name.includes('meditation') || description.includes('meditation')) {
    return ['spirituality', 'self-improvement'];
  }
  
  // Default tags for unknown spaces - changed from 'global' to more specific tags
  // that will help improve discoverability
  return ['personal-dev', 'self-improvement'];
}
