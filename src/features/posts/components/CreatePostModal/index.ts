/**
 * CreatePostModal - Refactored Component Architecture
 * 
 * This index file exports the unified CreatePostModal component, which handles
 * both desktop and mobile views, along with its supporting components and hooks.
 */

// Export the new, unified CreatePostModal component
export { CreatePostModal } from './CreatePostModal';

// Form Components
export { PostFormHeader } from './components/PostFormHeader';

// Hooks
export { useCreatePostModal } from './hooks/useCreatePostModal';

// Types
export type * from './types'; 