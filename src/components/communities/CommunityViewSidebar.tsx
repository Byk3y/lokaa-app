
import { useParams, Link, useLocation } from "react-router-dom";
import { 
  MessageSquare, 
  Grid3X3, 
  Calendar, 
  BookOpen, 
  Users, 
  Settings,
  Home
} from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/contexts/AuthContext";

export function CommunityViewSidebar() {
  const { communityId } = useParams();
  const location = useLocation();
  const { userDetails } = useAuth();
  
  const isActive = (path: string) => {
    return location.pathname === path;
  };

  // Determine if user is owner of this community
  const isOwner = false; // This will need to be updated with real data
  
  return (
    <div className="fixed left-[72px] inset-y-0 w-56 bg-white border-r border-gray-200 pt-4 pb-6 px-3 z-40">
      <div className="flex flex-col h-full">
        <div className="space-y-1">
          <div className="px-4 py-2">
            <h2 className="text-lg font-medium text-gray-900">Community Name</h2>
            <p className="text-sm text-gray-500 truncate">Community description</p>
          </div>
          
          <Separator className="my-2" />

          <nav className="flex-1 space-y-1">
            <Link
              to={`/c/${communityId}`}
              className={`flex items-center px-4 py-2 text-sm font-medium rounded-md ${
                isActive(`/c/${communityId}`) 
                  ? "bg-lokaa-100 text-lokaa-700" 
                  : "text-gray-700 hover:bg-gray-100"
              }`}
            >
              <Home className="mr-3 h-5 w-5" />
              Home
            </Link>
            
            <Link
              to={`/c/${communityId}/feed`}
              className={`flex items-center px-4 py-2 text-sm font-medium rounded-md ${
                isActive(`/c/${communityId}/feed`) 
                  ? "bg-lokaa-100 text-lokaa-700" 
                  : "text-gray-700 hover:bg-gray-100"
              }`}
            >
              <MessageSquare className="mr-3 h-5 w-5" />
              Feed
            </Link>
            
            <Link
              to={`/c/${communityId}/spaces`}
              className={`flex items-center px-4 py-2 text-sm font-medium rounded-md ${
                isActive(`/c/${communityId}/spaces`) 
                  ? "bg-lokaa-100 text-lokaa-700" 
                  : "text-gray-700 hover:bg-gray-100"
              }`}
            >
              <Grid3X3 className="mr-3 h-5 w-5" />
              Spaces
            </Link>
            
            <Link
              to={`/c/${communityId}/events`}
              className={`flex items-center px-4 py-2 text-sm font-medium rounded-md ${
                isActive(`/c/${communityId}/events`) 
                  ? "bg-lokaa-100 text-lokaa-700" 
                  : "text-gray-700 hover:bg-gray-100"
              }`}
            >
              <Calendar className="mr-3 h-5 w-5" />
              Events
            </Link>
            
            <Link
              to={`/c/${communityId}/courses`}
              className={`flex items-center px-4 py-2 text-sm font-medium rounded-md ${
                isActive(`/c/${communityId}/courses`) 
                  ? "bg-lokaa-100 text-lokaa-700" 
                  : "text-gray-700 hover:bg-gray-100"
              }`}
            >
              <BookOpen className="mr-3 h-5 w-5" />
              Courses
            </Link>
            
            <Link
              to={`/c/${communityId}/members`}
              className={`flex items-center px-4 py-2 text-sm font-medium rounded-md ${
                isActive(`/c/${communityId}/members`) 
                  ? "bg-lokaa-100 text-lokaa-700" 
                  : "text-gray-700 hover:bg-gray-100"
              }`}
            >
              <Users className="mr-3 h-5 w-5" />
              Members
            </Link>
            
            {isOwner && (
              <Link
                to={`/c/${communityId}/settings`}
                className={`flex items-center px-4 py-2 text-sm font-medium rounded-md ${
                  isActive(`/c/${communityId}/settings`) 
                    ? "bg-lokaa-100 text-lokaa-700" 
                    : "text-gray-700 hover:bg-gray-100"
                }`}
              >
                <Settings className="mr-3 h-5 w-5" />
                Settings
              </Link>
            )}
          </nav>
        </div>
      </div>
    </div>
  );
}
