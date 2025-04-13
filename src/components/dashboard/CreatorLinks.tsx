
import { BookOpen, Calendar, Users, CreditCard, BarChart2 } from "lucide-react";
import SidebarLink from "./SidebarLink";

interface CreatorLinksProps {
  isActive: (path: string) => boolean;
  closeMobileSidebar: () => void;
}

const CreatorLinks = ({ isActive, closeMobileSidebar }: CreatorLinksProps) => {
  return (
    <div className="pt-2">
      <SidebarLink
        to="/dashboard/courses"
        icon={<BookOpen className="h-5 w-5" />}
        label="Courses"
        isActive={isActive("/dashboard/courses")}
        onClick={closeMobileSidebar}
      />
      <SidebarLink
        to="/dashboard/events"
        icon={<Calendar className="h-5 w-5" />}
        label="Events"
        isActive={isActive("/dashboard/events")}
        onClick={closeMobileSidebar}
      />
      <SidebarLink
        to="/dashboard/members"
        icon={<Users className="h-5 w-5" />}
        label="Members"
        isActive={isActive("/dashboard/members")}
        onClick={closeMobileSidebar}
      />
      <SidebarLink
        to="/dashboard/earnings"
        icon={<CreditCard className="h-5 w-5" />}
        label="Earnings"
        isActive={isActive("/dashboard/earnings")}
        onClick={closeMobileSidebar}
      />
      <SidebarLink
        to="/dashboard/analytics"
        icon={<BarChart2 className="h-5 w-5" />}
        label="Analytics"
        isActive={isActive("/dashboard/analytics")}
        onClick={closeMobileSidebar}
      />
    </div>
  );
};

export default CreatorLinks;
