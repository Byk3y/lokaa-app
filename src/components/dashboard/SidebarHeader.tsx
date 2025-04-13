
import { Link } from "react-router-dom";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SidebarHeaderProps {
  closeMobileSidebar: () => void;
}

const SidebarHeader = ({ closeMobileSidebar }: SidebarHeaderProps) => {
  return (
    <div className="flex items-center justify-between p-4 border-b">
      <Link to="/dashboard" className="flex items-center space-x-2">
        <div className="w-8 h-8 rounded-full bg-lokaa-600 flex items-center justify-center">
          <span className="text-white font-bold text-sm">L</span>
        </div>
        <span className="font-bold text-gray-900">Lokaa</span>
      </Link>
      <Button
        variant="ghost"
        size="icon"
        onClick={closeMobileSidebar}
        className="lg:hidden"
      >
        <X className="h-5 w-5" />
      </Button>
    </div>
  );
};

export default SidebarHeader;
