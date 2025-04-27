import { Link } from "react-router-dom";
import { TrendingUp } from "lucide-react";
import SpaceCard from "@/components/spaces/SpaceCard";
import EmptyState from "@/components/dashboard/EmptyState";
import LoadingSpinner from "@/components/discover/LoadingSpinner";

interface JoinedSpacesSectionProps {
  spaces: any[];
  loading: boolean;
}

export default function JoinedSpacesSection({ spaces, loading }: JoinedSpacesSectionProps) {
  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-gray-900">Your Spaces</h2>
        <Link to="/discover?force=discover" className="text-sm text-lokaa-600 hover:text-lokaa-700">
          View all
        </Link>
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : spaces.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {spaces.map((space) => (
            <SpaceCard key={space.id} {...space} linkType="space" />
          ))}
        </div>
      ) : (
        <EmptyState
          title="No spaces joined yet"
          description="Join spaces to connect with like-minded people"
          actionText="Discover Spaces"
          actionLink="/discover"
          icon={<TrendingUp className="h-8 w-8 text-lokaa-600" />}
        />
      )}
    </div>
  );
}
