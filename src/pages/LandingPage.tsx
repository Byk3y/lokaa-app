import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import PublicRoute from "@/components/auth/PublicRoute";
import { Search, Menu, ChevronDown, ChevronUp, Plus, Compass, Apple, Play, X } from "lucide-react";
import CategoriesFilter from "@/components/spaces/CategoriesFilter";
import SpaceCardGrid from "@/components/spaces/SpaceCardGrid";
import useSpacesData from "@/hooks/useSpacesData";
import DottedBackground from "@/components/ui/DottedBackground";
import { SpacePreviewModal } from "@/components/modals/SpacePreviewModal";
import { useSpacePreviewStore } from "@/stores/useSpacePreviewStore";

// Categories for the discovery section - refined selection for desktop view
const categories = [
  { id: 'all', label: 'All', icon: '•' },
  { id: 'hobbies', label: 'Hobbies', icon: '🎨' },
  { id: 'music', label: 'Music', icon: '🎵' },
  { id: 'money', label: 'Money', icon: '💰' },
  { id: 'tech', label: 'Tech', icon: '💻' },
  { id: 'health', label: 'Health', icon: '🏥' },
  { id: 'sports', label: 'Sports', icon: '⚽' },
  { id: 'relationships', label: 'Relationships', icon: '❤️' },
  // Mobile-only categories (will be hidden on desktop)
  { id: 'self-improvement', label: 'Self-improvement', icon: '📚', mobileOnly: true },
  { id: 'spirituality', label: 'Spirituality', icon: '🙏', mobileOnly: true },
  { id: 'global', label: 'Global', icon: '🌍', mobileOnly: true },
];

export default function LandingPage() {
  const { user } = useAuth();
  const [navMenuOpen, setNavMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  
  // Use our spaces data hook, but add safety measures
  const { 
    filteredSpaces = [], 
    isLoading = true, 
    activeCategory = 'all', 
    setActiveCategory = () => {}, 
    searchQuery = '', 
    setSearchQuery = () => {} 
  } = useSpacesData() || {};
  
  // Check for showAuthModal state and display the appropriate modal
  useEffect(() => {
    if (location.state?.showAuthModal) {
      const modalType = location.state.showAuthModal;
      console.log('LandingPage: Showing auth modal:', modalType);
      setTimeout(() => {
        if (modalType === 'login') {
          window.showDirectLoginModal();
        } else if (modalType === 'signup') {
          window.showDirectSignupModal();
        } else if (modalType === 'forgot') {
          window.showDirectForgotPasswordModal();
        }
      }, 100);
    }
  }, [location.state]);
  
  const toggleNavMenu = () => {
    setNavMenuOpen(!navMenuOpen);
    // Prevent body scroll when menu is open
    if (!navMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
  };
  
  // Cleanup effect to restore scroll when component unmounts
  useEffect(() => {
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, []);

  // Helper function to render sign-in button
  const renderSignInButton = (isMobile = false) => {
    const handleSignIn = (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      
      // Call the global function we exposed from Discover.tsx
      // @ts-ignore - showDirectLoginModal exists on window
      if (typeof window.showDirectLoginModal === 'function') {
        console.log("LandingPage: calling showDirectLoginModal");
        // @ts-ignore
        window.showDirectLoginModal(e);
      } else {
        console.error("LandingPage: showDirectLoginModal function not found on window");
        // Fallback to /login if the function isn't available
        window.location.href = '/login';
      }
    };
    
    // Return a button instead of a Link
    return (
      <button 
        onClick={handleSignIn}
        className={isMobile 
          ? "bg-teal-600 hover:bg-teal-700 text-white px-4 py-1.5 rounded-full font-medium transition-colors text-sm"
          : "bg-teal-600 hover:bg-teal-700 text-white px-5 py-1.5 rounded-full font-medium transition-colors text-sm"
        }
      >
        Sign In
      </button>
    );
  };

  // Helper function to handle "Launch your own space" button
  const handleLaunchSpace = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Show signup modal instead of navigating
    if (typeof window.showDirectSignupModal === 'function') {
      window.showDirectSignupModal(e);
    } else {
      console.error("LandingPage: showDirectSignupModal function not found on window");
      // Fallback to direct navigation if function isn't available
      window.location.href = '/signup';
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // Search is handled by the useEffect in the useSpacesData hook
  };

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      {/* Header/Navigation - simplified and more compact */}
      <header className="bg-white border-b border-gray-100 shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 md:px-6">
          {/* Mobile Navigation - restructured to match Skool */}
          <div className="flex items-center justify-between md:hidden py-1">
            {/* Left side: Hamburger and Logo */}
            <div className="flex items-center gap-2">
              {/* Mobile Hamburger Menu */}
              <button 
                className="text-gray-700 p-1"
                onClick={toggleNavMenu}
                aria-label="Open navigation menu"
              >
                <Menu size={24} strokeWidth={1.5} />
              </button>
              
              {/* Logo - next to hamburger */}
              <h1 className="text-4xl font-bold leading-none" style={{ color: '#00A389' }}>Lokaa</h1>
            </div>
            
            {/* Sign In - right aligned */}
            {user ? (
              <Link 
                to="/app" 
                className="bg-teal-600 hover:bg-teal-700 text-white px-5 py-1.5 rounded-full font-medium transition-colors text-sm"
              >
                Go to My Spaces
              </Link>
            ) : (
              renderSignInButton(true)
            )}
          </div>
          
          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center justify-between w-full py-2">
            {/* Logo with dropdown - left-aligned */}
            <div className="flex items-center">
              <h1 className="text-4xl font-bold leading-none" style={{ color: '#00A389' }}>Lokaa</h1>
              
              {/* Desktop Dropdown Trigger */}
              <button 
                className="flex items-center text-gray-400 hover:text-gray-600 transition-colors ml-0.5"
                onClick={toggleNavMenu}
                aria-expanded={navMenuOpen}
              >
                {navMenuOpen ? (
                  <ChevronUp size={15} strokeWidth={2} />
                ) : (
                  <ChevronDown size={15} strokeWidth={2} />
                )}
              </button>
            </div>
            
            {/* Sign In - right-aligned */}
            {user ? (
              <Link 
                to="/app" 
                className="bg-teal-600 hover:bg-teal-700 text-white px-5 py-1.5 rounded-full font-medium transition-colors text-sm"
              >
                Go to My Spaces
              </Link>
            ) : (
              renderSignInButton(false)
            )}
          </div>
        </div>
      </header>

      {/* Mobile Sidebar Menu */}
      {/* Overlay - only visible when menu is open */}
      {navMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/20 z-40 md:bg-black/10"
          onClick={toggleNavMenu}
        />
      )}
      
      {/* Sidebar - slide in from left */}
      <div 
        className={`fixed top-0 left-0 w-72 h-full bg-white shadow-lg transform transition-transform duration-300 ease-in-out z-50 ${
          navMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Close button */}
        <div className="flex justify-between items-center p-5 border-b border-gray-100">
          <h2 className="text-xl font-bold text-gray-800">Menu</h2>
          <button 
            onClick={toggleNavMenu}
            className="text-gray-500 hover:text-gray-800 transition-colors"
          >
            <X size={20} />
          </button>
            </div>
            
        {/* Menu links */}
        <nav className="py-4">
          <ul>
            <li className="px-5 py-2">
            <Link 
                to="/" 
                className="flex items-center text-gray-700 hover:text-teal-600"
                onClick={toggleNavMenu}
            >
                <span className="text-lg">Home</span>
            </Link>
            </li>
            <li className="px-5 py-2">
            <Link 
              to="/discover?force=discover" 
                className="flex items-center text-gray-700 hover:text-teal-600"
                onClick={toggleNavMenu}
              >
                <Compass className="mr-2 h-5 w-5" />
                <span className="text-lg">Discover</span>
              </Link>
            </li>
            <li className="px-5 py-2">
              <Link 
                to="/signup" 
                className="flex items-center text-gray-700 hover:text-teal-600"
                onClick={toggleNavMenu}
              >
                <Plus className="mr-2 h-5 w-5" />
                <span className="text-lg">Create a Space</span>
            </Link>
            </li>
          </ul>
        </nav>
      </div>

      <main>
        <DottedBackground className="mt-6 mx-4 md:mx-8 lg:mx-12 mb-8">
          {/* Hero section with reduced empty space */}
          <section className="relative pt-8 pb-6 md:pt-12 md:pb-10">
            <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-10 text-center">
              <div className="mb-6">
                <h1 className="text-5xl md:text-6xl lg:text-8xl font-bold text-black tracking-tight leading-none">
                  Create a space,
                </h1>
                <h1 className="text-5xl md:text-6xl lg:text-8xl font-medium text-gray-300 tracking-tight leading-tight">
                  find your place
            </h1>
              </div>

              <p className="max-w-2xl mx-auto text-lg md:text-xl text-gray-600 mb-6">
                Launch a thriving online community in minutes. Engage, monetize, and grow with powerful tools.
            </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-6">
            {user ? (
              <Link
                to="/app"
                className="px-8 py-3 bg-teal-600 hover:bg-teal-700 text-white rounded-full font-medium text-lg transition-colors w-full sm:w-auto focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2"
              >
                Go to My Spaces
              </Link>
            ) : (
              <button
                onClick={handleLaunchSpace}
                className="px-8 py-3 bg-teal-600 hover:bg-teal-700 text-white rounded-full font-medium text-lg transition-colors w-full sm:w-auto focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2"
              >
                Launch your own space
              </button>
            )}
              </div>
            </div>
          
            {/* Search bar section inside the dotted background */}
            <div className="max-w-2xl mx-auto px-4 md:px-6 lg:px-10 pb-4">
              <form onSubmit={handleSearch}>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                  <input
                    type="text"
                    placeholder="Search for anything"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 rounded-full border border-gray-200 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  />
                </div>
              </form>
          </div>
          </section>
        </DottedBackground>

        {/* Categories section with reduced top margin */}
        <CategoriesFilter 
          activeCategory={activeCategory} 
          setActiveCategory={setActiveCategory} 
        />

        {/* Space cards section with reduced padding */}
        <section className="py-4 bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-10">
            {/* Show message when no spaces match filters */}
            {!isLoading && filteredSpaces.length === 0 && (
              <div className="text-center py-8">
                <p className="text-lg text-gray-600">No spaces found that match your criteria.</p>
                <button
                  onClick={handleLaunchSpace} 
                  className="inline-block mt-4 px-5 py-2 bg-teal-600 text-white rounded-full hover:bg-teal-700 transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2"
                >
                  Create a new space
                </button>
          </div>
            )}

            {/* Space cards grid */}
            <SpaceCardGrid 
              spaces={filteredSpaces} 
              isLoading={isLoading} 
            />
          </div>
        </section>

        {/* Footer section with reduced padding */}
        <footer className="bg-white border-t border-gray-100 py-6">
          <div className="max-w-7xl mx-auto px-4 md:px-6 text-center">
            <p className="text-gray-500 text-sm">© {new Date().getFullYear()} Lokaa. All rights reserved.</p>
        </div>
      </footer>
      </main>

      {/* Space Preview Modal */}
      <SpaceModalWithStore />
    </div>
  );
}

/**
 * Helper component that connects the SpacePreviewModal to the Zustand store.
 * This is part of the hybrid navigation approach used in the application:
 * 
 * 1. On the homepage, space cards open in a modal for fast browsing experience
 * 2. On the discover page, space cards navigate directly to about pages for shareable links
 * 
 * This component enables the modal approach for the homepage.
 */
function SpaceModalWithStore() {
  const navigate = useNavigate();
  const { isOpen, spaceId, close } = useSpacePreviewStore();
  
  const handleJoinSpace = (spaceId: string) => {
    // Navigate to space join page or login if not authenticated
    navigate(`/space/join/${spaceId}`);
  };
  
  return (
    <SpacePreviewModal
      open={isOpen}
      onOpenChange={(open) => !open && close()}
      spaceId={spaceId}
      onJoin={handleJoinSpace}
    />
  );
}

export function LandingPageWrapper() {
  console.log("Rendering LandingPageWrapper with PublicRoute");
  return (
    <PublicRoute 
      component={<LandingPage />} 
      redirectTo="/discover"
      forcePublic={false} 
    />
  );
} 