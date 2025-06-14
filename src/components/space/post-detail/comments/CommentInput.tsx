import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Paperclip, Link2, PlayCircle, Smile, Send, X } from 'lucide-react';
import { getInitial } from '@/shared/utils/avatar-utils';
import type { User } from '@supabase/supabase-js';
import type { FetchedComment } from '../hooks/useComments';
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';

interface CommentInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  isSubmitting: boolean;
  currentUser: User | null;
  replyingTo?: FetchedComment | null;
  onCancelReply?: () => void;
}

/**
 * Component for entering a new comment
 */
export default function CommentInput({
  value,
  onChange,
  onSubmit,
  isSubmitting,
  currentUser,
  replyingTo,
  onCancelReply
}: CommentInputProps) {
  if (!currentUser) return null; // Don't render if not logged in

  const { userDetails } = useOptimizedAuth();
  
  // FIXED: Get avatar URL from multiple sources with proper fallback chain
  const avatarUrl = currentUser?.user_metadata?.avatar_url || 
                    userDetails?.avatar_url || 
                    '';

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (value.trim() && !isSubmitting) {
        onSubmit();
      }
    }
  };

  return (
    <div className="pt-4 border-t border-gray-100 mt-6">
      {replyingTo && replyingTo.author && (
        <div className="flex items-center text-xs text-gray-500 mb-2 px-3">
          <span>Replying to <span className="font-medium text-gray-700">@{replyingTo.author.full_name || 'User'}</span></span>
          {onCancelReply && (
            <button onClick={onCancelReply} className="ml-2 text-gray-400 hover:text-gray-600">
              <X size={14} />
            </button>
          )}
        </div>
      )}
      <div className="flex items-center space-x-3">
        <Avatar className="h-8 w-8 flex-shrink-0">
          {avatarUrl ? (
            <AvatarImage src={avatarUrl} alt={currentUser.email || 'User'} />
          ) : (
            <AvatarFallback className="bg-blue-100 text-blue-600 text-sm">
              {getInitial(currentUser?.email || '')}
            </AvatarFallback>
          )}
        </Avatar>
        <div className="flex-grow flex items-center bg-white border border-gray-200 rounded-full px-4 py-[10px] shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
          <input
            id="comment-input"
            type="text"
            placeholder="Write a comment..."
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="flex-grow bg-transparent border-none focus:ring-0 focus:outline-none text-sm placeholder-gray-500 text-gray-800"
            onKeyPress={handleKeyPress}
            disabled={isSubmitting}
          />
          <div className="flex items-center space-x-4 ml-2">
            <button className="text-gray-400 hover:text-gray-600" disabled={isSubmitting}>
              <Paperclip size={16} />
            </button>
            <button className="text-gray-400 hover:text-gray-600" disabled={isSubmitting}>
              <Link2 size={16} />
            </button>
            <button className="text-gray-400 hover:text-gray-600" disabled={isSubmitting}>
              <PlayCircle size={16} />
            </button>
            <button className="text-gray-400 hover:text-gray-600" disabled={isSubmitting}>
              <Smile size={16} />
            </button>
            <button className="text-gray-400 hover:text-gray-600 text-xs font-semibold" disabled={isSubmitting}>
              GIF
            </button>
            <button 
              className={`text-gray-400 hover:text-blue-600 ${isSubmitting ? 'opacity-50' : ''}`}
              onClick={() => {
                if (value.trim() && !isSubmitting) {
                  onSubmit();
                }
              }}
              disabled={isSubmitting || !value.trim()}
            >
              <Send size={16} className={isSubmitting ? "animate-pulse" : ""} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 