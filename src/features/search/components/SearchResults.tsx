import React from 'react';
import { motion } from 'framer-motion';
import { Loader2, AlertCircle, MessageSquare, Heart, Pin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { SearchResult } from '../types';

interface SearchResultsProps {
  results: SearchResult[];
  query: string;
  isLoading: boolean;
  hasMore: boolean;
  error: string | null;
  onLoadMore: () => void;
  onPostClick?: (postId: string) => void;
  className?: string;
}

export function SearchResults({ 
  results, 
  query, 
  isLoading, 
  hasMore, 
  error, 
  onLoadMore, 
  onPostClick,
  className = '' 
}: SearchResultsProps) {

  if (!query) {
    return null;
  }

  if (isLoading && results.length === 0) {
    return (
      <div className={`flex items-center justify-center py-12 ${className}`}>
        <div className="flex items-center gap-3 text-gray-500">
          <Loader2 className="animate-spin" size={20} />
          <span>Searching posts...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`flex items-center justify-center py-12 ${className}`}>
        <div className="flex items-center gap-3 text-red-500">
          <AlertCircle size={20} />
          <span>Search failed: {error}</span>
        </div>
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className={`py-12 text-center ${className}`}>
        <div className="max-w-md mx-auto">
          <div className="text-gray-400 text-6xl mb-4">🔍</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No posts found
          </h3>
          <p className="text-gray-500">
            No posts match your search for "{query}". Try different keywords or check your spelling.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      {/* Search Results Header */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-gray-900">
          Search Results ({results.length})
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          Found {results.length} post{results.length === 1 ? '' : 's'} matching "{query}"
        </p>
      </div>

      {/* Results List */}
      <div className="space-y-6">
        {results.map((post, index) => (
          <motion.div
            key={post.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <SearchResultItem 
              post={post} 
              query={query} 
              onClick={() => onPostClick?.(post.id)}
            />
          </motion.div>
        ))}
      </div>

      {/* Load More */}
      {hasMore && (
        <div className="mt-8 text-center">
          <Button
            onClick={onLoadMore}
            variant="outline"
            disabled={isLoading}
            className="min-w-32"
          >
            {isLoading ? (
              <Loader2 className="animate-spin mr-2" size={16} />
            ) : null}
            {isLoading ? 'Loading...' : 'Load More'}
          </Button>
        </div>
      )}
    </div>
  );
}

interface SearchResultItemProps {
  post: SearchResult;
  query: string;
  onClick?: () => void;
}

function SearchResultItem({ post, query, onClick }: SearchResultItemProps) {
  const highlightText = (text: string): string => {
    if (!query || !text) return text;
    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    return text.replace(regex, '<mark class="bg-yellow-200 px-1 rounded">$1</mark>');
  };

  return (
    <div 
      className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md hover:border-lokaa-200 transition-all cursor-pointer"
      onClick={onClick}
    >
      <div className="mb-3">
        {/* Post Title with highlighting */}
        {post.title && (
          <h3 
            className="font-semibold text-gray-900 mb-2 line-clamp-2"
            dangerouslySetInnerHTML={{ 
              __html: highlightText(post.title)
            }}
          />
        )}
        
        {/* Post Content Preview with highlighting */}
        <div 
          className="text-gray-600 text-sm line-clamp-3"
          dangerouslySetInnerHTML={{ 
            __html: highlightText(post.content || '')
          }}
        />
      </div>

      {/* Post Metadata */}
      <div className="flex items-center justify-between text-xs text-gray-500">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1">
            <Heart size={12} />
            <span>{post.like_count || 0}</span>
          </div>
          <div className="flex items-center gap-1">
            <MessageSquare size={12} />
            <span>{post.comment_count || 0}</span>
          </div>
          {post.is_pinned && (
            <div className="flex items-center gap-1 text-lokaa-600 font-medium">
              <Pin size={12} />
              <span>Pinned</span>
            </div>
          )}
        </div>
        <span>
          {new Date(post.created_at).toLocaleDateString()}
        </span>
      </div>
    </div>
  );
}