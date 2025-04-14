
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Bell, MessageCircle, Bookmark, Search, User, Pen, Lock, LogOut } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function DashboardHeader() {
  const { user, userDetails, signOut } = useAuth();

  // Helper function to get avatar fallback (initials)
  const getInitials = (name: string) => {
    if (!name) return "U";
    return name.charAt(0).toUpperCase();
  };

  const isCreator = userDetails?.role === 'creator';

  return (
    <header className={`bg-white border-b fixed top-0 right-0 z-30 ${isCreator ? 'left-64' : 'left-0'} lg:left-64 transition-all duration-300`}>
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center space-x-6">
          <Link to="/dashboard" className="hidden lg:flex items-center">
            <span className="text-xl font-bold text-lokaa-700">Lokaa</span>
          </Link>
          
          {/* Search bar */}
          <div className="relative w-full max-w-md">
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
              <Search className="h-4 w-4 text-gray-400" />
            </div>
            <Input
              type="search"
              placeholder="Search..."
              className="pl-10 py-2 bg-gray-50 border-gray-200"
            />
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          {/* Icon buttons */}
          <Button variant="ghost" size="icon" className="relative text-gray-500 hover:text-lokaa-700">
            <Bell className="h-5 w-5" />
            <span className="absolute top-0 right-0 h-2 w-2 bg-red-500 rounded-full"></span>
          </Button>
          
          <Button variant="ghost" size="icon" className="text-gray-500 hover:text-lokaa-700">
            <MessageCircle className="h-5 w-5" />
          </Button>
          
          <Button variant="ghost" size="icon" className="text-gray-500 hover:text-lokaa-700">
            <Bookmark className="h-5 w-5" />
          </Button>
          
          {/* User dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                <Avatar>
                  <AvatarImage src={userDetails?.avatar_url} />
                  <AvatarFallback className="bg-lokaa-100 text-lokaa-700">
                    {getInitials(userDetails?.username || user?.email || "")}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end">
              <DropdownMenuLabel>
                <div className="flex flex-col space-y-1">
                  <p className="font-medium">{userDetails?.username || "User"}</p>
                  <p className="text-sm text-muted-foreground">{user?.email}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link to={`/profile/${userDetails?.username}`} className="cursor-pointer w-full flex items-center">
                  <User className="mr-2 h-4 w-4" />
                  <span>View profile</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/profile/edit" className="cursor-pointer w-full flex items-center">
                  <Pen className="mr-2 h-4 w-4" />
                  <span>Edit profile</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/notifications" className="cursor-pointer w-full flex items-center">
                  <Bell className="mr-2 h-4 w-4" />
                  <span>Notifications</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/settings" className="cursor-pointer w-full flex items-center">
                  <Lock className="mr-2 h-4 w-4" />
                  <span>Authentication</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={signOut} 
                className="text-red-600 cursor-pointer flex items-center"
              >
                <LogOut className="mr-2 h-4 w-4" />
                <span>Sign out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
