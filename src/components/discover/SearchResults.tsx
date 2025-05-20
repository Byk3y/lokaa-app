import { SpaceCard } from "@/components/spaces/SpaceCard";
import { Button } from "@/components/ui/button";
import { Space } from "../../types/space";

interface SearchResultsProps {
  searchQuery: string;
  results: Space[];
  onJoinSpace: (spaceId: string) => void;
}

export default function SearchResults({ searchQuery, results, onJoinSpace }: SearchResultsProps) {
  if (!searchQuery || results.length === 0) return null;

  return (
    <div className="mb-8">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">Search Results</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {results.map((space) => (
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
    </div>
  );
}
