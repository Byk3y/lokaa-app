
import { TrendingUp } from "lucide-react";
import CommunityCard from "@/components/communities/CommunityCard";
import EmptyState from "@/components/dashboard/EmptyState";
import LoadingSpinner from "@/components/discover/LoadingSpinner";
import { Button } from "@/components/ui/button";

interface TrendingCommunitiesProps {
  communities: any[];
  loading: boolean;
  onJoinCommunity: (communityId: string) => void;
}

export default function TrendingCommunities({ communities, loading, onJoinCommunity }: TrendingCommunitiesProps) {
  return (
    <div id="trending-communities" className="mb-8">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">Trending Communities</h2>
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
          title="No trending communities available"
          description="Check back later for trending communities"
          actionText="Create a Community"
          actionLink="/communities/create"
          icon={<TrendingUp className="h-8 w-8 text-lokaa-600" />}
        />
      )}
    </div>
  );
}
