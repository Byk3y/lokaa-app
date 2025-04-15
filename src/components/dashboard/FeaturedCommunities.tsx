
import { TrendingUp } from "lucide-react";
import CommunityCard from "@/components/communities/CommunityCard";
import EmptyState from "@/components/dashboard/EmptyState";
import LoadingSpinner from "@/components/discover/LoadingSpinner";
import { Button } from "@/components/ui/button";

interface FeaturedCommunitiesProps {
  communities: any[];
  loading: boolean;
  onJoinCommunity: (communityId: string) => void;
}

export default function FeaturedCommunities({ communities, loading, onJoinCommunity }: FeaturedCommunitiesProps) {
  return (
    <div className="mb-8">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">Featured Communities</h2>
      {loading ? (
        <LoadingSpinner />
      ) : communities.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {communities.map((community) => (
            <div key={community.id} className="relative">
              <CommunityCard {...community} />
              <Button
                className="absolute bottom-4 right-4 bg-lokaa-600 hover:bg-lokaa-700"
                onClick={() => onJoinCommunity(community.id)}
              >
                Join Community
              </Button>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          title="No featured communities available"
          description="Check back later for featured communities"
          actionText="Explore Other Communities"
          actionLink="/discover"
          icon={<TrendingUp className="h-8 w-8 text-lokaa-600" />}
        />
      )}
    </div>
  );
}
