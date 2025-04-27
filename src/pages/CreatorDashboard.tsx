import { Routes, Route, useParams, Navigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import CreatorOnboarding from "@/components/creator/CreatorOnboarding";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";

// Space components (these would be in separate files in a real implementation)
const PostsSpace = () => (
  <div>Posts Space Content</div>
);

const EventsSpace = () => (
  <div>Events Space Content</div>
);

const CoursesSpace = () => (
  <div>Courses Space Content</div>
);

const ChatSpace = () => (
  <div>Chat Space Content</div>
);

const MembersSpace = () => (
  <div>Members Space Content</div>
);

export default function CreatorDashboard() {
  const { user } = useAuth();
  const { communitySlug } = useParams();
  const navigate = useNavigate();

  // First, fetch the user's first community
  const { data: community, isLoading } = useQuery({
    queryKey: ['userFirstCommunity', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      const { data, error } = await supabase
        .from('communities')
        .select('*')
        .eq('owner_id', user.id)
        .order('created_at', { ascending: true })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 is the "no rows returned" error
        throw error;
      }

      return data;
    },
    enabled: !!user?.id
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
      </div>
    );
  }

  // If no community exists, create one
  if (!community) {
    // Redirect to discover page instead of showing the old welcome UI
    navigate('/discover', { replace: true });
    return null;
  }

  return (
    <div className="container mx-auto py-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{communitySlug}</h1>
          <p className="text-gray-600">Manage your community and spaces</p>
        </div>
      </div>

      {/* Community and Space Routes */}
      <Routes>
        {/* Community Overview (shown when no space is selected) */}
        <Route index element={
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Overview</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Community stats and metrics</p>
              </CardContent>
            </Card>
          </div>
        } />

        {/* Space Routes */}
        <Route path="s/:spaceSlug" element={
          <Routes>
            <Route path="posts/*" element={<PostsSpace />} />
            <Route path="events/*" element={<EventsSpace />} />
            <Route path="courses/*" element={<CoursesSpace />} />
            <Route path="chat/*" element={<ChatSpace />} />
            <Route path="members/*" element={<MembersSpace />} />
            <Route path="*" element={<Navigate to="." replace />} />
          </Routes>
        } />
      </Routes>
    </div>
  );
}
