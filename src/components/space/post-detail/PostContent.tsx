import React, { useMemo } from 'react';
import type { PostCardProps } from '@/features/posts/types';
import { toTitleCase } from '@/utils/textFormatting';
import { sanitizePostContent } from '@/utils/htmlSanitizer';

interface PostContentProps {
  post: PostCardProps;
  postTitleRef: React.RefObject<HTMLHeadingElement>;
}

export default function PostContent({ post, postTitleRef }: PostContentProps) {
  // Sanitize content to prevent XSS attacks
  const sanitizedContent = useMemo(() => {
    return sanitizePostContent(post.content || '');
  }, [post.content]);

  return (
    <div className="text-base text-gray-800 break-words">
      {post.title && (
        <h1 
          ref={postTitleRef} 
          className="text-base md:text-2xl font-bold text-gray-900 leading-tight mb-1"
        >
          {toTitleCase(post.title)}
        </h1>
      )}
      <div 
        className="prose max-w-none min-h-0"
        dangerouslySetInnerHTML={{ __html: sanitizedContent }} 
      />
    </div>
  );
}
