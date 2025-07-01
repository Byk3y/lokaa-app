import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';
import { corsHeaders } from '../_shared/cors.ts';
import { verifyToken } from '../_shared/csrf.ts';
import { validateSession, createErrorResponse } from '../_shared/session.ts';

Deno.serve(async (req) => {
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
      return createErrorResponse('Missing CSRF token', 403);
    }

    const isValidToken = await verifyToken(csrfToken);
    if (!isValidToken) {
      return createErrorResponse('Invalid CSRF token', 403);
    }

    // Validate session
    const validation = await validateSession(req);
    if (!validation.isValid) {
      // Add token reuse header if that was the reason
      const headers = {
        ...corsHeaders,
        'Content-Type': 'application/json'
      };
      if (validation.error === 'Token revoked') {
        headers['x-refresh-token-reuse'] = 'true';
      }
      return createErrorResponse(validation.error!, validation.status!, headers);
    }

    // Create Supabase admin client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Generate new session
    const { data: { session }, error: refreshError } = await supabaseAdmin.auth.refreshSession({
      refresh_token: req.headers.get('cookie')?.match(/sb-refresh-token=([^;]+)/)?.[1]
    });

    if (refreshError || !session) {
      return createErrorResponse('Failed to refresh session', 500);
    }

    // Log successful refresh
    await supabaseAdmin.from('analytics_events').insert({
      event_type: 'security.session_refresh',
      event_data: {
        user_id: validation.user.id,
        ip: req.headers.get('x-real-ip') || req.headers.get('x-forwarded-for')
      }
    });

    return new Response(
      JSON.stringify({ session }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      }
    );

  } catch (error) {
    console.error('Error in auth-refresh function:', error);
    return createErrorResponse('Internal server error', 500);
  }
}); 