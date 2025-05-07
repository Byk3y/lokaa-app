import { Bell, MessageCircle, Bookmark } from "lucide-react";
import { Button } from "@/components/ui/button";
import UserMenu from "../layout/UserMenu";

export default function DashboardHeader() {
  return (
    <header className="bg-white border-b fixed top-0 right-0 z-30 left-0 lg:left-64 transition-all duration-300">
      <div className="flex items-center justify-end px-4 py-3">
        <div className="flex items-center space-x-2">
          {/* Icon buttons */}
          <Button variant="ghost" size="sm" className="relative text-gray-500 hover:text-lokaa-700">
            <Bell className="h-5 w-5" />
            <span className="absolute top-0 right-0 h-2 w-2 bg-red-500 rounded-full"></span>
          </Button>
          
          <Button variant="ghost" size="sm" className="text-gray-500 hover:text-lokaa-700">
            <MessageCircle className="h-5 w-5" />
          </Button>
          
          <Button variant="ghost" size="sm" className="text-gray-500 hover:text-lokaa-700">
            <Bookmark className="h-5 w-5" />
          </Button>
          
          {/* User menu */}
          <UserMenu />
        </div>
      </div>
    </header>
  );
}
