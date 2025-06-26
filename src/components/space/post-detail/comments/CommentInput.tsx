import React from 'react';
import { InstantAvatar } from '@/components/ui/InstantAvatar';
import { Paperclip, X } from 'lucide-react';
import type { User } from '@supabase/supabase-js';
import type { FetchedComment } from '../hooks/useComments';

interface CommentInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  isSubmitting: boolean;
  currentUser: User | null;
  replyingTo?: FetchedComment | null;
  onCancelReply?: () => void;
  showAvatar?: boolean;
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
  onCancelReply,
  showAvatar = true
}: CommentInputProps) {
  if (!currentUser) return null; // Don't render if not logged in

  // Get avatar URL and name from currentUser
  const avatarUrl = currentUser?.user_metadata?.avatar_url || '';
  const userName = currentUser?.user_metadata?.full_name || 
                   currentUser?.email || 
                   'User';

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (value.trim() && !isSubmitting) {
        onSubmit();
      }
    }
  };

  return (
    <div className="">
      {replyingTo && replyingTo.author && (
        <div className="flex items-center text-xs text-gray-500 mb-2 px-1">
          <span>Replying to <span className="font-medium text-gray-700">@{replyingTo.author.full_name || 'User'}</span></span>
          {onCancelReply && (
            <button onClick={onCancelReply} className="ml-2 text-gray-400 hover:text-gray-600">
              <X size={14} />
            </button>
          )}
        </div>
      )}
      <div className={`flex items-center ${showAvatar ? 'space-x-3' : ''}`}>
        {showAvatar && (
          <InstantAvatar
            user={{
              id: currentUser.id,
              full_name: userName,
              avatar_url: avatarUrl
            }}
            size="sm"
            className="h-8 w-8 flex-shrink-0"
          />
        )}
        <div className="flex-1 flex items-center bg-gray-50 border border-gray-200 rounded-full px-4 py-2">
          <input
            id="comment-input"
            type="text"
            placeholder="Your comment"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="flex-1 bg-transparent border-none focus:ring-0 focus:outline-none text-base placeholder-gray-500 text-gray-900"
            onKeyPress={handleKeyPress}
            disabled={isSubmitting}
          />
          <div className="flex items-center space-x-4 ml-3">
            <button className="text-gray-600 hover:text-gray-800 text-sm font-bold" disabled={isSubmitting}>
              GIF
            </button>
            <button className="text-gray-600 hover:text-gray-800" disabled={isSubmitting}>
              <Paperclip size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 