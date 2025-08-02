import { Music, Code, Gamepad2, GraduationCap, TrendingUp } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SpaceCard } from "@/components/spaces/SpaceCard";
import EmptyState from "@/components/dashboard/EmptyState";
import LoadingIndicator from "@/components/LoadingIndicator";
import { Button } from "@/components/ui/button";
import { Space } from "../../types/space";

interface CategorySpacesProps {
  categorySpaces: {
    music: Space[];
    tech: Space[];
    gaming: Space[];
    education: Space[];
  };
  loading: boolean;
  onJoinSpace: (spaceId: string) => void;
}

/**
 * CategorySpaces component displays spaces organized by category.
 * Uses the modal approach for space navigation (openInModal=true) to provide
 * a fast browsing experience.
 * 
 * The application uses a hybrid navigation strategy:
 * - Internal browsing: Uses modals for quick space preview
 * - External sharing: Uses direct page navigation for shareable links
 */
export default function CategorySpaces({ categorySpaces, loading, onJoinSpace }: CategorySpacesProps) {
  const categoryKeys = Object.keys(categorySpaces) as Array<keyof typeof categorySpaces>;

  return (
    <div>
      <h2 className="text-xl font-semibold text-gray-900 mb-4">Browse by Category</h2>
      <Tabs defaultValue="music">
        <TabsList className="mb-4">
          <TabsTrigger value="music" className="flex items-center">
            <Music className="mr-2 h-4 w-4" /> Music
          </TabsTrigger>
          <TabsTrigger value="tech" className="flex items-center">
            <Code className="mr-2 h-4 w-4" /> Tech
          </TabsTrigger>
          <TabsTrigger value="gaming" className="flex items-center">
            <Gamepad2 className="mr-2 h-4 w-4" /> Gaming
          </TabsTrigger>
          <TabsTrigger value="education" className="flex items-center">
            <GraduationCap className="mr-2 h-4 w-4" /> Education
          </TabsTrigger>
        </TabsList>
        
        {categoryKeys.map((categoryKey) => (
          <TabsContent key={categoryKey} value={categoryKey}>
            {loading ? (
              <LoadingIndicator />
            ) : categorySpaces[categoryKey].length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {categorySpaces[categoryKey].map((space) => (
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
                title={`No ${categoryKey} spaces available`}
                description={`Check back later for ${categoryKey} spaces`}
                actionText="Explore Other Categories"
                actionLink="#trending-spaces"
                icon={<TrendingUp className="h-8 w-8 text-lokaa-600" />}
              />
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
