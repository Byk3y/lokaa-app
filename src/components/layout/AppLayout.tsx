import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Search, Bell, MessageSquare, Bookmark } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { SpacePreviewModal } from "@/components/modals/SpacePreviewModal";
import { useSpacePreviewStore } from "@/stores/useSpacePreviewStore";
import { useEffect } from "react";

export default function AppLayout() {
  const location = useLocation();
  const isInCommunity = location.pathname.includes("/c/");
  const { isOpen, spaceId, close } = useSpacePreviewStore();
  const navigate = useNavigate();

  // Debug logging for space preview state
  useEffect(() => {
    console.log("Space preview state:", { isOpen, spaceId });
  }, [isOpen, spaceId]);

  const handleJoinSpace = (spaceId: string) => {
    console.log("Joining space:", spaceId);
    // Navigate to the space join or request access page
    navigate(`/space/join/${spaceId}`);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            {/* Left navigation */}
            <div className="flex">
              <div className="flex-shrink-0 flex items-center">
                <Link to="/" className="font-bold text-xl">Lokaa</Link>
              </div>
            </div>

            {/* Center (shown when in community) */}
            {isInCommunity && (
              <div className="flex items-center justify-center flex-1 px-2 lg:ml-6 lg:justify-end">
                <div className="max-w-lg w-full lg:max-w-xs">
                  <Button variant="outline" size="sm" className="w-full pl-3 pr-10 py-2 flex items-center space-x-3">
                    <Search className="h-4 w-4 text-gray-400" />
                    <span className="text-gray-500">Search...</span>
                  </Button>
            </div>
          </div>
            )}

            {/* Right navigation */}
            <div className="flex items-center">
              <Button variant="ghost" size="sm" className="mx-1">
                <Bell className="h-5 w-5 text-gray-500" />
            </Button>
              <Button variant="ghost" size="sm" className="mx-1">
                <MessageSquare className="h-5 w-5 text-gray-500" />
            </Button>
              <Button variant="ghost" size="sm" className="mx-1">
                <Bookmark className="h-5 w-5 text-gray-500" />
            </Button>
              <div className="ml-3 relative">
                <Avatar>
              <AvatarImage src="https://github.com/shadcn.png" />
              <AvatarFallback>CN</AvatarFallback>
            </Avatar>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <Outlet />
      </main>

      <SpacePreviewModal
        open={isOpen}
        onOpenChange={(currentOpenState) => {
          console.log("Modal open change:", currentOpenState);
          if (!currentOpenState) {
            close();
          }
        }}
        spaceId={spaceId}
        onJoin={handleJoinSpace}
      />
    </div>
  );
} 