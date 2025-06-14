import { Button } from "@/components/ui/button";
import UserMenu from "../layout/UserMenu";
import { TopNavBellIcon, TopNavChatIcon, NavBookmarkIcon } from "@/components/ui/nav-icons";

export default function DashboardHeader() {
  return (
    <header className="bg-white border-b fixed top-0 right-0 z-30 left-0 lg:left-64 transition-all duration-300">
      <div className="flex items-center justify-end px-4 py-3">
        <div className="flex items-center space-x-3">
          {/* Icon buttons - clean style matching post cards */}
          <Button variant="ghost" size="icon" className="h-10 w-10 text-gray-500 relative">
            <TopNavBellIcon className="h-7 w-7" />
            <span className="absolute top-0 right-0 h-2 w-2 bg-red-500 rounded-full"></span>
          </Button>
          
          <Button variant="ghost" size="icon" className="h-10 w-10 text-gray-500">
            <TopNavChatIcon className="h-7 w-7" />
          </Button>
          
          <Button variant="ghost" size="icon" className="h-10 w-10 text-gray-500">
            <NavBookmarkIcon className="h-7 w-7" />
          </Button>
          
          {/* User menu */}
          <UserMenu />
        </div>
      </div>
    </header>
  );
}
