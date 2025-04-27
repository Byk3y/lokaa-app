import { Outlet } from "react-router-dom";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import DashboardSidebar from "@/components/dashboard/DashboardSidebar";
import DashboardHeader from "@/components/dashboard/DashboardHeader";

export default function LoggedInLayout() {
  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Toaster />
      <Sonner />
      
      {/* Main Sidebar */}
      <DashboardSidebar />
      
      {/* Main Content */}
      <div className="flex-1 lg:ml-64">
        <DashboardHeader />
        <main className="p-6 mt-16">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
