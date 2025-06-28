import React from 'react';
import { PostTemplateSelector } from '../../PostTemplateSelector';
import type { PostFormInputsProps } from '../types';

/**
 * Form inputs component for title and content
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
    <>
      {/* Title Input */}
      <div>
        <input
          id="post-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Give your post a title"
          className="block w-full rounded-md py-2 sm:py-3 px-3 text-base font-semibold font-sans tracking-tight capitalize placeholder-gray-400 focus:outline-none focus:ring-0 border-b-2 border-gray-200 focus:border-teal-500 transition-colors dark:bg-gray-800 dark:text-white dark:border-gray-700 dark:focus:border-teal-400"
        />
      </div>

      {/* Content Textarea */}
      <div>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="What's on your mind?"
          rows={4}
          ref={contentTextareaRef}
          spellCheck={true}
          autoCapitalize="sentences"
          className="block w-full rounded-md py-2 px-3 text-sm sm:text-base font-normal font-sans normal-case leading-relaxed placeholder-gray-400 focus:outline-none focus:ring-0 dark:bg-gray-800 dark:text-white"
        />
        <p className="text-xs text-gray-500 mt-2 dark:text-gray-400">
          Please keep posts respectful and relevant to the space.
        </p>
      </div>

      {/* Post Template Selector */}
      {showFunPostIdeas && (
        <div className="my-5">
          <PostTemplateSelector
            visible={showFunPostIdeas}
            onClose={() => setShowFunPostIdeas(false)}
            onTemplateSelect={applyPostTemplate} 
          />
        </div>
      )}
    </>
  );
}; 