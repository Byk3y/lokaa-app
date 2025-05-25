import React, { useMemo } from 'react';
import { capitalizeFirstLetter } from "@/utils/formatters";
import { extractFirstGifAndRest } from '@/utils/mediaUtils';
import { cn } from '@/lib/utils';

interface PostCardContentProps {
  title?: string | null;
  content: string;
  shouldTruncate?: boolean; 
  onReadMoreClick?: (e: React.MouseEvent) => void;
  className?: string;
}

/**
 * Content component for PostCard showing the title and text content
 */
export const PostCardContent: React.FC<PostCardContentProps> = ({
  title,
  content,
  shouldTruncate = true,
  onReadMoreClick,
  className,
}) => {
  // Process content to separate first GIF and the rest
  const { restOfContent, firstGifUrl } = useMemo(
    () => extractFirstGifAndRest(content),
    [content]
  );

  // Simplified plain text content for line clamping
  const plainTextContent = useMemo(() => {
    if (!restOfContent) return '';
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = restOfContent;
    return tempDiv.textContent || tempDiv.innerText || '';
  }, [restOfContent]);
  
  // Check if content should be truncated based on word count
  const isTruncated = useMemo(() => {
    if (!shouldTruncate) return false;
    const wordCount = plainTextContent.split(/\s+/).length;
    return wordCount > 50; // This threshold can be adjusted
  }, [plainTextContent, shouldTruncate]);
  
  // Handle "Read more" click
  const handleReadMoreClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onReadMoreClick) {
      onReadMoreClick(e);
    }
  };

  return (
    <div className={cn("flex-grow flex flex-col min-w-0 overflow-hidden", className)}>
      {title && (
        <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-0.5 truncate break-words">
          {capitalizeFirstLetter(title)}
        </h2>
      )}
      
      {plainTextContent ? (
        <div className="text-sm sm:text-base font-normal text-gray-700 leading-snug break-words">
          <p className={shouldTruncate ? "line-clamp-2" : ""}>
            {plainTextContent}
          </p>
          {isTruncated && (
            <span 
              onClick={handleReadMoreClick} 
              className="text-blue-600 hover:text-blue-800 text-xs sm:text-sm font-medium cursor-pointer"
            >
              ... Read more
            </span>
          )}
        </div>
      ) : (
        // Fallback for empty content
        !title && <p className="text-sm sm:text-base text-gray-500 italic">Post content is empty.</p>
      )}
    </div>
  );
}; 