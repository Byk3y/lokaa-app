import { serve } from 'std/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';
import { corsHeaders } from '../_shared/cors.ts';
import { verifyToken } from '../_shared/csrf.ts';
import { validateSessionAndGetUser, createErrorResponse } from '../_shared/session.ts';
import { apiValidation } from '../_shared/validation.ts';

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

serve(async (req: Request) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Verify request method
    if (req.method !== 'POST') {
      return createErrorResponse('Method not allowed', 405);
    }

    // Verify CSRF token
    const csrfToken = req.headers.get('x-csrf-token');
    if (!csrfToken) {
      // Log CSRF failure
      const supabaseAdmin = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
        { auth: { autoRefreshToken: false, persistSession: false } }
      );

      await supabaseAdmin.from('analytics_events').insert({
        event_type: 'security.csrf_fail',
        event_data: {
          path: '/create-post',
          ip: req.headers.get('x-real-ip') || req.headers.get('x-forwarded-for'),
          reason: 'missing_token'
        }
      });

      return createErrorResponse('Missing CSRF token', 403);
    }

    const isValidToken = await verifyToken(csrfToken);
    if (!isValidToken) {
      // Log CSRF failure
      const supabaseAdmin = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
        { auth: { autoRefreshToken: false, persistSession: false } }
      );

      await supabaseAdmin.from('analytics_events').insert({
        event_type: 'security.csrf_fail',
        event_data: {
          path: '/create-post',
          ip: req.headers.get('x-real-ip') || req.headers.get('x-forwarded-for'),
          reason: 'invalid_token'
        }
      });

      return createErrorResponse('Invalid CSRF token', 403);
    }

    // Validate session and get user
    const result = await validateSessionAndGetUser(req);
    if (result instanceof Response) {
      return result;
    }
    const { user } = result;

    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: { headers: { Authorization: req.headers.get('Authorization')! } }
      }
    );

    // Check rate limit
    const rateLimit = await apiValidation.checkRateLimit('/create-post', user.id);
    if (!rateLimit.allowed) {
      return createErrorResponse('Rate limit exceeded', 429);
    }

    // Get request body
    const body = await req.json();

    // Validate post data
    const validation = await apiValidation.validatePost(body);
    if (!validation.success) {
      return createErrorResponse(validation.error, 400);
    }

    // Create post
    const { data: post, error: postError } = await supabaseClient
      .from('posts')
      .insert({
        ...validation.data,
        user_id: user.id
      })
      .select()
      .single();

    if (postError) {
      console.error('Error creating post:', postError);
      return createErrorResponse('Error creating post', 500);
    }

    return new Response(
      JSON.stringify(post),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      }
    );

  } catch (error) {
    console.error('Error in create-post function:', error);
    return createErrorResponse('Internal server error', 500);
  }
}); 