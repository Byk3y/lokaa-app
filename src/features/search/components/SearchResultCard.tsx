import React from 'react';
import { motion } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { OptimizedAvatar } from '@/components/ui/OptimizedAvatar';
import { CategoryTag } from '@/components/ui/category-tag';
import { LikeButton, CommentButton } from '@/components/ui/post-icons';
import { createHighlightedContent } from '@/utils/searchUtils';
import type { SearchResult } from '../types';

interface SearchResultCardProps {
  result: SearchResult;
  searchQuery: string;
  onPostClick: (post: any) => void; // Accept any type to match existing handlers
  onLikeToggled?: (postId: string, newLikeCount?: number) => void; // Match existing signature
  isAdmin?: boolean;
}

export const SearchResultCard: React.FC<SearchResultCardProps> = ({
  result,
  searchQuery,
  onPostClick,
  onLikeToggled,
  isAdmin = false,
}) => {
  const isComment = result.result_type === 'comment';
  const displayUser = isComment ? result.comment_user_name : result.user_name;
  const displayAvatar = isComment ? result.comment_user_avatar : result.user_avatar;
  const displayContent = isComment ? result.comment_content : result.content;
  const displayCreatedAt = isComment ? result.comment_created_at : result.created_at;

  const timeAgo = React.useMemo(() => {
    if (!displayCreatedAt) return 'Unknown';
    try {
      return formatDistanceToNow(new Date(displayCreatedAt), { addSuffix: true })
        .replace('about ', '')
        .replace(' ago', '')
        .replace('less than a minute', 'now');
    } catch {
      return 'Unknown';
    }
  }, [displayCreatedAt]);

  const handleClick = () => {
    // Convert SearchResult to PostCard format for existing handlers
    const postCardData = {
      id: result.id,
      spaceId: result.space_id || '',
      currentUserId: null, // Will be set by the handler
      author: {
        id: result.user_id || '',
        name: result.user_name || 'Unknown User',
        avatar: result.user_avatar || null
      },
      title: result.title || null,
      content: result.content || '',
      createdAt: result.created_at,
      editedAt: result.updated_at || null,
      category: result.category_id ? {
        id: result.category_id,
        name: result.category_name || 'Category',
        icon: result.category_icon || null
      } : null,
      likes: result.like_count || 0,
      comments: result.comment_count || 0,
      isPinned: result.is_pinned || false,
      isAdmin: isAdmin || false,
      media_urls: null,
      className: '',
      // Add slug for URL navigation
      slug: result.slug || result.id // Use slug if available, fallback to ID
    };
    onPostClick(postCardData);
  };

  // If this is a comment, render it as a connected section (no container)
  if (isComment) {
    return (
      <div className="cursor-pointer" onClick={handleClick}>
        {/* Comment Header */}
        <div className="flex items-center space-x-2 mb-2">
          <OptimizedAvatar
            user={{
              id: result.comment_user_id || 'unknown',
              full_name: result.comment_user_name || 'Unknown User',
              avatar_url: result.comment_user_avatar || null
            }}
            size="sm"
            enableLazyLoading={true}
            enableCaching={true}
            placeholderType="initials"
            loadingTransition="fade"
            className="w-6 h-6"
          />
          <div className="flex items-center space-x-2">
            <span className="font-medium text-xs">
              {result.comment_user_name || 'Unknown User'}
            </span>
            <span className="text-xs text-gray-500">•</span>
            <span className="text-xs text-gray-500">{timeAgo}</span>
          </div>
        </div>

        {/* Comment Content */}
        {displayContent && (
          <div className="mb-2">
            <p className="text-xs text-gray-700 leading-relaxed">
              {searchQuery ? (
                <span dangerouslySetInnerHTML={createHighlightedContent(displayContent, searchQuery)} />
              ) : (
                displayContent
              )}
            </p>
          </div>
        )}

        {/* Comment Engagement */}
        <div className="flex items-center space-x-4 text-xs text-gray-500">
          <span>0 likes</span>
        </div>
      </div>
    );
  }

  // Render post content (no container, handled by parent)
  return (
    <div className="cursor-pointer" onClick={handleClick}>
      {/* Post Header (only show for posts or when comment is from different post) */}
      {!isComment && (
        <div className="flex items-center space-x-3 mb-3">
          <OptimizedAvatar
            user={{
              id: result.user_id || 'unknown',
              full_name: result.user_name || 'Unknown User',
              avatar_url: result.user_avatar || null
            }}
            size="lg"
            enableLazyLoading={true}
            enableCaching={true}
            placeholderType="initials"
            loadingTransition="fade"
            className="w-10 h-10"
          />
          
          <div className="flex-1 min-w-0">
            <div className="post-author font-bold text-base truncate">
              {result.user_name || 'Unknown User'}
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="post-time text-sm text-gray-500">{timeAgo}</span>
              {result.category_name && (
                <CategoryTag name={result.category_name} variant="compact" />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Post Title (only for posts) */}
      {!isComment && result.title && (
        <h3 className="post-title mb-2 line-clamp-1 text-lg font-bold">
          {searchQuery ? (
            <span dangerouslySetInnerHTML={createHighlightedContent(result.title, searchQuery)} />
          ) : (
            result.title
          )}
        </h3>
      )}



      {/* Content */}
      {displayContent && (
        <div className={isComment ? "mb-2" : "mb-3"}>
          {isComment ? (
            <p className="text-xs text-gray-700 leading-relaxed">
              {searchQuery ? (
                <span dangerouslySetInnerHTML={createHighlightedContent(displayContent, searchQuery)} />
              ) : (
                displayContent
              )}
            </p>
          ) : (
            <p className="text-base text-gray-800 leading-relaxed">
              {searchQuery ? (
                <span dangerouslySetInnerHTML={createHighlightedContent(displayContent, searchQuery)} />
              ) : (
                displayContent
              )}
            </p>
          )}
        </div>
      )}

      {/* Engagement (only for posts) */}
      {!isComment && (
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-6">
            <LikeButton
              isLiked={false} // TODO: Get actual like state
              count={result.like_count || 0}
              onClick={(e) => {
                e.stopPropagation();
                onLikeToggled?.(result.id);
              }}
              disabled={false}
            />
            <CommentButton count={result.comment_count || 0} />
          </div>
        </div>
      )}

      {/* Comment engagement (only for comments) */}
      {isComment && (
        <div className="flex items-center space-x-4 text-xs text-gray-500">
          <span>{result.comment_like_count || 0} likes</span>
        </div>
      )}
    </div>
  );
}; 