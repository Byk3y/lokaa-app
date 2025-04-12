
import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Home,
  Users,
  BookOpen,
  Calendar,
  CreditCard,
  Settings,
  LogOut,
  Menu,
  X,
  ChevronDown,
  ChevronRight,
  BarChart2,
  PlusCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface SidebarLinkProps {
  to: string;
  icon: React.ReactNode;
  label: string;
  isActive: boolean;
  onClick?: () => void;
}

const SidebarLink = ({ to, icon, label, isActive, onClick }: SidebarLinkProps) => (
  <Link
    to={to}
    className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
      isActive
        ? "bg-lokaa-100 text-lokaa-700"
        : "text-gray-700 hover:bg-gray-100"
    }`}
    onClick={onClick}
  >
    {icon}
    <span>{label}</span>
  </Link>
);

export default function DashboardSidebar() {
  const location = useLocation();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [spacesExpanded, setSpacesExpanded] = useState(true);

  const isActive = (path: string) => location.pathname.startsWith(path);
  const closeMobileSidebar = () => setIsMobileOpen(false);
  const toggleSpaces = () => setSpacesExpanded(!spacesExpanded);

  // Mock spaces data - in a real app, this would come from an API or context
  const spaces = [
    { id: "1", name: "Design Community" },
    { id: "2", name: "Tech Entrepreneurs" },
    { id: "3", name: "Digital Marketing" },
  ];

  return (
    <>
      {/* Mobile Menu Toggle */}
      <div className="lg:hidden fixed top-4 left-4 z-40">
        <Button
          variant="outline"
          size="icon"
          onClick={() => setIsMobileOpen(!isMobileOpen)}
          className="rounded-full bg-white shadow-md"
        >
          <Menu className="h-5 w-5" />
        </Button>
      </div>

      {/* Mobile Overlay */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 lg:hidden"
          onClick={closeMobileSidebar}
        ></div>
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-full w-64 bg-white shadow-lg z-50 transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isMobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex flex-col h-full">
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

          <div className="flex-1 overflow-y-auto py-4 px-3">
            <nav className="space-y-1">
              <SidebarLink
                to="/dashboard"
                icon={<Home className="h-5 w-5" />}
                label="Home"
                isActive={location.pathname === "/dashboard"}
                onClick={closeMobileSidebar}
              />

              <div className="pt-4 pb-2">
                <button
                  onClick={toggleSpaces}
                  className="flex items-center justify-between w-full px-4 py-2 text-sm font-medium text-gray-600 rounded-md hover:bg-gray-100"
                >
                  <span>Your Spaces</span>
                  {spacesExpanded ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </button>

                {spacesExpanded && (
                  <div className="mt-1 pl-4 space-y-1">
                    {spaces.map((space) => (
                      <Link
                        key={space.id}
                        to={`/spaces/${space.id}`}
                        className="flex items-center px-4 py-2 text-sm text-gray-600 rounded-md hover:bg-gray-100"
                        onClick={closeMobileSidebar}
                      >
                        {space.name}
                      </Link>
                    ))}
                    <Link
                      to="/spaces/create"
                      className="flex items-center px-4 py-2 text-sm text-lokaa-600 rounded-md hover:bg-gray-100"
                      onClick={closeMobileSidebar}
                    >
                      <PlusCircle className="h-4 w-4 mr-2" />
                      Create Space
                    </Link>
                  </div>
                )}
              </div>

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
            </nav>
          </div>

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
              >
                <LogOut className="h-5 w-5" />
                <span>Log Out</span>
              </button>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
