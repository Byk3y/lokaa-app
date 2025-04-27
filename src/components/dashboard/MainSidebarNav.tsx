import { Home, Compass } from "lucide-react";
import SidebarLink from "./SidebarLink";
import SpacesSection from "./SpacesSection";
import CreatorLinks from "./CreatorLinks";

interface MainSidebarNavProps {
  isActive: (path: string) => boolean;
  closeMobileSidebar: () => void;
  isCreator: boolean;
  location: { pathname: string };
}

const MainSidebarNav = ({ 
  isActive, 
  closeMobileSidebar, 
  isCreator, 
  location 
}: MainSidebarNavProps) => {
  return (
    <nav className="space-y-1">
      <SidebarLink
        to="/dashboard"
        icon={<Home className="h-5 w-5" />}
        label="Home"
        isActive={location.pathname === "/dashboard"}
        onClick={closeMobileSidebar}
      />

      <SidebarLink
        to="/discover?force=discover"
        icon={<Compass className="h-5 w-5" />}
        label="Discover"
        isActive={isActive("/discover")}
        onClick={closeMobileSidebar}
      />

      <SpacesSection closeMobileSidebar={closeMobileSidebar} />

      {isCreator && <CreatorLinks isActive={isActive} closeMobileSidebar={closeMobileSidebar} />}
    </nav>
  );
};

export default MainSidebarNav;
