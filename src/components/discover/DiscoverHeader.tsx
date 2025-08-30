import { Button } from "@/components/ui/button";
import { Menu, Loader2 } from "lucide-react";
import SpaceSwitcher from "@/components/spaces/SpaceSwitcher";
import HeaderActions from "@/components/common/HeaderActions";

interface DiscoverHeaderProps {
  user: any; // User type from auth context
  isLoggingOut: boolean;
  onToggleSpaceDrawer: () => void;
}

export default function DiscoverHeader({ 
  user, 
  isLoggingOut, 
  onToggleSpaceDrawer 
}: DiscoverHeaderProps) {
  return (
    <header className="sticky top-0 bg-white border-b border-gray-100 z-50">
      <div className="max-w-7xl mx-auto px-6 md:px-10 lg:px-16 flex items-center justify-between h-16">
        <div className="flex items-center">
          {/* Mobile hamburger menu */}
          <Button
            variant="ghost"
            className="sm:hidden text-gray-600 mr-1 p-2"
            onClick={onToggleSpaceDrawer}
            aria-label="Toggle space drawer"
          >
            <Menu className="h-5 w-5" />
          </Button>
          
          {/* Mobile Logo */}
          <h1 className="text-3xl font-bold leading-none sm:hidden" style={{ color: '#00A389' }}>
            Lokaa
          </h1>
          
          {/* Desktop Logo */}
          <h1 className="text-4xl font-bold leading-none hidden md:block" style={{ color: '#00A389' }}>
            Lokaa
          </h1>
          
          {/* Wrap SpaceSwitcher to hide on mobile */}
          <div className="ml-2 hidden sm:block">
            <SpaceSwitcher 
              userId={user?.id || ""}
              currentSpaceName="Discover"
              currentSpaceSubdomain="_discover_"
              hideTriggerLabel={true}
            />
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          {/* Desktop Actions - user is always authenticated on discover page */}
          <HeaderActions className="hidden sm:flex" />
          {isLoggingOut && (
            <div className="flex items-center space-x-2 ml-4">
              <Loader2 className="h-5 w-5 animate-spin text-teal-600" />
              <span className="text-sm text-gray-600">Signing out...</span>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
