export interface SearchResult {
  id: string;
  title?: string;
  content?: string;
  user_id?: string;
  user_full_name?: string;
  user_avatar_url?: string;
  user_profile_url?: string;
  name?: string;
  description?: string;
  space_id?: string;
  category_id?: string;
  category_name?: string;
  category_icon?: string;
  like_count?: number;
  comment_count?: number;
  is_pinned?: boolean;
  is_private?: boolean;
  member_count?: number;
  created_at: string;
  updated_at?: string;
  rank: number;
  // URL slug for navigation
  slug?: string;
  // Comment-specific fields
  comment_id?: string | null;
  comment_content?: string | null;
  comment_user_id?: string | null;
  comment_user_name?: string | null;
  comment_user_avatar?: string | null;
  comment_created_at?: string | null;
  comment_like_count?: number;
  result_type?: 'post' | 'comment';
}

export interface SearchFilters {
  limit?: number;
  offset?: number;
  category_id?: string;
  date_from?: string;
  date_to?: string;
  user_id?: string;
  sort_by?: 'relevance' | 'date' | 'popularity';
  // New properties for optimized search
  noCache?: boolean;
  includeComments?: boolean;
  categoryId?: string; // Alias for category_id for consistency
  dateFilter?: string; // PostgreSQL interval string (e.g., '7 days', '1 month')
}

export interface SearchState {
  query: string;
  results: SearchResult[];
  isLoading: boolean;
  hasMore: boolean;
  error: string | null;
  filters: SearchFilters;
}

export interface SearchSuggestion {
  id: string;
  text: string;
  type: 'recent' | 'popular' | 'suggestion';
}

export type SearchType = 'posts' | 'spaces' | 'members';