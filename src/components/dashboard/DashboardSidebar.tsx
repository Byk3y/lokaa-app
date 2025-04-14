
import { useState } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Home, Compass, Plus } from "lucide-react";

import MobileMenuToggle from "./MobileMenuToggle";
import SidebarHeader from "./SidebarHeader";
import SidebarLink from "./SidebarLink";
import SpacesSection from "./SpacesSection";
import SidebarFooter from "./SidebarFooter";

export default function DashboardSidebar() {
  const location = useLocation();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const { userDetails, signOut } = useAuth();

  const isActive = (path: string) => location.pathname.startsWith(path);
  const closeMobileSidebar = () => setIsMobileOpen(false);

  const isCreator = userDetails?.role === 'creator';

  return (
    <>
      <MobileMenuToggle 
        isMobileOpen={isMobileOpen} 
        setIsMobileOpen={setIsMobileOpen}
        closeMobileSidebar={closeMobileSidebar}
      />

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-full w-64 bg-white shadow-lg z-50 transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isMobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex flex-col h-full">
          <SidebarHeader closeMobileSidebar={closeMobileSidebar} />
          
          <div className="flex-1 overflow-y-auto py-4 px-3">
            <nav className="space-y-1">
              <SidebarLink
                to="/dashboard"
                icon={<Home className="h-5 w-5" />}
                label="Home"
                isActive={location.pathname === "/dashboard"}
                onClick={closeMobileSidebar}
              />

              <SidebarLink
                to="/discover"
                icon={<Compass className="h-5 w-5" />}
                label="Discover"
                isActive={isActive("/discover")}
                onClick={closeMobileSidebar}
              />
              
              {/* Community icons section */}
              <div className="pt-6 pb-2">
                <h3 className="px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Your Spaces
                </h3>
                
                {/* Community icon list */}
                <div className="mt-3 grid grid-cols-3 gap-2 px-2">
                  {/* This will be populated dynamically from SpacesSection */}
                  <SpacesSection closeMobileSidebar={closeMobileSidebar} />
                </div>
              </div>
              
              {/* Create Space Button */}
              <SidebarLink
                to="/spaces/create"
                icon={<Plus className="h-5 w-5" />}
                label="Create Space"
                isActive={isActive("/spaces/create")}
                onClick={closeMobileSidebar}
              />
            </nav>
          </div>

          <SidebarFooter 
            isActive={isActive} 
            closeMobileSidebar={closeMobileSidebar}
            signOut={signOut}
          />
        </div>
      </aside>
    </>
  );
}
