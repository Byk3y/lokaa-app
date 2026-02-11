import React from 'react';
import { PostTemplateSelector } from '../../PostTemplateSelector';
import type { PostFormInputsProps } from '../types';
import { formatAsTitle } from '@/utils/textUtils';

/**
 * Title + content inputs — clean, minimal styling
 */
export const PostFormInputs: React.FC<PostFormInputsProps> = ({
  title,
  setTitle,
  content,
  setContent,
  contentTextareaRef,
  showFunPostIdeas,
  setShowFunPostIdeas,
  applyPostTemplate
}) => {
  return (
    <div className="space-y-1">
      {/* Title Input */}
      <input
        id="post-title"
        value={title}
        onChange={(e) => setTitle(formatAsTitle(e.target.value))}
        placeholder="Post title"
        className="block w-full py-2 text-lg font-semibold tracking-tight placeholder-gray-300 text-gray-900 dark:text-white bg-transparent border-0 border-b border-gray-100 dark:border-gray-700 focus:border-teal-500 dark:focus:border-teal-400 focus:outline-none focus:ring-0 transition-colors capitalize"
      />

      {/* Content Textarea */}
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="What's on your mind?"
        rows={5}
        ref={contentTextareaRef}
        spellCheck={true}
        autoCapitalize="sentences"
        className="block w-full py-3 text-sm leading-relaxed placeholder-gray-300 text-gray-700 dark:text-gray-200 bg-transparent border-0 focus:outline-none focus:ring-0 resize-none create-post-textarea"
        style={{ minHeight: '120px' }}
      />

      {/* Post Template Selector */}
      {showFunPostIdeas && (
        <div className="pt-2">
          <PostTemplateSelector
            visible={showFunPostIdeas}
            onClose={() => setShowFunPostIdeas(false)}
            onTemplateSelect={applyPostTemplate}
          />
        </div>
      )}
    </div>
  );
};