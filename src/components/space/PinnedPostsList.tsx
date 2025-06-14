import React from 'react';
import { motion } from 'framer-motion';
import PostCard from './PostCard';
import type { PostCardProps } from '@/features/posts/types/postCard';

interface FetchedPostType {
  id: string;
  author?: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
    profile_url?: string | null;
    activity_score?: number | null;
  } | null;
  created_at: string;
  title?: string | null;
  content: string;
  category?: {
    id: string;
    name: string;
    icon?: string | null;
  } | null;
  like_count: number;
  comment_count: number;
  media_urls?: string[] | null;
  user_id: string;
  space_id: string;
  is_pinned: boolean;
  pinned_at?: string | null;
  pin_position?: number | null;
  pin_category?: string | null;
  edited_at?: string | null;
  poll_data?: any;
}

interface PinnedPostsListProps {
  pinnedPosts: FetchedPostType[];
  selectedTab: string;
  currentUserId: string | null;
  isOwnerOrAdmin: boolean;
  onPostCardClick: (post: any) => void;
  onPinToggled: (postId: string, isPinned: boolean) => void;
  onLikeToggled: (postId: string, isLiked: boolean, newLikeCount: number) => void;
  onPostUpdated: (updatedPost: any) => void;
  onPostDeleted: (postId: string) => void;
  mapPostToCardProps: (post: FetchedPostType) => PostCardProps;
}

export default function PinnedPostsList({
  pinnedPosts,
  selectedTab,
  currentUserId,
  isOwnerOrAdmin,
  onPostCardClick,
  onPinToggled,
  onLikeToggled,
  onPostUpdated,
  onPostDeleted,
  mapPostToCardProps,
}: PinnedPostsListProps) {
  // Filter pinned posts by selected category
  const filteredPinnedPosts = pinnedPosts.filter(post => {
    if (selectedTab === "all") return true;
    return post.category?.id === selectedTab;
  });

  if (filteredPinnedPosts.length === 0) {
    return null;
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-4 mb-6"
    >
      <div className="space-y-3">
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
            <motion.div
                  key={post.id} 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
              className="relative"
            >
                        <PostCard
                          {...mapPostToCardProps(post)}
                          onPostClick={() => onPostCardClick(post)}
                          onPinToggled={(postId, isPinned) => onPinToggled(postId, isPinned)}
                          onLikeToggled={(postId, newLikeCount) => onLikeToggled(postId, false, newLikeCount)}
                          isPinned={true}
                        />
            </motion.div>
          ))}
          </div>
    </motion.div>
  );
} 