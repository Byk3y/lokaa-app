
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

export default function useCommunitiesData() {
  const { user } = useAuth();
  const [joinedCommunities, setJoinedCommunities] = useState([]);
  const [trendingCommunities, setTrendingCommunities] = useState([]);
  const [featuredCommunities, setFeaturedCommunities] = useState([]);
  const [categoryCommunities, setCategoryCommunities] = useState({
    music: [],
    tech: [],
    gaming: [],
    education: []
  });
  const [loading, setLoading] = useState(true);

  // Fetch joined communities
  useEffect(() => {
    const fetchJoinedCommunities = async () => {
      try {
        if (!user) {
          setJoinedCommunities([]);
          return;
        }
        
        const { data, error } = await supabase
          .from('members')
          .select('community_id')
          .eq('user_id', user.id)
          .eq('is_active', true);
        
        if (error) throw error;
        
        if (data && data.length > 0) {
          const communityIds = data.map(membership => membership.community_id);
          
          const { data: communitiesData, error: communitiesError } = await supabase
            .from('communities')
            .select('*')
            .in('id', communityIds);
          
          if (communitiesError) throw communitiesError;
          
          setJoinedCommunities(communitiesData || []);
        } else {
          setJoinedCommunities([]);
        }
      } catch (error) {
        console.error('Error fetching joined communities:', error);
        toast({
          title: "Error loading joined communities",
          description: "Could not load your communities at this time.",
          variant: "destructive"
        });
      }
    };

    fetchJoinedCommunities();
  }, [user]);

  // Fetch trending and category communities
  useEffect(() => {
    const fetchCommunities = async () => {
      try {
        setLoading(true);
        
        // Get trending communities
        const { data: trendingData, error: trendingError } = await supabase
          .from('communities')
          .select('*')
          .order('member_count', { ascending: false })
          .limit(6);
        
        if (trendingError) throw trendingError;
        setTrendingCommunities(trendingData || []);
        
        // Get featured communities (for now, we'll use the top 3 most popular)
        const { data: featuredData, error: featuredError } = await supabase
          .from('communities')
          .select('*')
          .order('member_count', { ascending: false })
          .limit(3);
        
        if (featuredError) throw featuredError;
        setFeaturedCommunities(featuredData || []);
        
        // Get communities by category
        const categories = ['music', 'tech', 'gaming', 'education'];
        const categorizedCommunities = {
          music: [],
          tech: [],
          gaming: [],
          education: []
        };
        
        const { data: allCommunities, error: allCommunitiesError } = await supabase
          .from('communities')
          .select('*')
          .limit(20);
        
        if (allCommunitiesError) throw allCommunitiesError;
        
        if (allCommunities) {
          allCommunities.forEach(community => {
            const randomCategoryIndex = Math.floor(Math.random() * categories.length);
            const category = categories[randomCategoryIndex];
            if (categorizedCommunities[category].length < 6) {
              categorizedCommunities[category].push(community);
            }
          });
        }
        
        setCategoryCommunities(categorizedCommunities);
      } catch (error) {
        console.error('Error fetching communities:', error);
        toast({
          title: "Error loading communities",
          description: "Could not load communities at this time.",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };

    fetchCommunities();
  }, []);

  return {
    joinedCommunities,
    setJoinedCommunities,
    trendingCommunities,
    featuredCommunities,
    categoryCommunities,
    loading
  };
}
