
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { Home, Loader2, Settings } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import SpaceSettingsForm from "@/components/spaces/SpaceSettingsForm";
import DashboardSidebar from "@/components/dashboard/DashboardSidebar";

export default function SpaceSettings() {
  const { spaceId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [space, setSpace] = useState(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const fetchSpace = async () => {
      if (!spaceId || !user) return;
      
      try {
        const { data, error } = await supabase
          .from('spaces')
          .select('*')
          .eq('id', spaceId)
          .single();
          
        if (error) throw error;
        
        // Check if the current user is the owner
        if (data.owner_id !== user.id) {
          toast({
            title: "Access denied",
            description: "You don't have permission to edit this space.",
            variant: "destructive"
          });
          navigate('/dashboard');
          return;
        }
        
        setSpace(data);
      } catch (error) {
        console.error('Error fetching space:', error);
        toast({
          title: "Error",
          description: "Could not load space settings. Please try again.",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };
    
    fetchSpace();
  }, [spaceId, user, navigate]);
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-lokaa-600" />
      </div>
    );
  }
  
  if (!space) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Space not found</h1>
          <p className="text-gray-600 mb-4">The space you're looking for doesn't exist or you don't have access to it.</p>
          <button 
            onClick={() => navigate('/dashboard')}
            className="text-lokaa-600 hover:text-lokaa-700"
          >
            Go back to dashboard
          </button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gray-50 flex">
      <DashboardSidebar />
      
      <div className="flex-1 lg:ml-64">
        <div className="p-6">
          <Breadcrumb className="mb-6">
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink href="/">
                  <Home className="h-4 w-4 mr-1" />
                  Home
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink href="/dashboard">Dashboard</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink href={`/spaces/${space.id}`}>
                  {space.name}
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink className="flex items-center">
                  <Settings className="h-4 w-4 mr-1" />
                  Settings
                </BreadcrumbLink>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>

          <h1 className="text-2xl font-bold text-gray-900 mb-8">Space Settings</h1>
          
          <SpaceSettingsForm space={space} />
        </div>
      </div>
    </div>
  );
}
