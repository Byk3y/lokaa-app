import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

// Pages
import LandingPage from '../pages/LandingPage';
import Login from '../pages/Login';
import Signup from '../pages/Signup';
import ForgotPassword from '../pages/ForgotPassword';
import Space from '../pages/Space';
// import SpaceContent from '../pages/SpaceContent'; // Commented out as component not found
import CreateSpace from '../pages/CreateSpace';
import CreateYourSpace from '../pages/CreateYourSpace';
import Dashboard from '../pages/Dashboard';
import Discover from '../pages/Discover';
import NotFound from '../pages/NotFound'; // Import NotFound component for error handling

function AppRoutes() {
  const { user } = useAuth();
  
  // Check if this is a direct navigation to the root URL
  const isDirectNavigation = 
    window.location.pathname === "/" && 
    (!document.referrer || !document.referrer.includes(window.location.origin));
  
  // If user is logged in, redirect to discover, but only for in-app navigation
  if (user && window.location.pathname === '/' && !isDirectNavigation) {
    console.log('Routes: User is logged in and on homepage, redirecting to discover');
    return <Navigate to="/discover" replace />;
  }
  
  // SafeRoute wrapper to provide fallback in case of component errors
  const SafeRoute = ({ element }: { element: React.ReactNode }) => {
    try {
      return <>{element}</>;
    } catch (error) {
      console.error("Route rendering error:", error);
      return <Navigate to="/discover" replace />;
    }
  };
  
  return (
    <Routes>
      {/* Public routes - except "/" which redirects logged-in users above */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      
      {/* Protected routes - redirect to login if not authenticated */}
      <Route path="/dashboard" element={user ? <Navigate to="/discover" replace /> : <Navigate to="/login" replace />} />
      <Route path="/app" element={user ? <Navigate to="/discover" replace /> : <Navigate to="/login" replace />} />
      <Route path="/creator-dashboard" element={user ? <Navigate to="/discover" replace /> : <Navigate to="/login" replace />} />
      <Route path="/discover" element={user ? <SafeRoute element={<Discover />} /> : <Navigate to="/login" replace />} />
      <Route path="/spaces" element={user ? <SafeRoute element={<Dashboard />} /> : <Navigate to="/login" replace />} />
      <Route path="/spaces/create" element={user ? <SafeRoute element={<CreateYourSpace />} /> : <Navigate to="/login" replace />} />
      {/* Commented out to prevent conflict with App.tsx route
      <Route path="/create-space" element={user ? <SafeRoute element={<CreateYourSpace />} /> : <Navigate to="/login" replace />} />
      */}

      {/* Space Routes */}
      <Route path="/space/:subdomain" element={user ? <SafeRoute element={<Space />} /> : <Navigate to="/login" replace />} />
      <Route path="/spaces/:id" element={user ? <SafeRoute element={<Space />} /> : <Navigate to="/login" replace />} />
      
      {/* Space Tab Routes */}
      <Route path="/:subdomain/space/feed" element={user ? <SafeRoute element={<Space initialTab="community" />} /> : <Navigate to="/login" replace />} />
      <Route path="/:subdomain/space/classroom" element={user ? <SafeRoute element={<Space initialTab="classroom" />} /> : <Navigate to="/login" replace />} />
      <Route path="/:subdomain/space/calendar" element={user ? <SafeRoute element={<Space initialTab="calendar" />} /> : <Navigate to="/login" replace />} />
      <Route path="/:subdomain/space/members" element={user ? <SafeRoute element={<Space initialTab="members" />} /> : <Navigate to="/login" replace />} />
      <Route path="/:subdomain/space/leaderboard" element={user ? <SafeRoute element={<Space initialTab="leaderboard" />} /> : <Navigate to="/login" replace />} />
      <Route path="/:subdomain/space/about" element={user ? <SafeRoute element={<Space initialTab="about" />} /> : <Navigate to="/login" replace />} />
      
      {/* Error handling routes */}
      <Route path="/error" element={<NotFound />} />
      <Route path="/not-found" element={<NotFound />} />
      
      {/* Temporarily comment out SpaceContent route until the component is found */}
      {/* <Route path="/space/:spaceId/content/:contentId" element={user ? <SpaceContent /> : <Navigate to="/login" replace />} /> */}
      
      {/* If no route matches, go to discover for logged-in users, home for others */}
      <Route path="*" element={user ? <Navigate to="/discover" replace /> : <Navigate to="/" replace />} />
    </Routes>
  );
}

export default AppRoutes; 