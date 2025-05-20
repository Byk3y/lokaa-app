import { TrendingUp } from "lucide-react";
import { SpaceCard } from "@/components/spaces/SpaceCard";
import EmptyState from "@/components/dashboard/EmptyState";
import LoadingSpinner from "@/components/discover/LoadingSpinner";
import { Button } from "@/components/ui/button";
import { Space } from "../../types/space";

interface FeaturedSpacesProps {
  spaces: Space[];
  loading: boolean;
  onJoinSpace: (spaceId: string) => void;
}

export default function FeaturedSpaces({ spaces, loading, onJoinSpace }: FeaturedSpacesProps) {
  return (
    <div className="mb-8">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">Featured Spaces</h2>
      {loading ? (
        <LoadingSpinner />
      ) : spaces.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {spaces.map((space) => (
            <div key={space.id} className="relative">
              <SpaceCard space={space} openInModal={false} />
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
          title="No featured spaces available"
          description="Check back later for featured spaces"
          actionText="Explore Other Spaces"
          actionLink="/discover"
          icon={<TrendingUp className="h-8 w-8 text-lokaa-600" />}
        />
      )}
    </div>
  );
}
