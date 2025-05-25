import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Search, Bell, Bookmark } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { SpacePreviewModal } from "@/components/modals/SpacePreviewModal";
import { useSpacePreviewStore } from "@/stores/useSpacePreviewStore";
import { useEffect } from "react";
import ChatButton from "@/components/chat/ChatButton";

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
    <div className="min-h-screen flex flex-col">
      {/* Top Nav */}
      <header className="bg-white shadow-sm fixed top-0 left-0 right-0 z-50">
        <div className="container mx-auto flex items-center justify-between h-16 px-4">
          <div className="flex items-center">
            <Link to="/" className="text-xl font-bold text-primary">
              Lokaa
            </Link>
          </div>

          <div className="relative w-1/3 hidden md:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input 
              type="text" 
              placeholder="Search" 
              className="w-full h-10 pl-10 pr-4 rounded-full border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>
          
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm">
              <Bell className="w-5 h-5" />
            </Button>
            <ChatButton />
            <Button variant="ghost" size="sm">
              <Bookmark className="w-5 h-5" />
            </Button>
            
            <Avatar className="h-8 w-8">
              <AvatarFallback>U</AvatarFallback>
            </Avatar>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 mt-16">
        <Outlet />
      </main>

      {/* Space Preview Modal */}
      <SpacePreviewModal 
        open={isOpen} 
        onOpenChange={(open) => {
          if (!open) close();
        }}
        spaceId={spaceId} 
        onJoin={handleJoinSpace} 
      />
    </div>
  );
} 