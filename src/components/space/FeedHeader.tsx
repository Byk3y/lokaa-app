import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface FeedHeaderProps {
  currentUser: {
    email?: string;
    user_metadata?: {
      avatar_url?: string;
    };
  } | null;
  onOpenCreatePostModal: () => void;
}

export default function FeedHeader({
  currentUser,
  onOpenCreatePostModal,
}: FeedHeaderProps) {
  return (
    <div className="space-y-4 px-4 sm:px-0">
      {/* Composer Area - Responsive width instead of fixed */}
      <div
        className="bg-white dark:bg-gray-800 shadow-lg border border-gray-200 rounded-lg p-2 sm:p-4 w-full max-w-full md:w-[768px] md:max-w-[768px] md:min-w-[768px] md:flex-shrink-0 md:flex-grow-0 cursor-pointer transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary/30"
        onClick={onOpenCreatePostModal}
        tabIndex={0}
        role="button"
      >
        <div className="flex items-center space-x-2 sm:space-x-3">
          <Avatar className="h-8 w-8 sm:h-10 sm:w-10">
            <AvatarImage src={currentUser?.user_metadata?.avatar_url || undefined} />
            <AvatarFallback>{currentUser?.email?.[0]?.toUpperCase()}</AvatarFallback>
          </Avatar>
          <div 
            className="flex-grow text-gray-600 text-base sm:text-lg font-semibold px-1 transition-colors rounded-md hover:text-gray-900"
          >
            Write something...
          </div> 
          {/* You can add more composer actions here if needed */}
        </div>
      </div>
    </div>
  );
} 