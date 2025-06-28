import { Avatar, AvatarImage, AvatarFallback } from '@/shared/components';
import { OptimizedAvatar } from '@/components/ui/OptimizedAvatar';
import { User } from '@supabase/supabase-js';

interface FeedHeaderProps {
  currentUser: User | null;
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
        data-composer="true"
      >
        <div className="flex items-center space-x-2 sm:space-x-3">
          <OptimizedAvatar
            user={{
              id: currentUser?.id || 'unknown',
              full_name: currentUser?.user_metadata?.full_name || currentUser?.email || 'User',
              avatar_url: currentUser?.user_metadata?.avatar_url || null
            }}
            size="md"
            enableLazyLoading={false} // 🚀 OPTIMIZED: Instant loading for feed header
            enableCaching={true}
            placeholderType="initials"
            loadingTransition="fade"
            className="h-8 w-8 sm:h-10 sm:w-10 flex-shrink-0"
          />
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