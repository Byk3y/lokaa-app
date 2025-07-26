/**
 * Classroom System Type Definitions
 * 
 * This file contains type definitions for the classroom/course system
 * to replace the extensive 'any' usage in classroom components.
 */

import { UserProfile } from './common';

/**
 * Course data structure
 */
export interface CourseData {
  id: string;
  title: string;
  description: string;
  slug: string;
  space_id: string;
  instructor_id: string;
  status: 'draft' | 'published' | 'archived';
  level: 'beginner' | 'intermediate' | 'advanced';
  category: string;
  tags: string[];
  thumbnail_url: string | null;
  cover_image_url: string | null;
  duration_minutes: number;
  enrolled_count: number;
  rating: number;
  price: number;
  currency: string;
  is_free: boolean;
  created_at: string;
  updated_at: string;
  published_at: string | null;
  instructor?: UserProfile;
  lessons?: LessonData[];
  modules?: ModuleData[];
}

/**
 * Lesson data structure
 */
export interface LessonData {
  id: string;
  title: string;
  description: string;
  content: string;
  course_id: string;
  module_id: string | null;
  order_index: number;
  duration_minutes: number;
  type: 'video' | 'text' | 'quiz' | 'assignment';
  video_url: string | null;
  video_duration: number | null;
  attachment_urls: string[];
  is_preview: boolean;
  is_published: boolean;
  created_at: string;
  updated_at: string;
  completion_rate: number;
  quiz_data?: QuizData;
  assignment_data?: AssignmentData;
}

/**
 * Module data structure (for organizing lessons)
 */
export interface ModuleData {
  id: string;
  title: string;
  description: string;
  course_id: string;
  order_index: number;
  duration_minutes: number;
  lesson_count: number;
  is_published: boolean;
  created_at: string;
  updated_at: string;
  lessons?: LessonData[];
}

/**
 * Quiz data structure
 */
export interface QuizData {
  id: string;
  lesson_id: string;
  title: string;
  description: string;
  questions: QuizQuestion[];
  time_limit_minutes: number | null;
  max_attempts: number;
  passing_score: number;
  shuffle_questions: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Quiz question structure
 */
export interface QuizQuestion {
  id: string;
  question: string;
  type: 'multiple_choice' | 'true_false' | 'short_answer' | 'essay';
  options: string[];
  correct_answer: string | string[];
  explanation: string | null;
  points: number;
  order_index: number;
}

/**
 * Assignment data structure
 */
export interface AssignmentData {
  id: string;
  lesson_id: string;
  title: string;
  description: string;
  instructions: string;
  due_date: string | null;
  max_points: number;
  submission_type: 'file' | 'text' | 'url';
  allowed_file_types: string[];
  max_file_size: number;
  created_at: string;
  updated_at: string;
}

/**
 * Student enrollment data
 */
export interface EnrollmentData {
  id: string;
  student_id: string;
  course_id: string;
  enrolled_at: string;
  completed_at: string | null;
  progress_percentage: number;
  last_accessed_at: string | null;
  status: 'active' | 'completed' | 'dropped' | 'suspended';
  certificate_url: string | null;
  student?: UserProfile;
  course?: CourseData;
}

/**
 * Progress tracking data
 */
export interface ProgressData {
  id: string;
  student_id: string;
  lesson_id: string;
  course_id: string;
  status: 'not_started' | 'in_progress' | 'completed';
  completion_percentage: number;
  time_spent_minutes: number;
  last_position: number;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Quiz attempt data
 */
export interface QuizAttemptData {
  id: string;
  quiz_id: string;
  student_id: string;
  attempt_number: number;
  answers: QuizAnswer[];
  score: number;
  max_score: number;
  percentage: number;
  passed: boolean;
  started_at: string;
  completed_at: string | null;
  time_taken_minutes: number;
}

/**
 * Quiz answer structure
 */
export interface QuizAnswer {
  question_id: string;
  answer: string | string[];
  is_correct: boolean;
  points_earned: number;
  time_taken_seconds: number;
}

/**
 * Assignment submission data
 */
export interface AssignmentSubmissionData {
  id: string;
  assignment_id: string;
  student_id: string;
  submission_text: string | null;
  file_urls: string[];
  url_submission: string | null;
  submitted_at: string;
  graded_at: string | null;
  score: number | null;
  max_score: number;
  feedback: string | null;
  status: 'submitted' | 'graded' | 'returned';
  graded_by: string | null;
  grader?: UserProfile;
}

/**
 * Classroom store state
 */
export interface ClassroomStoreState {
  courses: CourseData[];
  currentCourse: CourseData | null;
  lessons: LessonData[];
  modules: ModuleData[];
  enrollments: EnrollmentData[];
  progress: ProgressData[];
  isLoading: boolean;
  error: string | null;
  lastFetch: string | null;
}

/**
 * Course creation payload
 */
export interface CreateCoursePayload {
  title: string;
  description: string;
  level: 'beginner' | 'intermediate' | 'advanced';
  category: string;
  tags: string[];
  price: number;
  is_free: boolean;
  thumbnail?: File;
  cover_image?: File;
}

/**
 * Lesson creation payload
 */
export interface CreateLessonPayload {
  title: string;
  description: string;
  content: string;
  course_id: string;
  module_id?: string;
  type: 'video' | 'text' | 'quiz' | 'assignment';
  duration_minutes: number;
  video_url?: string;
  attachments?: File[];
  is_preview: boolean;
}

/**
 * Course filter options
 */
export interface CourseFilters {
  level?: 'beginner' | 'intermediate' | 'advanced';
  category?: string;
  tags?: string[];
  price_range?: {
    min: number;
    max: number;
  };
  duration_range?: {
    min: number;
    max: number;
  };
  rating_min?: number;
  is_free?: boolean;
  search?: string;
}

/**
 * Classroom analytics data
 */
export interface ClassroomAnalytics {
  total_courses: number;
  total_students: number;
  total_lessons: number;
  average_completion_rate: number;
  total_hours_watched: number;
  revenue: number;
  enrollment_trend: {
    date: string;
    count: number;
  }[];
  popular_courses: CourseData[];
  completion_rates: {
    course_id: string;
    course_title: string;
    completion_rate: number;
  }[];
}

/**
 * Dialog state types for classroom management
 */
export interface CourseDialogState {
  isOpen: boolean;
  mode: 'create' | 'edit' | 'view';
  course?: any;
}

export interface ModuleDialogState {
  isOpen: boolean;
  mode: 'create' | 'edit' | 'delete';
  module?: any;
}

export interface LessonDialogState {
  isOpen: boolean;
  mode: 'create' | 'edit' | 'view';
  lesson?: any;
  moduleId?: string;
  module?: any;
}

export interface FolderDialogState {
  isOpen: boolean;
  mode: 'create' | 'edit' | 'delete';
  folder?: any;
}

/**
 * Classroom event types
 */
export interface ClassroomEventData {
  course_enrolled: {
    course_id: string;
    student_id: string;
    enrollment_id: string;
  };
  lesson_completed: {
    lesson_id: string;
    student_id: string;
    progress_id: string;
  };
  quiz_attempted: {
    quiz_id: string;
    student_id: string;
    attempt_id: string;
    score: number;
    passed: boolean;
  };
  assignment_submitted: {
    assignment_id: string;
    student_id: string;
    submission_id: string;
  };
  course_completed: {
    course_id: string;
    student_id: string;
    completion_date: string;
  };
}