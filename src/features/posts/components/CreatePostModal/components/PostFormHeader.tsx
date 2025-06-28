import React from 'react';
import type { PostFormHeaderProps } from '../types';

/**
 * Header component showing user info and space context
 */
export const PostFormHeader: React.FC<PostFormHeaderProps> = ({
  userName,
  userAvatarUrl,
  spaceName,
  editMode = false
}) => {
  return (
    <div className="flex items-center">
      <div className="h-9 w-9 flex-shrink-0 overflow-hidden rounded-full bg-gray-200">
        {userAvatarUrl ? (
          <img src={userAvatarUrl} alt={userName} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-teal-600 text-white">
            {userName?.charAt(0).toUpperCase()}
          </div>
        )}
      </div>
      <div className="ml-3">
        <span className="text-base font-medium text-gray-800 dark:text-white">
          {userName} <span className="text-gray-600">
            {editMode ? 'editing post in' : 'posting in'}
          </span> <span className="font-bold text-teal-600 text-lg">
            {spaceName.charAt(0).toUpperCase() + spaceName.slice(1)}
          </span>
        </span>
      </div>
    </div>
  );
}; 