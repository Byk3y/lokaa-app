import { log } from '@/utils/logger';
import { devLogger } from '@/utils/developmentLogger';
import { useEffect, memo, lazy, useMemo } from 'react';
import { useFeedLogicOptimized } from "@/hooks/useFeedLogicOptimized";



import type { FeedTabProps } from "@/types/feedTypes";
export type { FetchedPostType } from "@/types/feedTypes";

import { resetScrollForFeedNavigation } from "@/utils/scrollPositionManager";


import SpaceInfoSidebar from "./SpaceInfoSidebar";
import FeedHeader from "./FeedHeader";
// Lazy load SimpleSpaceSetup to avoid import conflict with RegularPostsList
const SimpleSpaceSetup = lazy(() => import("./SimpleSpaceSetup"));

// Extracted Feed Components
import SearchResultsList from "./feed/SearchResultsList";
import PinnedPostsList from "./feed/PinnedPostsList";
import CategoryTabs from "./feed/CategoryTabs";
import RegularPostsList from "./feed/RegularPostsList";
import FeedModals from "./feed/FeedModals";

// Search functionality imports
import { useSearchHook as useSearch } from '@/features/search/store/search-store';
import { useSearchIntegration } from '@/features/search/hooks/useSearchIntegration';



import { useMediaQuery } from '@/hooks/useMediaQuery';
import { useSpaceDataFallback } from '@/hooks/useSpaceDataFallback';



function FeedTab({ user: userProp, isOwner: isOwnerProp, isAdmin: isAdminProp, postInputRef, hasInstantAccess }: FeedTabProps) {
  // ============================================================================
  // HOOKS MUST BE AT THE TOP - CRITICAL FIX FOR HOOK ORDER ERROR
  // ============================================================================


  
  // Add mobile detection FIRST - before any conditional logic
  const isDesktop = useMediaQuery('(min-width: 1024px)'); // lg breakpoint
  
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
    postsToShow,
    
    // Pagination
    totalCount,
    currentPage,
    totalPages,
    hasNextPage,
    isLoadingMore,
    
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
    
    // Utility functions
    mapPostToCardProps,
    refetchPosts,
    loadPage,
    refreshCategories,
  } = useFeedLogicOptimized({ 
    user: userProp, 
    isOwner: isOwnerProp, 
    isAdmin: isAdminProp, 
    postInputRef,
    hasInstantAccess
  });

  // ============================================================================
  // SEARCH INTEGRATION
  // ============================================================================
  
  const {
    globalSearchQuery,
    isSearchActive,
    updateSpaceId,
  } = useSearch();
  const searchIntegration = useSearchIntegration({
    spaceId: currentSpaceData?.id || null,
    initialQuery: globalSearchQuery,
    enableURLSync: false,
    enableSuggestions: false,
  });
  const searchQuery = searchIntegration.query;
  const setSearchQuery = searchIntegration.setQuery;

  useEffect(() => {
    if (searchQuery !== globalSearchQuery) {
      setSearchQuery(globalSearchQuery);
    }
  }, [globalSearchQuery, searchQuery, setSearchQuery]);

  // ============================================================================
  // FEED STATE MANAGEMENT
  // ============================================================================
  
  // Memoized feed state - includes actual data to prevent loading spinners
  const feedState = useMemo(() => ({
    // UI State
    selectedTab,
    currentPage,
    
    // Actual Data (prevents loading spinners)
    posts: fetchedPosts,
    pinnedPosts,
    categories: spaceCategories,
    
    // Loading States (to prevent re-fetching)
    postsLoading,
    categoriesLoading,
    postsError,
    categoriesError,
    
    // Metadata
    lastUpdated: Date.now(),
    hasData: fetchedPosts.length > 0 || spaceCategories.length > 0 || pinnedPosts.length > 0
  }), [
    selectedTab, 
    currentPage, 
    fetchedPosts, 
    pinnedPosts, 
    spaceCategories, 
    postsLoading, 
    categoriesLoading, 
    postsError, 
    categoriesError
  ]);



  // Use direct state values
  const effectiveSelectedTab = selectedTab;
  const effectivePosts = fetchedPosts;
  const effectivePinnedPosts = pinnedPosts;
  const effectiveCategories = spaceCategories;
  const effectiveCurrentPage = currentPage;
  
  // Use direct loading states
  const effectivePostsLoading = postsLoading;
  const effectiveCategoriesLoading = categoriesLoading;
  

  
  // Compute filtered pinned posts using effective data
  const effectiveFilteredPinnedPosts = useMemo(() => {
    if (effectiveSelectedTab === "all") return effectivePinnedPosts;
    return effectivePinnedPosts.filter(post => post.category?.id === effectiveSelectedTab);
  }, [effectivePinnedPosts, effectiveSelectedTab]);



  // Debug posts loading state
  useEffect(() => {
    console.log(`🔍 [FeedTab] Posts loading state - postsLoading: ${postsLoading}, postsError: ${postsError}, fetchedPosts: ${fetchedPosts.length}, pinnedPosts: ${pinnedPosts.length}`);
  }, [postsLoading, postsError, fetchedPosts.length, pinnedPosts.length]);


  
  // Update search context when space changes
  useEffect(() => {
    if (currentSpaceData?.id) {
      updateSpaceId(currentSpaceData.id);
      
      if (searchIntegration) {
        // Search integration is ready
        devLogger.log('FeedTab', 'Search integration ready for space:', currentSpaceData.id);
      }
    }
  }, [currentSpaceData?.id, updateSpaceId]);

  // ============================================================================
  // SPACE DATA FALLBACK HOOK
  // ============================================================================
  
  const { sidebarSpaceData } = useSpaceDataFallback(currentSpaceData);

  // ============================================================================
  // LOADING STATE & ERRORS
  // ============================================================================

  // ENHANCED: Detect if space data is actually available through posts loading
  // If posts are successfully fetching, it means space ID is available even if currentSpaceData is null
  const spaceDataAvailableViaPostsLoading = !postsError && (effectivePostsLoading || effectivePosts.length > 0);
  const categoriesDataAvailable = !categoriesError && (effectiveCategoriesLoading || effectiveCategories.length > 0);
  const pinnedPostsDataAvailable = effectivePinnedPosts.length > 0;
  const hasDataIndicators = spaceDataAvailableViaPostsLoading || categoriesDataAvailable || pinnedPostsDataAvailable;
  
  // Note: Preserved space data functionality has been simplified
  const hasPreservedData = false; // Simplified - no longer using preserved data
  
  // REDUCED: Only log critical state changes, not every render
  if (process.env.NODE_ENV === 'development' && (postsError || categoriesError || (!hasInstantAccess && !currentSpaceData && !hasDataIndicators && !hasPreservedData))) {
    log.debug('Component', '🐛 [FeedTab] Critical state check:', {
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
  // SCROLL POSITION MANAGEMENT
  // ============================================================================
  
  // Reset scroll position when FeedTab mounts
  useEffect(() => {
    log.debug('Component', '📱 [FeedTab] Component mounted, resetting scroll position');
    resetScrollForFeedNavigation();
  }, []);

  // ============================================================================
  // RENDER JSX - Pure presentation logic
  // ============================================================================
  


  return (
    <>
    <div className="flex flex-col lg:flex-row gap-x-8 gap-y-4">
      {/* Main Feed Content */}
      <div className="flex-grow">
        {/* Render FeedHeader once, it will handle its own responsiveness - Hide when searching */}
        {!isSearchActive && (
        <FeedHeader
          currentUser={currentUser}
          onOpenCreatePostModal={openCreatePostModal}
        />
        )}





        {/* Category Tabs - Hide when searching */}
        {!isSearchActive && (
          <CategoryTabs
            selectedTab={effectiveSelectedTab}
            spaceCategories={effectiveCategories}
            categoriesLoading={effectiveCategoriesLoading}
            effectivePermissions={effectivePermissions}
            handleTabSelect={handleTabSelect}
            openCategoryModal={openCategoryModal}
          />
        )}

        {/* Search Results */}
        <SearchResultsList
          searchIntegration={searchIntegration}
          isSearchActive={isSearchActive}
          currentSpaceData={currentSpaceData}
          effectivePermissions={effectivePermissions}
          handlePostCardClick={handlePostCardClick}
          handleLikeToggledInCard={handleLikeToggledInCard}
        />

        {/* Render SimpleSpaceSetup here - only for admins/owners - Hide when searching */}
        {!isSearchActive && currentSpaceData && (effectivePermissions.effectiveIsOwner || effectivePermissions.effectiveIsAdmin) && (
          <div className="mt-6 sm:px-0">
            <SimpleSpaceSetup 
              spaceId={currentSpaceData.id}
              spaceName={currentSpaceData.name}
              spaceSubdomain={currentSpaceData.subdomain}
              isOwner={effectivePermissions.effectiveIsOwner}
              isAdmin={effectivePermissions.effectiveIsAdmin}
              hasAnyPosts={effectivePosts.length > 0 || effectivePinnedPosts.length > 0}
              onCreatePost={() => {
                if (postInputRef?.current) {
                  postInputRef.current.focus();
                } else {
                  openCreatePostModal();
                }
              }} 
            />
          </div>
        )}

        {/* Regular Posts Content - Hide when searching */}
        {!isSearchActive && (
          <>
            {/* Pinned Posts */}
            <PinnedPostsList
              pinnedPosts={effectiveFilteredPinnedPosts}
              selectedTab={effectiveSelectedTab}
              effectivePermissions={effectivePermissions}
              mapPostToCardProps={mapPostToCardProps}
              handlePostCardClick={handlePostCardClick}
              handleLikeToggledInCard={handleLikeToggledInCard}
              handlePinToggled={handlePinToggled}
              handleCommentAddedInModal={handleCommentAddedInModal}
              postsLoading={effectivePostsLoading}
              postsError={postsError}
            />

            {/* Regular Posts List */}
            <RegularPostsList
              fetchedPosts={effectivePosts}
              pinnedPosts={pinnedPosts}
              postsToShow={postsToShow}
              currentSpaceData={currentSpaceData}
              postsLoading={effectivePostsLoading}
              postsError={postsError}
              hasInstantAccess={hasInstantAccess}
              isLoadingMore={isLoadingMore}
              isBackgroundRefresh={false}
              selectedTab={effectiveSelectedTab}
              effectivePermissions={effectivePermissions}
              realtimeState={realtimeState}
              totalCount={totalCount}
                currentPage={effectiveCurrentPage}
                totalPages={totalPages}
              hasNextPage={hasNextPage}
              mapPostToCardProps={mapPostToCardProps}
              handlePostCardClick={handlePostCardClick}
              handleLikeToggledInCard={handleLikeToggledInCard}
              handlePinToggled={handlePinToggled}
              handleCommentAddedInModal={handleCommentAddedInModal}
              handleLoadNewPosts={handleLoadNewPosts}
              handleDismissNotification={handleDismissNotification}
              refetchPosts={refetchPosts}
              loadPage={loadPage}
              openCreatePostModal={openCreatePostModal}
              postInputRef={postInputRef}
            />
          </>
        )}
      </div>

      {/* Sidebar - with fallback space data when currentSpaceData is null */}
      {/* Only render on desktop to prevent unnecessary mounting and hook execution on mobile */}
      {isDesktop && sidebarSpaceData && (
        <div className="w-[273px] flex-shrink-0">
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
            // memberCount, adminCount, onlineCount removed - let SpaceInfoSidebar use its own hook for real-time data
          />
        </div>
      )}
    </div>
    
    {/* Feed Modals - Outside main layout container */}
    <FeedModals
      modalStates={modalStates}
      currentSpaceData={currentSpaceData}
      currentUser={currentUser}
      handleClosePostModal={handleClosePostModal}
      closeCreatePostModal={closeCreatePostModal}
      closeCategoryModal={closeCategoryModal}
      handlePostCreated={handlePostCreated}
      handleCommentAddedInModal={handleCommentAddedInModal}
      handlePinToggled={handlePinToggled}
      handlePostUpdated={handlePostUpdated}
      handlePostDeleted={handlePostDeleted}
      handleLikeToggledInCard={handleLikeToggledInCard}
      refreshCategories={refreshCategories}
    />

    {/* Hydration Indicator - DISABLED */}
    {/* <HydrationIndicator
      isSyncing={false} // This would be connected to background sync
      lastSyncTime={Date.now()}
    /> */}
    </>
  );
}

// 🚀 PERFORMANCE FIX: Enhanced React.memo with custom comparison to prevent unnecessary re-renders
const FeedTabMemo = memo(FeedTab, (prevProps, nextProps) => {
  // Only re-render if these critical props change
  const criticalPropsChanged = (
    prevProps.user?.id !== nextProps.user?.id ||
    prevProps.isOwner !== nextProps.isOwner ||
    prevProps.isAdmin !== nextProps.isAdmin ||
    prevProps.hasInstantAccess !== nextProps.hasInstantAccess
  );

  // Log re-render causes in development
  if (process.env.NODE_ENV === 'development' && criticalPropsChanged) {
    const changedProps = [];
    if (prevProps.user?.id !== nextProps.user?.id) changedProps.push('user.id');
    if (prevProps.isOwner !== nextProps.isOwner) changedProps.push('isOwner');
    if (prevProps.isAdmin !== nextProps.isAdmin) changedProps.push('isAdmin');
    if (prevProps.hasInstantAccess !== nextProps.hasInstantAccess) changedProps.push('hasInstantAccess');
    
    log.debug('Component', `🔄 [FeedTab] Re-render caused by props: ${changedProps.join(', ')}`);
  }

  return !criticalPropsChanged; // Return true if props are equal (no re-render needed)
});

export default FeedTabMemo; 
