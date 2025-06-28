import React from 'react';
import { Loader2, RefreshCw, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import PostCard from './PostCard';
import { type Post } from '@/types/database-types';
import { type PostCardProps } from './PostCard';
import { type SpaceTab } from '@/utils/tabUtils';

export interface PostsListProps {
  posts: Post[];
  selectedTab: SpaceTab | string;
  postsLoading: boolean;
  currentUserId: string;
  isOwnerOrAdmin: boolean;
  onPostCardClick: (post: Post) => void;
  onPinToggled: (postId: string, isPinned: boolean) => void;
  onLikeToggled: (postId: string, isLiked: boolean, newLikeCount: number) => void;
  onPostUpdated: (updatedPost: Post) => void;
  onPostDeleted: (postId: string) => void;
  mapPostToCardProps: (post: Post) => PostCardProps;
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
      <div className="text-center py-12">
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
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {filteredPosts.map((post) => (
        <div key={post.id}>
          <PostCard
            {...mapPostToCardProps(post)}
            onPostClick={() => onPostCardClick(post)}
            onPinToggled={(postId, isPinned) => onPinToggled(postId, isPinned)}
            onLikeToggled={(postId, newLikeCount) => onLikeToggled(postId, false, newLikeCount)}
            isPinned={false}
          />
        </div>
      ))}
    </div>
  );
} 