import type { User as AuthUserType } from "@/contexts/AuthContext";
import type { Attachment } from "@/features/posts/types";

// Category types
export interface GoodCategoryType {
  id: string;
  name: string;
  icon?: string | null;
}

export interface ErrorCategoryType {
  error: unknown; 
  // Potentially other fields that Supabase might send in an error, like message: string
}

// Core post type used throughout the feed
export interface FetchedPostType {
  id: string;
  created_at: string | null;
  content: string;
  title: string | null;
  like_count: number | null;
  comment_count: number | null;
  user_id: string;
  space_id: string;
  media_urls?: Attachment[] | null;
  category: GoodCategoryType | null; // Simplified: we will process errors into null
  author: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
    profile_url: string | null;
    activity_score?: number | null;
  } | null; 
  is_pinned?: boolean;
  pinned_at?: string | null;
  pin_position?: number | null;
  pin_category?: string | null;
  edited_at?: string | null;
  poll_data?: string[] | null;
}

// Component props
export interface FeedTabProps {
  user: AuthUserType;
  isOwner: boolean;
  isAdmin: boolean;
  postInputRef?: React.RefObject<HTMLTextAreaElement | HTMLInputElement>;
  hasInstantAccess?: boolean;
}

// Owner details interface
export interface OwnerDetails {
  display_name: string | null;
  avatar_url: string | null;
}

// Permission-related types
export interface EffectivePermissions {
  effectiveIsOwner: boolean;
  effectiveIsAdmin: boolean;
  canAccessSettings: boolean;
}

// Modal state interface
export interface FeedModalState {
  isCreatePostOpen: boolean;
  isCategoryOpen: boolean;
  isPostDetailOpen: boolean;
  selectedPostForModal: any | null;
}

// Filter and sorting types
export interface PostSortingOptions {
  sortByPosition: boolean;
  sortByDate: boolean;
  combinePinnedWithRegular: boolean;
} 