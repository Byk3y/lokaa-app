import React from 'react';
import { Loader2, AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import PostCard from "@/components/space/PostCard";
import PostsPagination from '@/components/space/PostsPagination';
import { NewPostNotification } from "@/components/feed/NewPostNotification";
import type { CachedPostType } from "@/features/posts/types/cachedPost";
import type { PostCardProps } from "@/features/posts/types/postCard";
import type { EffectivePermissions } from "@/types/feedTypes";

// SimpleSpaceSetup is now handled by parent FeedTab component

interface RealtimeState {
  newPostIds: string[];
  newPostCount: number;
  isConnected: boolean;
  isLoadingNewPosts: boolean;
  isDismissed: boolean;
  loadError: any;
  retryCount: number;
}

interface RegularPostsListProps {
  // Data
  fetchedPosts: CachedPostType[];
  pinnedPosts: CachedPostType[];
  postsToShow: CachedPostType[];
  currentSpaceData: any;
  
  // Loading & Error states
  postsLoading: boolean;
  postsError: string | null;
  hasInstantAccess?: boolean;
  
  // UI State
  selectedTab: string;
  
  // Permissions
  effectivePermissions: EffectivePermissions;
  
  // Real-time state
  realtimeState: RealtimeState;
  
  // Pagination
  totalCount: number;
  currentPage: number;
  totalPages: number;
  hasNextPage: boolean;
  
  // Handlers
  mapPostToCardProps: (post: CachedPostType) => PostCardProps;
  handlePostCardClick: (post: PostCardProps) => void;
  handleLikeToggledInCard: (postId: string, newLikeCount: number) => void;
  handlePinToggled: (postId: string, isPinned: boolean, category?: string | null) => void;
  handleCommentAddedInModal: (postId: string, newCommentCount: number) => void;
  handleLoadNewPosts: (postIds: string[]) => Promise<void>;
  handleDismissNotification: () => void;
  refetchPosts: (forceRefresh?: boolean) => Promise<void>;
  loadPage: (page: number) => Promise<void>;
  openCreatePostModal: () => void;
  postInputRef?: React.RefObject<HTMLTextAreaElement | HTMLInputElement>;
}

export const RegularPostsList: React.FC<RegularPostsListProps> = ({
  fetchedPosts,
  pinnedPosts,
  postsToShow,
  currentSpaceData,
  postsLoading,
  postsError,
  hasInstantAccess,
  selectedTab,
  effectivePermissions,
  realtimeState,
  totalCount,
  currentPage,
  totalPages,
  hasNextPage,
  mapPostToCardProps,
  handlePostCardClick,
  handleLikeToggledInCard,
  handlePinToggled,
  handleCommentAddedInModal,
  handleLoadNewPosts,
  handleDismissNotification,
  refetchPosts,
  loadPage,
  openCreatePostModal,
  postInputRef,
}) => {
  return (
    <>
      {/* SimpleSpaceSetup is now rendered by parent FeedTab component */}

      {/* Posts Loading State - Show only when no cached data exists */}
      {(postsLoading && fetchedPosts.length === 0 && pinnedPosts.length === 0) && (
        <div className="flex flex-col items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
          <p className="text-muted-foreground text-center">Loading posts...</p>
        </div>
      )}
      
      {/* Background Refresh Indicator - Show when updating cached data */}
      {postsLoading && (fetchedPosts.length > 0 || pinnedPosts.length > 0) && (
        <div className="flex justify-center items-center py-2 mb-4">
          <Loader2 className="h-4 w-4 animate-spin text-primary mr-2" />
          <span className="text-sm text-muted-foreground">Updating posts...</span>
        </div>
      )}
      
      {/* Posts Error State */}
      {!postsLoading && postsError && (
        <div className="p-6 text-center mt-6 bg-red-50 border border-red-200 rounded-lg mx-4 sm:mx-0">
          <div className="text-red-600 mb-3">
            <AlertTriangle className="h-8 w-8 mx-auto mb-2" />
            <p className="font-medium">Failed to load posts</p>
            <p className="text-sm text-red-500 mt-1">{postsError}</p>
          </div>
          <Button 
            onClick={() => refetchPosts(true)}
            variant="outline"
            size="sm"
            className="border-red-300 text-red-600 hover:bg-red-50"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
        </div>
      )}

      {/* Real-time New Posts Notification */}
      <div className="mt-4">
        <NewPostNotification
          newPostCount={realtimeState.newPostCount}
          isLoading={realtimeState.isLoadingNewPosts}
          isVisible={!realtimeState.isDismissed && realtimeState.newPostCount > 0}
          onLoadPosts={() => handleLoadNewPosts(realtimeState.newPostIds)}
          onDismiss={handleDismissNotification}
        />
      </div>

      {/* Empty State */}
      {!postsLoading && !postsError && fetchedPosts.length === 0 && pinnedPosts.length === 0 && !hasInstantAccess && (
        <div className="p-4 text-center text-gray-500 mt-6 px-4 sm:px-0">
          No posts yet. Be the first to share something!
        </div>
      )}
      
      {/* Regular Posts List */}
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
                  onCommentAdded={handleCommentAddedInModal}
                />
              ));
          })()}
          
          {/* Pagination Component - Only show when there are more than 25 posts IN THE CURRENT CATEGORY */}
          {(() => {
            // Calculate filtered count based on selected category
            const filteredCount = selectedTab === "all" 
              ? totalCount 
              : postsToShow.filter(post => post.category?.id === selectedTab).length;
            
            return filteredCount > 25 && (
              <PostsPagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalCount={filteredCount}
                postsPerPage={25}
                onPageChange={loadPage}
                isLoading={postsLoading}
              />
            );
          })()}
        </div>
      )}

      {/* Show pagination loading indicator when loading more posts with existing posts visible */}
      {postsLoading && (fetchedPosts.length > 0 || pinnedPosts.length > 0) && (
        <div className="flex justify-center items-center py-4 mt-6">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          <span className="ml-2 text-sm text-gray-600">Loading more posts...</span>
        </div>
      )}
    </>
  );
};

export default RegularPostsList;
