import { TrendingUp } from "lucide-react";
import { SpaceCard } from "@/components/spaces/SpaceCard";
import EmptyState from "@/components/dashboard/EmptyState";
import LoadingIndicator from "@/components/LoadingIndicator";
import { Button } from "@/components/ui/button";
import { Space } from "../../types/space";

interface TrendingSpacesProps {
  spaces: Space[];
  loading: boolean;
  onJoinSpace: (spaceId: string) => void;
}

/**
 * TrendingSpaces component displays a grid of trending spaces.
 * Uses the modal approach for space navigation (openInModal=true) to provide
 * a fast browsing experience.
 * 
 * The application uses a hybrid navigation strategy:
 * - Internal browsing: Uses modals for quick space preview
 * - External sharing: Uses direct page navigation for shareable links
 */
export default function TrendingSpaces({ spaces, loading, onJoinSpace }: TrendingSpacesProps) {
  return (
    <div className="mb-8" id="trending-spaces">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">Trending Spaces</h2>
      {loading ? (
        <LoadingIndicator />
      ) : spaces.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {spaces.map((space) => (
            <div key={space.id} className="relative">
              <SpaceCard space={space} openInModal={true} />
              
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
