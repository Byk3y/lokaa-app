
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

export default function useCommunitiesData() {
  const { user } = useAuth();
  const [joinedCommunities, setJoinedCommunities] = useState([]);
  const [trendingCommunities, setTrendingCommunities] = useState([]);
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
      } finally {
        setLoading(false);
      }
    };

    fetchJoinedCommunities();
  }, [user]);

  // Fetch trending communities
  useEffect(() => {
    const fetchTrendingCommunities = async () => {
      try {
        // Skip fetching trending if we're already loading joined communities
        if (loading) return;
        
        // Get trending communities
        const { data, error } = await supabase
          .from('communities')
          .select('*')
          .order('member_count', { ascending: false })
          .limit(6);
        
        if (error) throw error;
        setTrendingCommunities(data || []);
      } catch (error) {
        console.error('Error fetching trending communities:', error);
        toast({
          title: "Error loading communities",
          description: "Could not load trending communities at this time.",
          variant: "destructive"
        });
      }
    };

    fetchTrendingCommunities();
  }, [loading]);

  return {
    joinedCommunities,
    setJoinedCommunities,
    trendingCommunities,
    loading
  };
}
