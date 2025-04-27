import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";

// This is a temporary simplified version that doesn't depend on legacy community structures
export function useCreatorStatus() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['creatorStatus', user?.id],
    queryFn: async () => {
      if (!user) return null;
      
      console.log('Simplified creator status check for user:', user.id);
      
      // For now, we'll return null since we're not using communities anymore
      // In the future, this could be replaced with a check against a different table
      return null;
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
  });
} 