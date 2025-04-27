import { TrendingUp } from "lucide-react";
import SpaceCard from "@/components/spaces/SpaceCard";
import EmptyState from "@/components/dashboard/EmptyState";
import LoadingSpinner from "@/components/discover/LoadingSpinner";
import { Button } from "@/components/ui/button";

interface TrendingSpacesProps {
  spaces: any[];
  loading: boolean;
  onJoinSpace: (spaceId: string) => void;
}

export default function TrendingSpaces({ spaces, loading, onJoinSpace }: TrendingSpacesProps) {
  return (
    <div className="mb-8" id="trending-spaces">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">Trending Spaces</h2>
      {loading ? (
        <LoadingSpinner />
      ) : spaces.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {spaces.map((space) => (
            <div key={space.id} className="relative">
              <a
                href={space.subdomain ? `/${space.subdomain}/about` : "#"}
                target="_blank"
                rel="noopener noreferrer"
                className="block"
              >
                <SpaceCard {...space} linkType="about" />
              </a>
              <Button
                className="absolute bottom-4 right-4 bg-lokaa-600 hover:bg-lokaa-700"
                onClick={() => onJoinSpace(space.id)}
              >
                Join Space
              </Button>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          title="No trending spaces available"
          description="Check back later for trending spaces"
          actionText="Create a Space"
          actionLink="/create-space"
          icon={<TrendingUp className="h-8 w-8 text-lokaa-600" />}
        />
      )}
    </div>
  );
}
