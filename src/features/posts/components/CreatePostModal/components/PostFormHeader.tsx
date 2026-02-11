import React from 'react';
import type { PostFormHeaderProps } from '../types';

/**
 * Header component — avatar + user/space context
 */
export const PostFormHeader: React.FC<PostFormHeaderProps> = ({
  userName,
  userAvatarUrl,
  spaceName,
  editMode = false
}) => {
  return (
    <div className="flex items-center gap-3 pb-3">
      <div className="h-10 w-10 flex-shrink-0 overflow-hidden rounded-full ring-2 ring-gray-100 dark:ring-gray-700">
        {userAvatarUrl ? (
          <img src={userAvatarUrl} alt={userName} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-teal-500 to-teal-700 text-white font-semibold text-sm">
            {userName?.charAt(0).toUpperCase()}
          </div>
        )}
      </div>
      <div className="flex flex-col">
        <span className="text-sm font-semibold text-gray-900 dark:text-white leading-tight">
          {userName}
        </span>
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {editMode ? 'Editing in' : 'Posting in'}{' '}
          <span className="font-semibold text-teal-600 dark:text-teal-400">
            {spaceName}
          </span>
        </span>
      </div>
    </div>
  );
};