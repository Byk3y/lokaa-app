
import { Link } from "react-router-dom";
import { TrendingUp } from "lucide-react";
import CommunityCard from "@/components/communities/CommunityCard";
import EmptyState from "@/components/dashboard/EmptyState";
import LoadingSpinner from "@/components/discover/LoadingSpinner";

interface JoinedSpacesSectionProps {
  communities: any[];
  loading: boolean;
}

export default function JoinedSpacesSection({ communities, loading }: JoinedSpacesSectionProps) {
  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-gray-900">Your Communities</h2>
        <Link to="/discover" className="text-sm text-lokaa-600 hover:text-lokaa-700">
          View all
        </Link>
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : communities.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {communities.map((community) => (
            <CommunityCard key={community.id} {...community} />
          ))}
        </div>
      ) : (
        <EmptyState
          title="No communities joined yet"
          description="Join communities to connect with like-minded people"
          actionText="Discover Communities"
          actionLink="/discover"
          icon={<TrendingUp className="h-8 w-8 text-lokaa-600" />}
        />
      )}
    </div>
  );
}
