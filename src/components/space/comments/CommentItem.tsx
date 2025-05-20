import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { formatDistanceToNow } from 'date-fns';

export interface CommentAuthor {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
}

export interface CommentItemProps {
  id: string;
  content: string;
  created_at: string; // ISO string format
  author: CommentAuthor | null; // Author might be null if user is deleted or data is inconsistent
}

const CommentItem: React.FC<CommentItemProps> = ({ content, created_at, author }) => {
  const getInitials = (name: string | null): string => {
    if (!name) return 'U'; // Unknown
    const names = name.split(' ');
    if (names.length === 1) return names[0].charAt(0).toUpperCase();
    return (names[0].charAt(0) + names[names.length - 1].charAt(0)).toUpperCase();
  };

  const timeAgo = formatDistanceToNow(new Date(created_at), { addSuffix: true });

  return (
    <div className="flex items-start space-x-3 py-3">
      <Avatar className="h-9 w-9 flex-shrink-0">
        {author?.avatar_url ? (
          <AvatarImage src={author.avatar_url} alt={author.full_name || 'User'} />
        ) : null}
        <AvatarFallback className="text-sm">
          {getInitials(author?.full_name || null)}
        </AvatarFallback>
      </Avatar>
      <div className="flex-grow">
        <div className="flex items-center space-x-2">
          <span className="text-sm font-semibold text-gray-800">
            {author?.full_name || 'Anonymous User'}
          </span>
          <span className="text-xs text-gray-500">{timeAgo}</span>
        </div>
        <p className="text-sm text-gray-700 mt-0.5 whitespace-pre-wrap break-words">
          {content}
        </p>
      </div>
    </div>
  );
};

export default CommentItem; 