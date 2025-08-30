import React from 'react';
import { Loader2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import PostCard from "@/components/space/PostCard";
import { OptimizedAvatar } from '@/components/ui/OptimizedAvatar';
import { createHighlightedContent } from '@/utils/searchUtils';
import { formatCommentTime } from '@/utils/formatters';
import { devLogger } from '@/utils/developmentLogger';
import type { PostCardProps } from "@/features/posts/types/postCard";
import type { EffectivePermissions } from "@/types/feedTypes";

interface SearchResultsListProps {
  searchIntegration: any;
  isSearchActive: boolean;
  currentSpaceData: any;
  effectivePermissions: EffectivePermissions;
  handlePostCardClick: (post: PostCardProps) => void;
  handleLikeToggledInCard: (postId: string, newLikeCount: number) => void;
}

export const SearchResultsList: React.FC<SearchResultsListProps> = ({
  searchIntegration,
  isSearchActive,
  currentSpaceData,
  effectivePermissions,
  handlePostCardClick,
  handleLikeToggledInCard,
}) => {
  // Early return if search is not active
  if (!isSearchActive || !searchIntegration || !currentSpaceData?.id) {
    return null;
  }

  return (
    <div className="mt-6">
      {(() => {
        devLogger.log('FeedTab', 'Rendering search results as PostCards:', {
          isSearchActive,
          hasIntegration: !!searchIntegration,
          spaceId: currentSpaceData?.id,
          resultsCount: searchIntegration.results?.length,
          query: searchIntegration.query,
          isLoading: searchIntegration.isLoading,
          error: searchIntegration.error
        });
        return null;
      })()}
      
      {/* Search Loading State */}
      {searchIntegration.isLoading && (
        <div className="flex flex-col items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
          <p className="text-muted-foreground text-center">Searching posts...</p>
        </div>
      )}
      
      {/* Search Error State */}
      {searchIntegration.error && (
        <div className="p-6 text-center mt-6 bg-red-50 border border-red-200 rounded-lg mx-4 sm:mx-0">
          <div className="text-red-600 mb-3">
            <AlertTriangle className="h-8 w-8 mx-auto mb-2" />
            <p className="font-medium">Search failed</p>
            <p className="text-sm text-red-500 mt-1">{searchIntegration.error}</p>
          </div>
        </div>
      )}
      
      {/* Search Results as PostCards */}
      {!searchIntegration.isLoading && !searchIntegration.error && searchIntegration.results && (
        <div className="space-y-4">
          {searchIntegration.results.length === 0 ? (
            <div className="p-4 text-center text-gray-500">
              No posts found matching "{searchIntegration.query}"
            </div>
          ) : (
            <SearchResultsContent
              results={searchIntegration.results}
              query={searchIntegration.query}
              effectivePermissions={effectivePermissions}
              handlePostCardClick={handlePostCardClick}
              handleLikeToggledInCard={handleLikeToggledInCard}
            />
          )}
          
          {/* Load More for Search Results */}
          {searchIntegration.hasMore && (
            <div className="flex justify-center mt-6">
              <Button
                onClick={searchIntegration.loadMore}
                variant="outline"
                size="sm"
                className="px-6"
              >
                Load More Results
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

interface SearchResultsContentProps {
  results: any[];
  query: string;
  effectivePermissions: EffectivePermissions;
  handlePostCardClick: (post: PostCardProps) => void;
  handleLikeToggledInCard: (postId: string, newLikeCount: number) => void;
}

const SearchResultsContent: React.FC<SearchResultsContentProps> = ({
  results,
  query,
  effectivePermissions,
  handlePostCardClick,
  handleLikeToggledInCard,
}) => {
  // Group search results by post ID
  const groupedResults = results.reduce((groups, result) => {
    const postId = result.id;
    if (!groups[postId]) {
      groups[postId] = { post: null, comments: [] };
    }
    
    if (result.result_type === 'post') {
      groups[postId].post = result;
    } else if (result.result_type === 'comment') {
      groups[postId].comments.push(result);
    }
    
    return groups;
  }, {} as Record<string, { post: any, comments: any[] }>);

  // Render grouped results with comments nested within post cards
  return (
    <>
      {Object.entries(groupedResults).map(([postId, group]) => {
        if (group.post) {
          return (
            <SearchResultPostWithComments
              key={postId}
              postData={group.post}
              comments={group.comments}
              query={query}
              effectivePermissions={effectivePermissions}
              handlePostCardClick={handlePostCardClick}
              handleLikeToggledInCard={handleLikeToggledInCard}
            />
          );
        } else if (group.comments.length > 0) {
          return (
            <SearchResultCommentsOnly
              key={postId}
              comments={group.comments}
              query={query}
            />
          );
        }
        return null;
      })}
    </>
  );
};

interface SearchResultPostWithCommentsProps {
  postData: any;
  comments: any[];
  query: string;
  effectivePermissions: EffectivePermissions;
  handlePostCardClick: (post: PostCardProps) => void;
  handleLikeToggledInCard: (postId: string, newLikeCount: number) => void;
}

const SearchResultPostWithComments: React.FC<SearchResultPostWithCommentsProps> = ({
  postData,
  comments,
  query,
  effectivePermissions,
  handlePostCardClick,
  handleLikeToggledInCard,
}) => {
  // Convert search result to PostCard format
  const postCardData = {
    id: postData.id,
    spaceId: postData.space_id || '',
    currentUserId: null,
    author: {
      id: postData.user_id || '',
      name: postData.user_full_name || 'Unknown User',
      avatar: postData.user_avatar_url || null
    },
    title: postData.title || null,
    content: postData.content || '',
    createdAt: postData.created_at,
    editedAt: postData.updated_at || null,
    category: postData.category_id ? {
      id: postData.category_id,
      name: postData.category_name || 'Category',
      icon: postData.category_icon || null
    } : null,
    likes: postData.like_count || 0,
    comments: postData.comment_count || 0,
    isPinned: postData.is_pinned || false,
    isAdmin: effectivePermissions.effectiveIsAdmin || effectivePermissions.effectiveIsOwner,
    media_urls: null,
    className: '',
    slug: postData.slug || postData.id
  };

  return (
    <div>
      {/* Main Post */}
      <PostCard
        {...postCardData}
        onPostClick={handlePostCardClick}
        onLikeToggled={handleLikeToggledInCard}
        isAdmin={effectivePermissions.effectiveIsAdmin || effectivePermissions.effectiveIsOwner}
        searchQuery={query}
      />
      
      {/* Comments attached directly under the post */}
      {comments.map((comment) => (
        <SearchResultComment
          key={`comment-${comment.comment_id}`}
          comment={comment}
          query={query}
        />
      ))}
    </div>
  );
};

interface SearchResultCommentProps {
  comment: any;
  query: string;
}

const SearchResultComment: React.FC<SearchResultCommentProps> = ({ comment, query }) => (
  <div className="border-t border-gray-100 bg-gray-50 relative w-full md:w-[768px]">
    {/* Blue vertical line on the left - matches Skool reference */}
    <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-blue-400"></div>
    
    <div className="flex items-start space-x-3 px-4 py-3 pl-4">
      {/* Comment Avatar */}
      <OptimizedAvatar
        user={{
          id: comment.comment_user_id || 'unknown',
          full_name: comment.comment_user_name || 'Unknown User',
          avatar_url: comment.comment_user_avatar || null
        }}
        size="lg"
        enableLazyLoading={false}
        enableCaching={true}
        placeholderType="initials"
        loadingTransition="fade"
        className="h-9 w-9 flex-shrink-0"
      />
      
      {/* Comment Content */}
      <div className="flex-grow min-w-0">
        <div className="bg-gray-100 rounded-xl p-3">
          <div className="flex items-center space-x-2">
            <span className="text-sm sm:text-base font-semibold text-gray-900 truncate">
              {comment.comment_user_name || 'Unknown User'}
            </span>
            <span className="text-sm text-gray-500 flex-shrink-0">
              {formatCommentTime(comment.comment_created_at)}
            </span>
          </div>
          <p className="text-gray-800 mt-1 whitespace-pre-wrap break-words leading-relaxed max-w-full overflow-hidden">
            {query ? (
              <span dangerouslySetInnerHTML={createHighlightedContent(comment.comment_content, query)} />
            ) : (
              comment.comment_content
            )}
          </p>
        </div>
      </div>
    </div>
  </div>
);

interface SearchResultCommentsOnlyProps {
  comments: any[];
  query: string;
}

const SearchResultCommentsOnly: React.FC<SearchResultCommentsOnlyProps> = ({ comments, query }) => (
  <div className="bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md hover:-translate-y-0.5 overflow-hidden w-full md:w-[768px]">
    {comments.map((comment) => (
      <div key={`comment-${comment.comment_id}`} className="p-4 border-b border-gray-100 last:border-b-0">
        <div className="flex items-start space-x-3">
          <OptimizedAvatar
            user={{
              id: comment.comment_user_id || 'unknown',
              full_name: comment.comment_user_name || 'Unknown User',
              avatar_url: comment.comment_user_avatar || null
            }}
            size="lg"
            enableLazyLoading={false}
            enableCaching={true}
            placeholderType="initials"
            loadingTransition="fade"
            className="h-9 w-9 flex-shrink-0"
          />
          
          <div className="flex-grow min-w-0">
            <div className="bg-gray-100 rounded-xl p-3">
              <div className="flex items-center space-x-2">
                <span className="text-sm sm:text-base font-semibold text-gray-900 truncate">
                  {comment.comment_user_name || 'Unknown User'}
                </span>
                <span className="text-sm text-gray-500 flex-shrink-0">
                  {formatCommentTime(comment.comment_created_at)}
                </span>
              </div>
              <p className="text-gray-800 mt-1 whitespace-pre-wrap break-words leading-relaxed max-w-full overflow-hidden">
                {query ? (
                  <span dangerouslySetInnerHTML={createHighlightedContent(comment.comment_content, query)} />
                ) : (
                  comment.comment_content
                )}
              </p>
            </div>
          </div>
        </div>
      </div>
    ))}
  </div>
);

export default SearchResultsList;
