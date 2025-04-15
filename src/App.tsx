
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import DiscoverCommunities from "./pages/DiscoverCommunities";
import CreateSpace from "./pages/CreateSpace";
import SpaceSettings from "./pages/SpaceSettings";
import Profile from "./pages/Profile";
import NotFound from "./pages/NotFound";
import { AuthProvider } from "./contexts/AuthContext";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import AuthRedirect from "./components/auth/AuthRedirect";
import { useState } from "react";
import LoggedInLayout from "./components/layout/LoggedInLayout";
import CommunityHome from "./components/communities/CommunityHome";

const App = () => {
  // Move queryClient inside the component to fix hooks error
  const [queryClient] = useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <TooltipProvider>
          <AuthProvider>
            <Toaster />
            <Sonner />
            <Routes>
              {/* Public marketing routes - redirect to discover if logged in */}
              <Route element={<AuthRedirect requireAuth={false} redirectTo="/discover" />}>
                <Route path="/" element={<Home />} />
                <Route path="/features" element={<Home />} />
                <Route path="/pricing" element={<Home />} />
                <Route path="/about" element={<Home />} />
              </Route>
              
              {/* Auth routes - redirect to discover if logged in */}
              <Route element={<AuthRedirect requireAuth={false} redirectTo="/discover" />}>
                <Route path="/login" element={<Login />} />
                <Route path="/signup" element={<Signup />} />
              </Route>
              
              {/* Profile page - accessible to everyone but with different views */}
              <Route path="/profile/:username" element={<Profile />} />
              
              {/* Protected Routes with new LoggedInLayout */}
              <Route element={<ProtectedRoute />}>
                <Route element={<LoggedInLayout />}>
                  {/* Legacy redirect */}
                  <Route path="/dashboard" element={<Navigate to="/discover" replace />} />
                  
                  {/* Discover page */}
                  <Route path="/discover" element={<DiscoverCommunities />} />
                  
                  {/* Community creation */}
                  <Route path="/communities/create" element={<CreateSpace />} />
                  
                  {/* Community Routes */}
                  <Route path="/c/:communityId" element={<CommunityHome />} />
                  <Route path="/c/:communityId/feed" element={<div>Feed Page</div>} />
                  <Route path="/c/:communityId/spaces" element={<div>Spaces Page</div>} />
                  <Route path="/c/:communityId/events" element={<div>Events Page</div>} />
                  <Route path="/c/:communityId/courses" element={<div>Courses Page</div>} />
                  <Route path="/c/:communityId/members" element={<div>Members Page</div>} />
                  <Route path="/c/:communityId/settings" element={<SpaceSettings />} />
                  
                  {/* User settings */}
                  <Route path="/profile/edit" element={<div>Edit Profile Page</div>} />
                  <Route path="/notifications" element={<div>Notifications Page</div>} />
                  <Route path="/settings" element={<div>Authentication Settings Page</div>} />
                </Route>
              </Route>
              
              {/* Default route for logged in users */}
              <Route 
                path="/profile" 
                element={<Navigate to="/discover" replace />} 
              />
              
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AuthProvider>
        </TooltipProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
};

export default App;
