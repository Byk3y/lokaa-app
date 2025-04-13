
import { Settings, LogOut } from "lucide-react";
import SidebarLink from "./SidebarLink";

interface SidebarFooterProps {
  isActive: (path: string) => boolean;
  closeMobileSidebar: () => void;
  signOut: () => void;
}

const SidebarFooter = ({ isActive, closeMobileSidebar, signOut }: SidebarFooterProps) => {
  return (
    <div className="p-4 border-t">
      <div className="space-y-1">
        <SidebarLink
          to="/dashboard/settings"
          icon={<Settings className="h-5 w-5" />}
          label="Settings"
          isActive={isActive("/dashboard/settings")}
          onClick={closeMobileSidebar}
        />
        <button
          className="flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors w-full text-left text-gray-700 hover:bg-gray-100"
          onClick={signOut}
        >
          <LogOut className="h-5 w-5" />
          <span>Log Out</span>
        </button>
      </div>
    </div>
  );
};

export default SidebarFooter;
