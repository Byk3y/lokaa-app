import React, { useMemo } from 'react';
import type { PostCardProps } from '@/features/posts/types';
import { toTitleCase } from '@/utils/textFormatting';

interface PostContentProps {
  post: PostCardProps;
  postTitleRef: React.RefObject<HTMLHeadingElement>;
}

export default function PostContent({ post, postTitleRef }: PostContentProps) {
  // Sanitize content to prevent XSS
  const sanitizedContent = useMemo(() => {
    // A more robust library like DOMPurify should be used in a real app
    if (typeof DOMParser === 'undefined') {
      return post.content;
    }
    const parser = new DOMParser();
    const doc = parser.parseFromString(post.content, 'text/html');
    return doc.body.innerHTML;
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
        className="prose max-w-none"
        dangerouslySetInnerHTML={{ __html: sanitizedContent }} 
      />
    </div>
  );
}
