
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Dashboard from "./pages/Dashboard";
import DiscoverCommunities from "./pages/DiscoverCommunities";
import CreateSpace from "./pages/CreateSpace";
import SpaceSettings from "./pages/SpaceSettings";
import Profile from "./pages/Profile";
import NotFound from "./pages/NotFound";
import { AuthProvider } from "./contexts/AuthContext";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import AuthRedirect from "./components/auth/AuthRedirect";
import { useState } from "react";

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
              {/* Public marketing routes - redirect to dashboard if logged in */}
              <Route element={<AuthRedirect requireAuth={false} redirectTo="/dashboard" />}>
                <Route path="/" element={<Home />} />
                <Route path="/features" element={<Home />} />
                <Route path="/pricing" element={<Home />} />
                <Route path="/about" element={<Home />} />
              </Route>
              
              {/* Auth routes - redirect to dashboard if logged in */}
              <Route element={<AuthRedirect requireAuth={false} redirectTo="/dashboard" />}>
                <Route path="/login" element={<Login />} />
                <Route path="/signup" element={<Signup />} />
              </Route>
              
              {/* Profile page - accessible to everyone but with different views */}
              <Route path="/profile/:username" element={<Profile />} />
              
              {/* Protected Routes - require authentication */}
              <Route element={<ProtectedRoute />}>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/discover" element={<DiscoverCommunities />} />
                <Route path="/spaces/create" element={<CreateSpace />} />
                <Route path="/spaces/:spaceId/settings" element={<SpaceSettings />} />
                <Route path="/profile/edit" element={<div>Edit Profile Page</div>} />
                <Route path="/notifications" element={<div>Notifications Page</div>} />
                <Route path="/settings" element={<div>Authentication Settings Page</div>} />
              </Route>
              
              {/* Default route for logged in users */}
              <Route 
                path="/profile" 
                element={<Navigate to="/dashboard" replace />} 
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
