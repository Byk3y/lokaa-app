// HMR TEST COMMENT A: Test completed - HMR optimizations active
import React, { lazy, Suspense, useState, useEffect, useRef, useCallback, useMemo, memo } from 'react';
import { motion } from "framer-motion";
import { Loader2, Tag, AlertTriangle, RefreshCw, MessageSquare, Users, Calendar, Search, Filter, Pin, Plus, ChevronDown } from "lucide-react";

// HMR OPTIMIZATION: Group core UI and business logic imports
import { Button } from "@/components/ui/button";
import { useToast } from '@/hooks/use-toast';
import { useFeedLogic } from "@/hooks/useFeedLogic";
import { useOptimizedMemberCounts } from "@/hooks/useOptimizedMemberCounts";
import { getSupabaseClient } from "@/integrations/supabase/client";

// HMR OPTIMIZATION: Group type and utility imports
import type { FeedTabProps } from "@/types/feedTypes";
export type { FetchedPostType } from "@/types/feedTypes";
import { getCategoryDisplayName } from "@/utils/feedUtils";

// HMR OPTIMIZATION: Group stable component imports (less likely to change)
import SpaceInfoSidebar from "./SpaceInfoSidebar";
import FeedHeader from "./FeedHeader";
import PostCard from "./PostCard";
import PostsPagination from './PostsPagination';
import { NewPostNotification } from "@/components/feed/NewPostNotification";

// HMR OPTIMIZATION: Lazy load heavy/modal components to reduce initial bundle and HMR cascades
const SimpleSpaceSetup = lazy(() => import("./SimpleSpaceSetup"));
const CreatePostModal = lazy(() => import("@/features/posts/components/CreatePostModal").then(module => ({ default: module.CreatePostModal })));
const PostDetailModal = lazy(() => import("@/components/space/post-detail/PostDetailModal"));
const CreateCategoryModal = lazy(() => import("@/components/space/CreateCategoryModal"));

// Preserved space data is now handled by individual components

export default function FeedTab({ user: userProp, isOwner: isOwnerProp, isAdmin: isAdminProp, postInputRef, hasInstantAccess }: FeedTabProps) {
  
  // 🧪 HMR TEST COMMENT: Testing HMR optimization effectiveness (Test 3A)
  // ============================================================================
  // BUSINESS LOGIC HOOK - All state and handlers extracted here
  // ============================================================================
  
  const {
    // Core data
    currentUser,
    currentSpaceData,
    fetchedPosts,
    pinnedPosts,
    spaceCategories,
    
    // Loading states
    authLoading,
    storeLoadingSpace,
    postsLoading,
    categoriesLoading,
    postsError,
    categoriesError,
    
    // Permissions
    effectivePermissions,
    
    // UI State
    selectedTab,
    
    // Modal states
    modalStates,
    
    // Real-time state
    realtimeState,
    
    // Computed values
    filteredPinnedPosts,
    filteredRegularPosts,
    postsToShow,
    userNameForModal,
    userAvatarForModal,
    
    // Pagination
    totalCount,
    currentPage,
    totalPages,
    hasNextPage,
    
    // Action handlers
    handleTabSelect,
    handlePostCardClick,
    handlePinToggled,
    handleLikeToggledInCard,
    handleCommentAddedInModal,
    handlePostUpdated,
    handlePostDeleted,
    handlePostCreated,
    
    // Modal handlers
    handleClosePostModal,
    openCreatePostModal,
    closeCreatePostModal,
    openCategoryModal,
    closeCategoryModal,
    
    // Real-time handlers
    handleLoadNewPosts,
    handleDismissNotification,
    clearNewPosts,
    
    // Utility functions
    mapPostToCardProps,
    refetchPosts,
    loadPage,
    refreshCategories,
  } = useFeedLogic({ 
    user: userProp, 
    isOwner: isOwnerProp, 
    isAdmin: isAdminProp, 
    postInputRef,
    hasInstantAccess
  });

  // ============================================================================
  // FALLBACK SPACE DATA FOR SIDEBAR
  // ============================================================================
  
  // Create fallback space data when currentSpaceData is null but we have access
  const fallbackSpaceData = React.useMemo(() => {
    if (currentSpaceData) return null; // Use real data when available
    
    // Extract subdomain from URL as fallback
    const pathname = window.location.pathname;
    const subdomainMatch = pathname.match(/\/([^\/]+)\/space/);
    const urlSubdomain = subdomainMatch?.[1] || 'space';
    
    // PHASE 1 FIX: Enhanced fallback with immediate hardcoded data to prevent flashing
    let cachedSpaceData = null;
    
    // PRIORITY 1: Hardcoded fallback for known spaces (prevents any flashing)
    if (urlSubdomain === 'nocode-architects') {
      cachedSpaceData = {
        id: '235e68d1-89df-4d2d-8945-e7756d60de20',
        name: 'Nocode Devils',
        subdomain: 'nocode-architects',
        description: 'A space for nocode developers and enthusiasts',
        icon_image: null,
        cover_image: null,
        is_private: false
      };
      console.log(`🔒 [Phase1] Using hardcoded fallback for ${urlSubdomain}`);
    }
    
    // PRIORITY 2: Try multiple cache sources for space data
    if (!cachedSpaceData) {
      // 1. Try lastActiveSpace cache
      try {
        const lastActiveSpace = localStorage.getItem('lastActiveSpace');
        if (lastActiveSpace) {
          const parsed = JSON.parse(lastActiveSpace);
          if (parsed.subdomain === urlSubdomain) {
            const cacheAge = Date.now() - (parsed.timestamp || 0);
            const maxCacheAge = 24 * 60 * 60 * 1000; // 24 hours
            if (cacheAge < maxCacheAge && parsed.data) {
              cachedSpaceData = {
                id: parsed.data.id as string,
                name: parsed.data.name as string,
                subdomain: parsed.data.subdomain as string,
                description: (parsed.data.description as string) || null,
                icon_image: (parsed.data.icon_image as string) || null,
                cover_image: (parsed.data.cover_image as string) || null,
                is_private: (parsed.data.is_private as boolean) || false
              };
              console.log(`🔒 [Phase1] Using lastActiveSpace cache for ${urlSubdomain}`);
            }
          }
        }
      } catch (e) {
        console.warn('[FeedTab] Failed to read lastActiveSpace cache:', e);
      }
      
      // 2. Try space_fallback_${subdomain} cache
      if (!cachedSpaceData) {
        try {
          const persistentCache = localStorage.getItem(`space_fallback_${urlSubdomain}`);
          if (persistentCache) {
            const parsed = JSON.parse(persistentCache);
            const cacheAge = Date.now() - (parsed.timestamp || 0);
            const maxCacheAge = 24 * 60 * 60 * 1000; // 24 hours
            if (cacheAge < maxCacheAge && parsed.data) {
              cachedSpaceData = {
                id: parsed.data.id as string,
                name: parsed.data.name as string,
                subdomain: parsed.data.subdomain as string,
                description: (parsed.data.description as string) || null,
                icon_image: (parsed.data.icon_image as string) || null,
                cover_image: (parsed.data.cover_image as string) || null,
                is_private: (parsed.data.is_private as boolean) || false
              };
              console.log(`🔒 [Phase1] Using persistent cache for ${urlSubdomain}`);
            }
          }
        } catch (e) {
          console.warn('[FeedTab] Failed to read persistent cache:', e);
        }
      }
    }

    // Return the best available fallback data - only for known spaces with real UUIDs
    if (cachedSpaceData) {
      return cachedSpaceData;
    }
    
    // CRITICAL FIX: Only provide fallback for spaces with known real UUIDs
    if (urlSubdomain === 'nocode-architects') {
      return {
        id: '235e68d1-89df-4d2d-8945-e7756d60de20',
        name: 'Nocode Devils',
        subdomain: urlSubdomain,
        description: null,
        icon_image: null,
        cover_image: null,
        is_private: false
      };
    }
    
    if (urlSubdomain === 'music-business') {
      return {
        id: '987e5232-68a8-4d1c-88be-e6f77a5e93fd',
        name: 'Music Business',
        subdomain: urlSubdomain,
        description: null,
        icon_image: null,
        cover_image: null,
        is_private: false
      };
    }
    
    // For unknown spaces, return null to prevent invalid database queries
    console.warn(`⚠️ [FeedTab] No fallback data available for ${urlSubdomain} - returning null`);
    return null;
  }, [currentSpaceData]);
  
  // Use optimized member counts hook for real-time data
  const spaceIdForCounts = currentSpaceData?.id || fallbackSpaceData?.id || '';
  const memberCounts = useOptimizedMemberCounts(spaceIdForCounts);
  
  // PHASE 1.5 FIX: Ensure sidebarSpaceData ALWAYS provides space name
  const sidebarSpaceData = React.useMemo(() => {
    // PRIORITY 1: Use real current space data when available
    if (currentSpaceData) {
      console.log(`🔒 [Phase1.5] Using real space data for sidebar: ${currentSpaceData.name}`);
      return currentSpaceData;
    }
    
    // PRIORITY 2: Use fallback data - but ensure it's never null
    const fallback = fallbackSpaceData;
    if (fallback) {
      console.log(`🔒 [Phase1.5] Using fallback space data for sidebar: ${fallback.name}`);
      return fallback;
    }
    
    // PRIORITY 3: Emergency hardcoded fallback to prevent null sidebar
    const pathname = window.location.pathname;
    const subdomainMatch = pathname.match(/\/([^\/]+)\/space/);
    const urlSubdomain = subdomainMatch?.[1] || 'space';
    
    // CRITICAL FIX: Only provide emergency fallback for known spaces with real UUIDs
    if (urlSubdomain === 'nocode-architects') {
      const emergencyFallback = {
        id: '235e68d1-89df-4d2d-8945-e7756d60de20',
        name: 'Nocode Devils',
        subdomain: urlSubdomain,
        description: 'a space to build and learn together and grow',
        icon_image: 'https://nmddvthcsyppyjncqfsk.supabase.co/storage/v1/object/public/space-icons/235e68d1-89df-4d2d-8945-e7756d60de20_1747910766771_Generated_Image_March_26__2025_-_9_20AM_png.jpeg',
        cover_image: 'https://nmddvthcsyppyjncqfsk.supabase.co/storage/v1/object/public/space-covers/235e68d1-89df-4d2d-8945-e7756d60de20_1747911651153_Untitled.png',
        is_private: false
      };
      console.log(`🚨 [Phase1.5] Using EMERGENCY fallback for sidebar: ${emergencyFallback.name}`);
      return emergencyFallback;
    }
    
    if (urlSubdomain === 'music-business') {
      const emergencyFallback = {
        id: '987e5232-68a8-4d1c-88be-e6f77a5e93fd',
        name: 'Music Business',
        subdomain: urlSubdomain,
        description: 'A community for music business professionals',
        icon_image: null,
        cover_image: null,
        is_private: false
      };
      console.log(`🚨 [Phase1.5] Using EMERGENCY fallback for sidebar: ${emergencyFallback.name}`);
      return emergencyFallback;
    }
    
    if (urlSubdomain === 'nextpath-ai') {
      const emergencyFallback = {
        id: 'cc18c511-9b54-4e14-8abc-75b8c800c39d',
        name: 'Nextpath AI',
        subdomain: urlSubdomain,
        description: 'AI-powered learning and development community',
        icon_image: null,
        cover_image: null,
        is_private: false
      };
      console.log(`🚨 [Phase1.5] Using EMERGENCY fallback for sidebar: ${emergencyFallback.name}`);
      return emergencyFallback;
    }
    
    // For unknown spaces, return null to prevent invalid database queries
    console.warn(`⚠️ [Phase1.5] No emergency fallback available for ${urlSubdomain} - returning null`);
    return null;
  }, [currentSpaceData, fallbackSpaceData]);

  // ============================================================================
  // LOADING STATE & ERRORS
  // ============================================================================

  // ENHANCED: Detect if space data is actually available through posts loading
  // If posts are successfully fetching, it means space ID is available even if currentSpaceData is null
  const spaceDataAvailableViaPostsLoading = !postsError && (postsLoading || fetchedPosts.length > 0);
  const categoriesDataAvailable = !categoriesError && (categoriesLoading || spaceCategories.length > 0);
  const hasDataIndicators = spaceDataAvailableViaPostsLoading || categoriesDataAvailable;
  
  // Note: Preserved space data functionality has been simplified
  const pathname = window.location.pathname;
  const subdomainMatch = pathname.match(/\/([^\/]+)\/space/);
  const urlSubdomain = subdomainMatch?.[1];
  const hasPreservedData = false; // Simplified - no longer using preserved data
  
  // REDUCED: Only log critical state changes, not every render
  if (process.env.NODE_ENV === 'development' && (postsError || categoriesError || (!hasInstantAccess && !currentSpaceData && !hasDataIndicators && !hasPreservedData))) {
    console.log('🐛 [FeedTab] Critical state check:', {
      currentSpaceData: !!currentSpaceData,
      hasInstantAccess: !!hasInstantAccess,
      postsError: !!postsError,
      categoriesError: !!categoriesError,
      hasPreservedData,
      willShowLoading: !currentSpaceData && !hasDataIndicators && !hasInstantAccess && !hasPreservedData
    });
  }
  
  // MOBILE OPTIMIZATION: Much more aggressive about showing content
  // Trust that SpaceProtectedRoute has verified access and wouldn't render us otherwise
  // This prevents loading flashes on mobile
  // **CRITICAL FIX**: Also check for preserved data to prevent loading flash during external navigation
  const shouldShowLoadingState = (!currentSpaceData && !hasDataIndicators && !hasInstantAccess && !hasPreservedData && (authLoading || storeLoadingSpace));
  
  if (shouldShowLoadingState) {
    // Only show loading if absolutely necessary - minimizes loading flashes
    return <div className="p-4 text-center">Loading feed...</div>;
  }



  // ============================================================================
  // RENDER JSX - Pure presentation logic
  // ============================================================================
  
  return (
    <div className="flex flex-col lg:flex-row gap-x-8 gap-y-4">
      {/* URL Post Loading Overlay */}
      {modalStates.isLoadingUrlPost && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 flex items-center space-x-4">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <span className="text-lg font-medium">Loading post...</span>
          </div>
        </div>
      )}

      {/* URL Post Error Display */}
      {modalStates.urlPostError && !modalStates.isLoadingUrlPost && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md">
            <h3 className="text-lg font-semibold text-red-600 mb-2">Post Not Found</h3>
            <p className="text-gray-600 mb-4">{modalStates.urlPostError}</p>
            <div className="flex space-x-3">
              <button 
                onClick={() => window.location.href = `/${currentSpaceData?.subdomain || window.location.pathname.split('/')[1]}/space`}
                className="px-4 py-2 bg-primary text-white rounded hover:bg-primary/90"
              >
                Return to Feed
              </button>
              <button 
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
              >
                Retry
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Feed Content */}
      <div className="flex-grow">
        {/* Render FeedHeader once, it will handle its own responsiveness */}
        <FeedHeader
          currentUser={currentUser}
          onOpenCreatePostModal={openCreatePostModal}
        />

        {/* Category Tabs - Standalone Pills (sticky only on desktop) */}
        <div className="mt-6">
          <div className="flex items-center space-x-2 overflow-x-auto pb-1 px-4 sm:px-0" role="tablist">
            <motion.button 
              role="tab"
              aria-selected={selectedTab === "all"}
              onClick={() => handleTabSelect("all")}
              className={`flex-shrink-0 px-3 py-3 rounded-full text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/70 focus-visible:ring-offset-1 whitespace-nowrap ${selectedTab === "all" 
                  ? 'bg-primary text-white' 
                  : 'bg-gray-200 text-primary hover:bg-primary/10 hover:text-primary-dark dark:bg-gray-700 dark:text-primary dark:hover:bg-primary/20'
              }`}
            >
              All
            </motion.button>
            
            {spaceCategories.map((category) => (
              <motion.button 
                  key={category.id}
                  role="tab"
                  aria-selected={selectedTab === category.id}
                  onClick={() => handleTabSelect(category.id)}
                  className={`flex-shrink-0 px-3 py-3 rounded-full text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/70 focus-visible:ring-offset-1 whitespace-nowrap ${selectedTab === category.id
                    ? 'bg-primary text-white' 
                    : 'bg-gray-200 text-primary hover:bg-primary/10 hover:text-primary-dark dark:bg-gray-700 dark:text-primary dark:hover:bg-primary/20'
                }`}
                  disabled={categoriesLoading}
                  style={{ opacity: categoriesLoading ? 0.7 : 1 }}
              >
                {category.icon && <span className="mr-1 sm:mr-1.5">{category.icon}</span>}
                {category.name}
              </motion.button>
            ))}
            
            {(effectivePermissions.effectiveIsOwner || effectivePermissions.effectiveIsAdmin) && (
              <motion.button 
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.98 }}
                className="flex-shrink-0 flex items-center justify-center px-3 py-2 rounded-full text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-1 whitespace-nowrap"
                onClick={openCategoryModal}
              >
                <Tag className="h-4 w-4 mr-1 sm:mr-1.5" />
                Edit
              </motion.button>
            )}
          </div>
        </div>

        {/* Render SimpleSpaceSetup here - only for admins/owners */}
        {currentSpaceData && (effectivePermissions.effectiveIsOwner || effectivePermissions.effectiveIsAdmin) && (
          <div className="mt-6 sm:px-0">
            <Suspense fallback={<div className="p-4 text-center text-gray-500">Loading setup guide...</div>}>
              <SimpleSpaceSetup 
                spaceId={currentSpaceData.id}
                spaceName={currentSpaceData.name}
                spaceSubdomain={currentSpaceData.subdomain}
                isOwner={effectivePermissions.effectiveIsOwner}
                isAdmin={effectivePermissions.effectiveIsAdmin}
                hasAnyPosts={fetchedPosts.length > 0 || pinnedPosts.length > 0}
                onCreatePost={() => {
                  if (postInputRef?.current) {
                    postInputRef.current.focus();
                  } else {
                    openCreatePostModal();
                  }
                }} 
              />
            </Suspense>
          </div>
        )}
        
        {/* Real-time New Posts Notification - appears at very top above first post */}
        <NewPostNotification
          newPostCount={realtimeState.newPostCount}
          isLoading={realtimeState.isLoadingNewPosts}
          isVisible={!realtimeState.isDismissed && realtimeState.newPostCount > 0}
          onLoadPosts={() => handleLoadNewPosts(realtimeState.newPostIds)}
          onDismiss={handleDismissNotification}
        />

        {/* Pinned Posts - Only visible to admins/owners */}
        {!postsLoading && !postsError && filteredPinnedPosts.length > 0 && selectedTab === "all" && (effectivePermissions.effectiveIsOwner || effectivePermissions.effectiveIsAdmin) && (
          <div className="space-y-4 mt-6">
            <div className="space-y-4">
              {filteredPinnedPosts
                .sort((a, b) => {
                  // Sort by pin_position (lower number = higher priority, position 1 is at top)
                  if (a.pin_position !== null && b.pin_position !== null) {
                    return a.pin_position - b.pin_position;
                  }
                  // Fallback to pinned_at for posts without position (newest first)
                  if (a.pinned_at && b.pinned_at) {
                    return new Date(b.pinned_at).getTime() - new Date(a.pinned_at).getTime();
                  }
                  return 0;
                })
                .map((post, index) => (
                  <PostCard
                    key={`pinned-${post.id}`}
                    {...mapPostToCardProps(post)}
                    isPinned={true}
                    isAdmin={effectivePermissions.effectiveIsAdmin || effectivePermissions.effectiveIsOwner}
                    onPostClick={handlePostCardClick}
                    onLikeToggled={handleLikeToggledInCard}
                    onPinToggled={handlePinToggled}
                  />
                ))}
            </div>
          </div>
        )}
        
        {/* Category-specific Pinned Posts - Only visible to admins/owners */}
        {!postsLoading && !postsError && filteredPinnedPosts.length > 0 && selectedTab !== "all" && (effectivePermissions.effectiveIsOwner || effectivePermissions.effectiveIsAdmin) && (
          <div className="space-y-4 mt-6">
            <div className="space-y-4">
              {filteredPinnedPosts
                .sort((a, b) => {
                  // Sort by pin_position (lower number = higher priority, position 1 is at top)
                  if (a.pin_position !== null && b.pin_position !== null) {
                    return a.pin_position - b.pin_position;
                  }
                  // Fallback to pinned_at for posts without position (newest first)
                  if (a.pinned_at && b.pinned_at) {
                    return new Date(b.pinned_at).getTime() - new Date(a.pinned_at).getTime();
                  }
                  return 0;
                })
                .map((post, index) => (
                  <PostCard
                    key={`pinned-${post.id}`}
                    {...mapPostToCardProps(post)}
                    isPinned={true}
                    isAdmin={effectivePermissions.effectiveIsAdmin || effectivePermissions.effectiveIsOwner}
                    onPostClick={handlePostCardClick}
                    onLikeToggled={handleLikeToggledInCard}
                    onPinToggled={handlePinToggled}
                  />
                ))}
            </div>
          </div>
        )}
        
        {/* Regular Posts List */}
        {/* **REAPPEARING FIX**: Never show loading when posts exist - prevents Chat→Feed reappearing */}
        {(postsLoading && fetchedPosts.length === 0 && pinnedPosts.length === 0) && (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground text-center">
              {(() => {
                // Fix: Only use user agent for mobile detection, not window width
                const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
                const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
                const isHardRefresh = performance.navigation?.type === 1 || 
                                     (performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming)?.type === 'reload';
                const hasCache = fetchedPosts.length > 0 || pinnedPosts.length > 0;
                
                if (isHardRefresh && isMobile && isSafari) {
                  return 'Connecting to Safari...';
                }
                
                if (isHardRefresh && isMobile) {
                  return 'Restoring connection...';
                }
                
                if (hasCache) {
                  return 'Refreshing posts...';
                }
                
                if (isMobile && isSafari) {
                  return 'Loading posts for Safari...';
                }
                
                return 'Loading posts...';
              })()}
            </p>
            {(() => {
              // Fix: Only use user agent for mobile detection, not window width
              const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
              const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
              const isHardRefresh = performance.navigation?.type === 1 || 
                                   (performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming)?.type === 'reload';
              
              if (isHardRefresh && isMobile && isSafari) {
                return (
                  <p className="text-xs text-gray-400 mt-2 max-w-sm text-center">
                    Safari mobile needs extra time to establish secure connections.
                  </p>
                );
              }
              
              if (isHardRefresh && isMobile) {
                return (
                  <p className="text-xs text-gray-400 mt-2 max-w-sm text-center">
                    Mobile browsers need extra time to reconnect after refresh.
                  </p>
                );
              }
              return null;
            })()}
          </div>
        )}
        
        {!postsLoading && postsError && (
          <div className="p-6 text-center mt-6 bg-red-50 border border-red-200 rounded-lg mx-4 sm:mx-0">
            <div className="text-red-600 mb-3">
              <AlertTriangle className="h-8 w-8 mx-auto mb-2" />
              <p className="font-medium">
                {postsError.includes('timeout') ? 'Network Timeout' : 'Failed to load posts'}
              </p>
              <p className="text-sm text-red-500 mt-1">
                {postsError.includes('timeout') 
                  ? 'Your connection is slow. Please try again.' 
                  : postsError
                }
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 justify-center">
              <Button 
                onClick={() => refetchPosts(true)}
                variant="outline"
                size="sm"
                className="border-red-300 text-red-600 hover:bg-red-50"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </Button>
              {postsError.includes('timeout') && (
                <Button 
                  onClick={() => window.location.reload()}
                  variant="outline"
                  size="sm"
                  className="border-blue-300 text-blue-600 hover:bg-blue-50"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Reload Page
                </Button>
              )}
            </div>
          </div>
        )}
        
        {/* Only show "No posts yet" when we're sure there are no posts and not loading and no instant access */}
        {!postsLoading && !postsError && fetchedPosts.length === 0 && pinnedPosts.length === 0 && !hasInstantAccess && (
          <div className="p-4 text-center text-gray-500 mt-6 px-4 sm:px-0">No posts yet. Be the first to share something!</div>
        )}
        {!postsLoading && !postsError && (fetchedPosts.length > 0 || pinnedPosts.length > 0) && (
          <div className="space-y-4 mt-6">
            {(() => {
              // Filter by selected category and render using postsToShow computed value
              return postsToShow
                .filter(post => selectedTab === "all" || post.category?.id === selectedTab)
                .map(post => (
                  <PostCard
                    key={post.id}
                    {...mapPostToCardProps(post)}
                    isAdmin={effectivePermissions.effectiveIsAdmin || effectivePermissions.effectiveIsOwner}
                    onPostClick={handlePostCardClick}
                    onLikeToggled={handleLikeToggledInCard}
                    onPinToggled={handlePinToggled}
                  />
                ));
            })()}
            
            {/* Pagination Component - Only show when there are more than 30 posts */}
            {totalCount > 30 && (
              <PostsPagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalCount={totalCount}
                postsPerPage={30}
                onPageChange={loadPage}
                isLoading={postsLoading}
              />
            )}
          </div>
        )}
      </div>

      {/* Sidebar - with fallback space data when currentSpaceData is null */}
      {sidebarSpaceData && (
        <div className="hidden lg:block w-[273px] flex-shrink-0">
          <SpaceInfoSidebar 
            spaceName={sidebarSpaceData.name || 'Space'}
            spaceDescription={sidebarSpaceData.description || undefined}
            spaceIcon={sidebarSpaceData.icon_image || undefined}
            coverImage={sidebarSpaceData.cover_image || undefined}
            isPrivate={sidebarSpaceData.is_private || false}
            canAccessSettings={effectivePermissions.canAccessSettings}
            subdomain={sidebarSpaceData.subdomain || 'space'} 
            spaceId={sidebarSpaceData.id || ''} 
            isOwner={effectivePermissions.effectiveIsOwner || false}
            isMember={!!currentUser} // If user is viewing feed, they're likely a member
            memberCount={memberCounts.totalMembers}
            adminCount={memberCounts.adminMembers}
          />
        </div>
      )}
      
      {/* Create Post Modal */}
      {modalStates.isCreatePostOpen && currentSpaceData && (
        <Suspense fallback={<div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"><div className="text-white">Loading...</div></div>}>
          <CreatePostModal
            isOpen={modalStates.isCreatePostOpen}
            onClose={closeCreatePostModal}
            spaceId={currentSpaceData.id}
            currentUserId={currentUser?.id || ''} 
            onPostCreated={handlePostCreated}
            spaceName={currentSpaceData.name || 'Current Space'}
            userName={currentUser?.user_metadata?.full_name || currentUser?.user_metadata?.name || currentUser?.email || 'User'}
            userAvatarUrl={currentUser?.user_metadata?.avatar_url}
          />
        </Suspense>
      )}
      
      {/* Create Category Modal */}
      {currentSpaceData && (
        <Suspense fallback={<div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"><div className="text-white">Loading...</div></div>}>
          <CreateCategoryModal
            isOpen={modalStates.isCategoryOpen}
            onClose={closeCategoryModal}
            spaceId={currentSpaceData.id}
            userId={currentUser.id}
            onCategoryCreated={() => {
              closeCategoryModal();
              refreshCategories();
            }}
          />
        </Suspense>
      )}
      
      {/* Post Detail Modal */}
      {modalStates.isPostDetailOpen && modalStates.selectedPostForModal && (
        <Suspense fallback={<div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"><div className="text-white">Loading...</div></div>}>
          <PostDetailModal
            isOpen={modalStates.isPostDetailOpen}
            onClose={handleClosePostModal}
            post={modalStates.selectedPostForModal}
            onCommentAdded={handleCommentAddedInModal}
            onPinToggled={handlePinToggled}
            onPostUpdated={handlePostUpdated}
            onPostDeleted={handlePostDeleted}
            onLikeToggled={handleLikeToggledInCard}
          />
        </Suspense>
      )}
    </div>
  );
} 