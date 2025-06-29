/**
 * Post Validation Schemas
 * 
 * Central validation schemas for post-related forms
 */

import { z } from 'zod';

// Media validation
const mediaSchema = z.object({
  url: z.string().url('Invalid media URL'),
  type: z.enum(['image', 'video', 'document']),
  size: z.number().max(100 * 1024 * 1024, 'File size must be less than 100MB'),
  mimeType: z.string().regex(/^(image|video|application)\/.+$/, 'Invalid file type')
});

// Base post schema
export const basePostSchema = z.object({
  title: z.string()
    .min(3, 'Title must be at least 3 characters')
    .max(200, 'Title must be less than 200 characters')
    .regex(/^[\w\s\-.,!?'"()]+$/, 'Title contains invalid characters'),
  content: z.string()
    .min(1, 'Content is required')
    .max(50000, 'Content must be less than 50,000 characters'),
  spaceId: z.string().uuid('Invalid space ID'),
  media: z.array(mediaSchema).max(10, 'Maximum 10 media items allowed').optional(),
  tags: z.array(z.string()).max(5, 'Maximum 5 tags allowed').optional()
});

// Create post schema
export const createPostSchema = basePostSchema.extend({
  isDraft: z.boolean().default(false),
  scheduledFor: z.date().optional()
});

// Update post schema
export const updatePostSchema = basePostSchema.extend({
  id: z.string().uuid('Invalid post ID'),
  version: z.number().int().positive('Invalid version number')
});

// Comment schema
export const commentSchema = z.object({
  content: z.string()
    .min(1, 'Comment cannot be empty')
    .max(5000, 'Comment must be less than 5,000 characters'),
  postId: z.string().uuid('Invalid post ID'),
  parentId: z.string().uuid('Invalid parent comment ID').optional(),
  media: z.array(mediaSchema).max(2, 'Maximum 2 media items allowed').optional()
});

// Post reaction schema
export const reactionSchema = z.object({
  postId: z.string().uuid('Invalid post ID'),
  type: z.enum(['like', 'heart', 'celebrate', 'insightful', 'curious']),
  userId: z.string().uuid('Invalid user ID')
}); 