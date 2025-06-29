import { serve } from 'std/http/server.ts';
import { createClient } from 'supabase';
import { z } from 'zod';
import { APIValidation } from '../_shared/validation.ts';

// Create post request schema
const createPostRequestSchema = z.object({
  metadata: z.object({
    timestamp: z.number(),
    version: z.string(),
    deviceId: z.string().optional(),
    source: z.enum(['web', 'mobile', 'api']).default('web')
  }),
  data: z.object({
    title: z.string()
      .min(3, 'Title must be at least 3 characters')
      .max(200, 'Title must be less than 200 characters')
      .regex(/^[\w\s\-.,!?'"()]+$/, 'Title contains invalid characters'),
    content: z.string()
      .min(1, 'Content is required')
      .max(50000, 'Content must be less than 50,000 characters'),
    spaceId: z.string().uuid('Invalid space ID'),
    media: z.array(z.object({
      url: z.string().url('Invalid media URL'),
      type: z.enum(['image', 'video', 'document']),
      size: z.number().max(100 * 1024 * 1024, 'File size must be less than 100MB'),
      mimeType: z.string().regex(/^(image|video|application)\/.+$/, 'Invalid file type')
    })).max(10, 'Maximum 10 media items allowed').optional(),
    tags: z.array(z.string()).max(5, 'Maximum 5 tags allowed').optional(),
    isDraft: z.boolean().default(false),
    scheduledFor: z.string().datetime().optional()
  })
});

// Initialize validation
const apiValidation = APIValidation.getInstance();

serve(async (req: Request) => {
  try {
    // Get Supabase client
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({
          code: 'UNAUTHORIZED',
          message: 'Missing authorization header',
          timestamp: Date.now()
        }),
        { 
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: { headers: { Authorization: authHeader } }
      }
    );

    // Get user
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser();

    if (userError || !user) {
      return new Response(
        JSON.stringify({
          code: 'UNAUTHORIZED',
          message: 'Invalid authorization',
          timestamp: Date.now()
        }),
        {
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Check rate limit
    const rateLimit = await apiValidation.checkRateLimit('/create-post', user.id);
    if (!rateLimit.allowed) {
      return new Response(
        JSON.stringify({
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Too many requests',
          details: {
            resetAt: rateLimit.resetAt,
            remaining: rateLimit.remaining
          },
          timestamp: Date.now()
        }),
        {
          status: 429,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Parse and validate request
    const payload = await req.json();
    const validation = await apiValidation.validateRequest(
      '/create-post',
      payload,
      createPostRequestSchema
    );

    if (!validation.isValid) {
      return new Response(
        JSON.stringify({
          code: 'VALIDATION_ERROR',
          message: 'Invalid request payload',
          details: { errors: validation.errors },
          timestamp: Date.now()
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Create post
    const { data: post, error: postError } = await supabaseClient
      .from('posts')
      .insert({
        title: validation.sanitizedData.data.title,
        content: validation.sanitizedData.data.content,
        space_id: validation.sanitizedData.data.spaceId,
        media: validation.sanitizedData.data.media,
        tags: validation.sanitizedData.data.tags,
        is_draft: validation.sanitizedData.data.isDraft,
        scheduled_for: validation.sanitizedData.data.scheduledFor,
        author_id: user.id
      })
      .select()
      .single();

    if (postError) {
      return new Response(
        JSON.stringify({
          code: 'DATABASE_ERROR',
          message: 'Failed to create post',
          timestamp: Date.now()
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    return new Response(
      JSON.stringify({
        data: post,
        timestamp: Date.now()
      }),
      {
        headers: { 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred',
        timestamp: Date.now()
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}); 