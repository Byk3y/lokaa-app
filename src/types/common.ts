/**
 * Common Type Definitions
 * 
 * This file contains shared type definitions used across multiple components
 * to improve type safety and reduce 'any' usage throughout the application.
 */

/**
 * Generic API Response structure
 */
export interface ApiResponse<T = unknown> {
  data: T;
  error: string | null;
  success: boolean;
  message?: string;
}

/**
 * Generic API Error structure
 */
export interface ApiError {
  message: string;
  code?: string;
  details?: Record<string, unknown>;
}

/**
 * Pagination metadata
 */
export interface PaginationMeta {
  currentPage: number;
  totalPages: number;
  totalCount: number;
  pageSize: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

/**
 * Paginated response structure
 */
export interface PaginatedResponse<T> {
  data: T[];
  pagination: PaginationMeta;
  error: string | null;
}

/**
 * User profile data structure
 */
export interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
  timezone?: string;
  bio?: string;
  location?: string;
  website?: string;
}

/**
 * Post data structure
 */
export interface PostData {
  id: string;
  title: string;
  content: string;
  author_id: string;
  space_id: string;
  category_id: string | null;
  created_at: string;
  updated_at: string;
  like_count: number;
  comment_count: number;
  is_pinned: boolean;
  is_deleted: boolean;
  attachments?: AttachmentData[];
  author?: UserProfile;
}

/**
 * Comment data structure
 */
export interface CommentData {
  id: string;
  post_id: string;
  author_id: string;
  parent_id: string | null;
  content: string;
  created_at: string;
  updated_at: string;
  like_count: number;
  is_deleted: boolean;
  author?: UserProfile;
  replies?: CommentData[];
}

/**
 * Attachment data structure
 */
export interface AttachmentData {
  id: string;
  post_id: string;
  file_name: string;
  file_type: string;
  file_size: number;
  file_url: string;
  created_at: string;
}

/**
 * Category data structure
 */
export interface CategoryData {
  id: string;
  name: string;
  description: string | null;
  color: string;
  space_id: string;
  post_count: number;
  created_at: string;
  updated_at: string;
}

/**
 * Event handler types
 */
export interface BaseEventHandler<T = unknown> {
  (payload: T): void;
}

export interface AsyncEventHandler<T = unknown> {
  (payload: T): Promise<void>;
}

/**
 * Real-time event payload structure
 */
export interface RealtimeEventPayload<T = unknown> {
  event: string;
  type: 'INSERT' | 'UPDATE' | 'DELETE';
  schema: string;
  table: string;
  new: T | null;
  old: T | null;
  timestamp: string;
}

/**
 * Form field error structure
 */
export interface FieldError {
  field: string;
  message: string;
  code?: string;
}

/**
 * Form validation result
 */
export interface ValidationResult {
  isValid: boolean;
  errors: FieldError[];
}

/**
 * Select option for dropdowns and selects
 */
export interface SelectOption<T = string> {
  value: T;
  label: string;
  disabled?: boolean;
  description?: string;
}

/**
 * Tab definition for tab components
 */
export interface TabDefinition {
  id: string;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  disabled?: boolean;
  badge?: string | number;
}

/**
 * Modal props base interface
 */
export interface BaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
}

/**
 * Loading state interface
 */
export interface LoadingState {
  isLoading: boolean;
  error: string | null;
  lastUpdated: string | null;
}

/**
 * Cache entry interface
 */
export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
  key: string;
}

/**
 * Search result interface
 */
export interface SearchResult<T> {
  items: T[];
  total: number;
  query: string;
  took: number;
  filters?: Record<string, unknown>;
}

/**
 * Notification data structure
 */
export interface NotificationData {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  action?: {
    label: string;
    url: string;
  };
}

/**
 * Theme configuration
 */
export interface ThemeConfig {
  mode: 'light' | 'dark' | 'system';
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  borderRadius: 'none' | 'sm' | 'md' | 'lg' | 'xl';
}

/**
 * Generic store state interface
 */
export interface BaseStoreState<T> {
  data: T | null;
  isLoading: boolean;
  error: string | null;
  lastFetch: string | null;
}

/**
 * Generic async action result
 */
export interface AsyncActionResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
}