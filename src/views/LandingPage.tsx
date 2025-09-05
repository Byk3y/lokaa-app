import { log } from '@/utils/logger';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useOptimizedAuth } from "@/contexts/AuthContext";
import PublicRoute from "@/components/auth/PublicRoute";
import { Search, Menu, Plus, Compass, Apple, Play, X } from "lucide-react";
import CategoriesFilter from "@/components/spaces/CategoriesFilter";
import SpaceCardGrid from "@/components/spaces/SpaceCardGrid";
import useSpacesData from "@/hooks/useSpacesData";
import DottedBackground from "@/components/ui/DottedBackground";
import { SpacePreviewModal } from "@/components/modals/SpacePreviewModal";
import { useSpacePreviewStore } from "@/stores/useSpacePreviewStore";
import { useModal } from '@/shared/components/modals/hooks/useModal';
import ModernDropdownTrigger from '@/components/ModernDropdownTrigger';
import StickyNoteVisual from '@/components/ui/StickyNoteVisual';
import UpcomingActivityCard from '@/components/ui/UpcomingActivityCard';

/**
 * 🎯 LANDING PAGE TOGGLE SYSTEM
 * 
 * To switch between feature-focused content and space cards:
 * 
 * 1. ENABLE SPACE CARDS (when you have real spaces):
 *    Add to your .env file: VITE_SHOW_SPACE_CARDS=true
 * 
 * 2. DISABLE SPACE CARDS (current state - feature-focused):
 *    Remove VITE_SHOW_SPACE_CARDS from .env or set to false
 * 
 * 3. AUTOMATIC FALLBACK:
 *    If VITE_SHOW_SPACE_CARDS=true but no spaces exist, 
 *    it will automatically show feature-focused content
 */

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
  const { user } = useOptimizedAuth();
  const [navMenuOpen, setNavMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  
  // 🔥 [MODAL FIX] Use modal system for signup and login with close handlers
  const { openSignupModal, openLoginModal, openVerificationModal, openForgotPasswordModal } = useModal();
  
  // 🔥 [MODAL FIX] Track processed modal state to prevent repeated opening
  const processedModalState = useRef<string | null>(null);
  const modalOpenTimeout = useRef<NodeJS.Timeout | null>(null);
  
  // Use our spaces data hook, but add safety measures
  const { 
    filteredSpaces = [], 
    isLoading = true, 
    activeCategory = 'all', 
    setActiveCategory = () => {}, 
    searchQuery = '', 
    setSearchQuery = () => {} 
  } = useSpacesData() || {};
  
  // 🎯 [LANDING PAGE TOGGLE] Easy way to switch between feature-focused and space cards
  const SHOW_SPACE_CARDS = import.meta.env.VITE_SHOW_SPACE_CARDS === 'true' || false;
  const hasSpaces = filteredSpaces.length > 0;
  
  // 🚀 [Phase 1] CRITICAL FIX: Redirect authenticated users immediately
  useEffect(() => {
    if (user) {
      log.debug('Page', '🚀 [Phase 1] User is authenticated on landing page, redirecting to /app');
      navigate('/app', { replace: true });
    }
  }, [user, navigate]);
  
  // Handle auth routes directly from URL path
  useEffect(() => {
    const currentPath = location.pathname;
    
    // Determine modal type from URL path
    let modalType: string | null = null;
    if (currentPath === '/login') {
      modalType = 'login';
    } else if (currentPath === '/signup') {
      modalType = 'signup';
    } else if (currentPath === '/forgot-password') {
      modalType = 'forgot';
    } else if (currentPath === '/auth/confirm') {
      modalType = 'verification';
    }

    if (modalType) {
      // Prevent repeated processing of same modal type
      if (processedModalState.current === modalType) {
        return;
      }

      // Set the processed state immediately to prevent loops
      processedModalState.current = modalType;

      if (modalType === 'login') {
        openLoginModal();
      } else if (modalType === 'signup') {
        openSignupModal();
      } else if (modalType === 'forgot') {
        openForgotPasswordModal();
      } else if (modalType === 'verification') {
        openVerificationModal();
      }
    } else {
      // Clear modal states when not on auth routes
      processedModalState.current = null;
    }

    // Redirect authenticated users
    if (user && (currentPath === '/login' || currentPath === '/signup' || currentPath === '/forgot-password' || currentPath === '/auth/confirm')) {
      navigate('/app');
    }
  }, [user, location, navigate, openLoginModal, openSignupModal, openVerificationModal, openForgotPasswordModal]);

  // Reset the processed state when component unmounts or user changes
  useEffect(() => {
    processedModalState.current = null;
  }, [user]);

  // Clear processed state when location changes away from auth routes
  useEffect(() => {
    const currentPath = location.pathname;
    if (currentPath !== '/login' && currentPath !== '/signup' && currentPath !== '/forgot-password') {
      processedModalState.current = null;
    }
  }, [location.pathname]);

  // Modal close handlers for auth routes
  const handleCloseAuthModal = useCallback(() => {
    processedModalState.current = null;
    navigate('/');
  }, [navigate]);
  
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

  // Direct sign-in handler
  const handleDirectSignIn = useCallback(() => {
    openLoginModal();
  }, [openLoginModal]);

  // Direct signup handler
  const handleDirectSignUp = useCallback(() => {
    openSignupModal();
  }, [openSignupModal]);

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
              <button 
                onClick={handleDirectSignIn}
                className="bg-teal-600 hover:bg-teal-700 text-white px-5 py-1.5 rounded-full font-medium transition-colors text-sm"
              >
                Sign In
              </button>
            )}
          </div>
          
          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center justify-between w-full py-2">
            {/* Logo with dropdown - left-aligned */}
            <div className="flex items-center">
              <h1 className="text-4xl font-bold leading-none" style={{ color: '#00A389' }}>Lokaa</h1>
              
              {/* Desktop Dropdown Trigger */}
              <div 
                onClick={toggleNavMenu}
                aria-expanded={navMenuOpen}
                className="ml-1 cursor-pointer"
              >
                <ModernDropdownTrigger open={navMenuOpen} />
              </div>
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
              <button 
                onClick={handleDirectSignIn}
                className="bg-teal-600 hover:bg-teal-700 text-white px-5 py-1.5 rounded-full font-medium transition-colors text-sm"
              >
                Sign In
              </button>
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
              <button 
                onClick={() => {
                  if (user) {
                    navigate('/discover?force=discover');
                  } else {
                    openSignupModal();
                  }
                  toggleNavMenu();
                }}
                className="flex items-center text-gray-700 hover:text-teal-600 w-full text-left"
              >
                <Compass className="mr-2 h-5 w-5" />
                <span className="text-lg">Discover</span>
              </button>
            </li>
            <li className="px-5 py-2">
              <button 
                onClick={() => {
                  if (user) {
                    navigate('/create-space');
                  } else {
                    openSignupModal();
                  }
                  toggleNavMenu();
                }}
                className="flex items-center text-gray-700 hover:text-teal-600 w-full text-left"
              >
                <Plus className="mr-2 h-5 w-5" />
                <span className="text-lg">Create a Space</span>
              </button>
            </li>
          </ul>
        </nav>
      </div>

      <main>
        <DottedBackground className="mt-6 mx-4 md:mx-8 lg:mx-12 mb-8">
          {/* Hero section with reduced empty space */}
          <section className="relative pt-8 pb-6 md:pt-12 md:pb-10">
            {/* Sticky Note Visual - Left Side */}
            <div className="hidden lg:block absolute left-4 top-8 z-10">
              <StickyNoteVisual text="Highlight key ideas, and bring your space to life." />
            </div>

            {/* Upcoming Activity Card - Right Side */}
            <div className="hidden lg:block absolute right-4 top-8 z-10">
              <UpcomingActivityCard 
                title="Upcoming Activity"
                eventTitle="Weekly AMA"
                description="Q&A with the Founder"
                startTime="18:00 WAT"
              />
            </div>

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
                onClick={handleDirectSignUp}
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

        {/* Conditional Landing Page Content */}
        {SHOW_SPACE_CARDS && hasSpaces ? (
          // Show space cards when enabled and spaces exist
          <>
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
                      onClick={handleDirectSignUp} 
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
          </>
        ) : (
          // Show feature-focused content when space cards are disabled or no spaces exist
          <section className="py-16 bg-white">
            <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-10">
              <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
                Everything you need to build a thriving community
              </h2>
              
              <div className="grid md:grid-cols-3 gap-8 mb-12">
                {/* Feature 1 */}
                <div className="text-center">
                  <div className="w-16 h-16 bg-teal-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-2xl">🚀</span>
                  </div>
                  <h3 className="text-xl font-semibold mb-2">Launch in Minutes</h3>
                  <p className="text-gray-600">Create your space with our intuitive builder. No coding required.</p>
                </div>
                
                {/* Feature 2 */}
                <div className="text-center">
                  <div className="w-16 h-16 bg-teal-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-2xl">💰</span>
                  </div>
                  <h3 className="text-xl font-semibold mb-2">Monetize Your Community</h3>
                  <p className="text-gray-600">Turn your passion into profit with built-in monetization tools.</p>
                </div>
                
                {/* Feature 3 */}
                <div className="text-center">
                  <div className="w-16 h-16 bg-teal-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-2xl">📈</span>
                  </div>
                  <h3 className="text-xl font-semibold mb-2">Grow Together</h3>
                  <p className="text-gray-600">Engage members with posts, courses, and real-time interactions.</p>
                </div>
              </div>
              
              <div className="text-center">
                <button
                  onClick={handleDirectSignUp}
                  className="px-8 py-3 bg-teal-600 hover:bg-teal-700 text-white rounded-full font-medium text-lg transition-colors"
                >
                  Start Building Your Community
                </button>
              </div>
            </div>
          </section>
        )}

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
  log.debug('Page', "🎯 LandingPageWrapper: Component is being rendered!");
  log.debug('Page', "🎯 LandingPageWrapper: Current window.location:", {
    href: window.location.href,
    pathname: window.location.pathname,
    search: window.location.search,
    hash: window.location.hash
  });
  
  return (
    <PublicRoute 
      component={<LandingPage />} 
      redirectTo="/app"
      forcePublic={false} 
    />
  );
} 