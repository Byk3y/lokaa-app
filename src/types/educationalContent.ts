/**
 * Educational Content Management System Types
 * 
 * This file contains type definitions for the new educational content system
 * that properly separates educational content from social posts.
 * 
 * This replaces the terrible practice of storing lessons as posts.
 */

// ============================================================================
// ENUMS
// ============================================================================

export type EducationalContentType = 
  | 'text'
  | 'rich_text'
  | 'video_upload'
  | 'video_embed'
  | 'image'
  | 'document'
  | 'audio'
  | 'quiz'
  | 'assignment'
  | 'external_link';

export type ContentDifficulty = 
  | 'beginner'
  | 'intermediate'
  | 'advanced';

export type VideoProvider = 
  | 'youtube'
  | 'vimeo'
  | 'uploaded'
  | 'external'
  | 'wistia'
  | 'loom';

export type ProcessingStatus = 
  | 'pending'
  | 'processing'
  | 'completed'
  | 'failed';

// ============================================================================
// CORE EDUCATIONAL CONTENT
// ============================================================================

export interface EducationalContent {
  id: string;
  
  // Content identification
  title: string;
  content_type: EducationalContentType;
  
  // Text content (for text and rich_text types)
  text_content?: string | null;
  
  // Media content
  media_url?: string | null;
  media_metadata?: Record<string, any>;
  thumbnail_url?: string | null;
  
  // Embed data (for video_embed, external_link)
  embed_data?: Record<string, any>;
  
  // Content settings
  estimated_duration?: number | null; // in minutes
  difficulty_level?: ContentDifficulty | null;
  
  // Timestamps
  created_at: string;
  updated_at: string;
}

// ============================================================================
// ENHANCED COURSE LESSON
// ============================================================================

export interface EnhancedCourseLesson {
  id: string;
  module_id: string;
  title: string;
  
  // Reference to educational content (NEW - replaces post_id)
  content_id?: string | null;
  
  // Legacy fields (will be deprecated after migration)
  content_type: string;
  content_text?: string | null;
  content_url?: string | null;
  post_id?: string | null; // DEPRECATED - will be removed
  page_type?: string | null;
  
  // Enhanced fields
  lesson_order: number;
  is_published?: boolean;
  estimated_duration?: number | null; // in minutes
  difficulty_level?: ContentDifficulty | null;
  prerequisites?: string[]; // Array of lesson IDs
  learning_objectives?: string[];
  
  // Timestamps
  created_at: string;
  updated_at: string;
  
  // Relationships (populated when needed)
  educational_content?: EducationalContent;
  course_videos?: CourseVideo[];
  content_blocks?: LessonContentBlock[];
}

// ============================================================================
// COURSE MEDIA
// ============================================================================

export interface CourseMedia {
  id: string;
  
  // Relationships
  course_id: string;
  lesson_id?: string | null;
  content_id?: string | null;
  
  // Media information
  media_type: EducationalContentType;
  file_name: string;
  file_url: string;
  storage_path?: string | null;
  
  // File metadata
  file_size?: number | null; // in bytes
  mime_type?: string | null;
  duration?: number | null; // in seconds for video/audio
  dimensions?: {
    width: number;
    height: number;
  } | null;
  
  // Media processing
  processing_status?: ProcessingStatus;
  processing_metadata?: Record<string, any>;
  
  // Timestamps
  created_at: string;
  updated_at: string;
}

// ============================================================================
// LESSON CONTENT BLOCKS
// ============================================================================

export interface LessonContentBlock {
  id: string;
  
  // Relationships
  lesson_id: string;
  content_id: string;
  
  // Block ordering and settings
  block_order: number;
  block_settings?: Record<string, any>;
  
  // Timestamp
  created_at: string;
  
  // Relationships (populated when needed)
  educational_content?: EducationalContent;
}

// ============================================================================
// COURSE VIDEOS
// ============================================================================

export interface CourseVideo {
  id: string;
  
  // Relationships
  lesson_id: string;
  content_id?: string | null;
  
  // Video information
  title: string;
  description?: string | null;
  video_url: string;
  thumbnail_url?: string | null;
  
  // Video metadata
  duration?: number | null; // in seconds
  video_provider?: VideoProvider | null;
  provider_video_id?: string | null; // For YouTube/Vimeo IDs
  
  // Quality and accessibility
  quality_options?: Record<string, any>;
  subtitles?: Record<string, any>;
  closed_captions?: Record<string, any>;
  
  // Video settings
  auto_play?: boolean;
  show_controls?: boolean;
  allow_download?: boolean;
  
  // Timestamps
  created_at: string;
  updated_at: string;
  
  // Relationships (populated when needed)
  educational_content?: EducationalContent;
}

// ============================================================================
// ENHANCED LESSON PROGRESS
// ============================================================================

export interface EnhancedLessonCompletion {
  id: string;
  lesson_id: string;
  user_id: string;
  course_id: string;
  module_id: string;
  
  // Enhanced progress tracking
  progress_percentage?: number; // 0-100
  time_spent?: number; // in seconds
  last_position?: number; // for video/audio position
  completion_data?: Record<string, any>; // quiz scores, assignment data, etc.
  
  // Timestamp
  completed_at?: string | null;
}

// ============================================================================
// CONTENT VERSIONING
// ============================================================================

export interface EducationalContentVersion {
  id: string;
  
  // Relationships
  content_id: string;
  
  // Version information
  version_number: number;
  version_name?: string | null;
  change_description?: string | null;
  
  // Versioned content (snapshot)
  content_snapshot: Record<string, any>;
  
  // Version metadata
  created_by?: string | null;
  created_at: string;
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

// For creating new educational content
export interface CreateEducationalContentPayload {
  title: string;
  content_type: EducationalContentType;
  text_content?: string | null;
  media_url?: string | null;
  embed_data?: Record<string, any>;
  estimated_duration?: number | null;
  difficulty_level?: ContentDifficulty | null;
}

// For updating educational content
export interface UpdateEducationalContentPayload {
  title?: string;
  text_content?: string | null;
  media_url?: string | null;
  embed_data?: Record<string, any>;
  estimated_duration?: number | null;
  difficulty_level?: ContentDifficulty | null;
}

// For creating lessons with the new system
export interface CreateLessonPayload {
  title: string;
  module_id: string;
  lesson_order?: number;
  educational_content: CreateEducationalContentPayload;
  is_published?: boolean;
  prerequisites?: string[];
  learning_objectives?: string[];
}

// For lesson content with full relationships
export interface LessonWithContent extends EnhancedCourseLesson {
  educational_content: EducationalContent;
  course_videos: CourseVideo[];
  content_blocks: LessonContentBlock[];
}

// Legacy compatibility type (for gradual migration)
export interface LegacyCourseLesson {
  id: string;
  title: string;
  content_type: string;
  content_url?: string | null;
  content_text?: string | null;
  lesson_order: number;
  module_id: string;
  post_id?: string | null; // DEPRECATED
}

// ============================================================================
// API RESPONSE TYPES
// ============================================================================

export interface EducationalContentResponse {
  data: EducationalContent[];
  total: number;
  page: number;
  limit: number;
}

export interface LessonContentResponse {
  lesson: LessonWithContent;
  next_lesson?: EnhancedCourseLesson | null;
  previous_lesson?: EnhancedCourseLesson | null;
}

// ============================================================================
// ERROR TYPES
// ============================================================================

export interface EducationalContentError {
  code: string;
  message: string;
  details?: Record<string, any>;
}

// ============================================================================
// CONSTANTS
// ============================================================================

export const CONTENT_TYPE_LABELS: Record<EducationalContentType, string> = {
  text: 'Text Content',
  rich_text: 'Rich Text',
  video_upload: 'Uploaded Video',
  video_embed: 'Embedded Video',
  image: 'Image',
  document: 'Document',
  audio: 'Audio',
  quiz: 'Quiz',
  assignment: 'Assignment',
  external_link: 'External Link'
};

export const DIFFICULTY_LABELS: Record<ContentDifficulty, string> = {
  beginner: 'Beginner',
  intermediate: 'Intermediate',
  advanced: 'Advanced'
};

export const VIDEO_PROVIDER_LABELS: Record<VideoProvider, string> = {
  youtube: 'YouTube',
  vimeo: 'Vimeo',
  uploaded: 'Uploaded Video',
  external: 'External Video',
  wistia: 'Wistia',
  loom: 'Loom'
};

// ============================================================================
// TYPE GUARDS
// ============================================================================

export function isEducationalContent(obj: any): obj is EducationalContent {
  return obj && typeof obj.id === 'string' && typeof obj.content_type === 'string';
}

export function isEnhancedLesson(obj: any): obj is EnhancedCourseLesson {
  return obj && typeof obj.id === 'string' && typeof obj.module_id === 'string';
}

export function isVideoContent(content: EducationalContent): boolean {
  return content.content_type === 'video_upload' || content.content_type === 'video_embed';
}

export function isTextContent(content: EducationalContent): boolean {
  return content.content_type === 'text' || content.content_type === 'rich_text';
}

// ============================================================================
// MIGRATION HELPERS
// ============================================================================

// Helper to convert legacy lesson to new format
export function migrateLegacyLesson(legacyLesson: LegacyCourseLesson): EnhancedCourseLesson {
  return {
    ...legacyLesson,
    is_published: true, // Assume existing lessons are published
    prerequisites: [],
    learning_objectives: [],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

// Helper to check if lesson is using new system
export function isUsingNewContentSystem(lesson: EnhancedCourseLesson): boolean {
  return Boolean(lesson.content_id);
}

// Helper to check if lesson needs migration
export function needsMigration(lesson: EnhancedCourseLesson): boolean {
  return Boolean(lesson.post_id) && !lesson.content_id;
} 