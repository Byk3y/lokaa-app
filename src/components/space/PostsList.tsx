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

interface PostsListProps {
  posts: FetchedPostType[];
  selectedTab: string;
  postsLoading: boolean;
  currentUserId: string | null;
  isOwnerOrAdmin: boolean;
  onPostCardClick: (post: any) => void;
  onPinToggled: (postId: string, isPinned: boolean) => void;
  onLikeToggled: (postId: string, isLiked: boolean, newLikeCount: number) => void;
  onPostUpdated: (updatedPost: any) => void;
  onPostDeleted: (postId: string) => void;
  mapPostToCardProps: (post: FetchedPostType) => PostCardProps;
}

export default function PostsList({
  posts,
  selectedTab,
  postsLoading,
  currentUserId,
  isOwnerOrAdmin,
  onPostCardClick,
  onPinToggled,
  onLikeToggled,
  onPostUpdated,
  onPostDeleted,
  mapPostToCardProps,
}: PostsListProps) {
  // Filter posts by selected category
  const filteredPosts = posts.filter(post => {
    if (selectedTab === "all") return true;
    return post.category?.id === selectedTab;
  });

  if (postsLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, index) => (
          <div key={index} className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm animate-pulse">
            <div className="flex items-center space-x-3 mb-3">
              <div className="w-10 h-10 bg-gray-300 dark:bg-gray-600 rounded-full"></div>
              <div className="flex-1">
                <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-1/4 mb-2"></div>
                <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded w-1/6"></div>
              </div>
            </div>
            <div className="space-y-2">
              <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-full"></div>
              <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-3/4"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (filteredPosts.length === 0) {
    return (
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center py-12"
      >
        <div className="text-6xl mb-4">📭</div>
        <h3 className="text-lg font-medium text-gray-600 dark:text-gray-300 mb-2">
          {selectedTab === "all" ? "No posts yet" : "No posts in this category"}
        </h3>
        <p className="text-gray-500 dark:text-gray-400">
          {selectedTab === "all" 
            ? "Be the first to share something!" 
            : "Be the first to post in this category!"
          }
        </p>
      </motion.div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="space-y-4"
    >
      {filteredPosts.map((post, index) => (
        <motion.div
          key={post.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ 
            duration: 0.3, 
            delay: index * 0.05 
          }}
        >
          <PostCard
            {...mapPostToCardProps(post)}
            onPostClick={() => onPostCardClick(post)}
            onPinToggled={(postId, isPinned) => onPinToggled(postId, isPinned)}
            onLikeToggled={(postId, newLikeCount) => onLikeToggled(postId, false, newLikeCount)}
            isPinned={false}
          />
        </motion.div>
      ))}
    </motion.div>
  );
} 