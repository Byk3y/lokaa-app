import React from 'react';
import PostCard from "@/components/space/PostCard";
import type { CachedPostType } from "@/features/posts/types/cachedPost";
import type { PostCardProps } from "@/features/posts/types/postCard";
import type { EffectivePermissions } from "@/types/feedTypes";

interface PinnedPostsListProps {
  pinnedPosts: CachedPostType[];
  selectedTab: string;
  effectivePermissions: EffectivePermissions;
  mapPostToCardProps: (post: CachedPostType) => PostCardProps;
  handlePostCardClick: (post: PostCardProps) => void;
  handleLikeToggledInCard: (postId: string, newLikeCount: number) => void;
  handlePinToggled: (postId: string, isPinned: boolean, category?: string | null) => void;
  handleCommentAddedInModal: (postId: string, newCommentCount: number) => void;
  postsLoading: boolean;
  postsError: string | null;
}

export const PinnedPostsList: React.FC<PinnedPostsListProps> = ({
  pinnedPosts,
  selectedTab,
  effectivePermissions,
  mapPostToCardProps,
  handlePostCardClick,
  handleLikeToggledInCard,
  handlePinToggled,
  handleCommentAddedInModal,
  postsLoading,
  postsError,
}) => {
  // Don't show pinned posts if loading or error
  if (postsLoading || postsError || pinnedPosts.length === 0) {
    return null;
  }

  // Only show to admins/owners
  if (!effectivePermissions.effectiveIsOwner && !effectivePermissions.effectiveIsAdmin) {
    return null;
  }

  // Sort pinned posts by position
  const sortedPinnedPosts = [...pinnedPosts].sort((a, b) => {
    // Sort by pin_position (lower number = higher priority, position 1 is at top)
    if (a.pin_position !== null && b.pin_position !== null) {
      return a.pin_position - b.pin_position;
    }
    // Fallback to pinned_at for posts without position (newest first)
    if (a.pinned_at && b.pinned_at) {
      return new Date(b.pinned_at).getTime() - new Date(a.pinned_at).getTime();
    }
    return 0;
  });

  return (
    <div className="space-y-4 mt-6">
      <div className="space-y-4">
        {sortedPinnedPosts.map((post) => (
          <PostCard
            key={`pinned-${post.id}`}
            {...mapPostToCardProps(post)}
            isPinned={true}
            isAdmin={effectivePermissions.effectiveIsAdmin || effectivePermissions.effectiveIsOwner}
            onPostClick={handlePostCardClick}
            onLikeToggled={handleLikeToggledInCard}
            onPinToggled={handlePinToggled}
            onCommentAdded={handleCommentAddedInModal}
          />
        ))}
      </div>
    </div>
  );
};

export default PinnedPostsList;
