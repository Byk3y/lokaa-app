import { TrendingUp } from "lucide-react";
import { SpaceCard } from "@/components/spaces/SpaceCard";
import EmptyState from "@/components/dashboard/EmptyState";
import LoadingIndicator from "@/components/LoadingIndicator";
import { Space } from "../../types/space";

interface JoinedSpacesProps {
  spaces: Space[];
  loading: boolean;
}

export default function JoinedSpaces({ spaces, loading }: JoinedSpacesProps) {
  return (
    <div className="mb-8">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">Spaces You've Joined</h2>
      {loading ? (
        <LoadingIndicator />
      ) : spaces.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {spaces.map((space) => (
            <SpaceCard key={space.id} space={space} openInModal={false} />
          ))}
        </div>
      ) : (
        <EmptyState
          title="No spaces joined yet"
          description="Join spaces to connect with communities you're interested in"
          actionText="Browse Spaces"
          actionLink="#trending-spaces"
          icon={<TrendingUp className="h-8 w-8 text-lokaa-600" />}
        />
      )}
    </div>
  );
}
