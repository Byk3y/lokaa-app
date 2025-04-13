
import { TrendingUp, Users } from "lucide-react";
import { Link } from "react-router-dom";
import SpaceCard from "@/components/spaces/SpaceCard";
import EmptyState from "@/components/dashboard/EmptyState";
import LoadingSpinner from "@/components/discover/LoadingSpinner";
import { Button } from "@/components/ui/button";

interface JoinedSpacesSectionProps {
  spaces: any[];
  loading: boolean;
}

export default function JoinedSpacesSection({ spaces, loading }: JoinedSpacesSectionProps) {
  if (loading) {
    return (
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Your Communities</h2>
        <LoadingSpinner />
      </div>
    );
  }
  
  if (spaces.length === 0) {
    return (
      <div className="mb-8">
        <EmptyState
          title="You haven't joined any communities yet"
          description="Join spaces to connect with communities you're interested in"
          actionText="Discover Communities"
          actionLink="/discover"
          icon={<Users className="h-8 w-8 text-lokaa-600" />}
        />
      </div>
    );
  }
  
  return (
    <div className="mb-8">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold text-gray-900">Your Communities</h2>
        <Button 
          variant="ghost" 
          className="text-lokaa-600 hover:text-lokaa-700 hover:bg-lokaa-50"
          asChild
        >
          <Link to="/discover">Discover More</Link>
        </Button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {spaces.map((space) => (
          <div key={space.id} className="relative">
            <SpaceCard {...space} />
            <Link to={`/spaces/${space.id}`}>
              <Button
                className="absolute bottom-4 right-4 bg-lokaa-600 hover:bg-lokaa-700"
              >
                Visit Space
              </Button>
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
