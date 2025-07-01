import { serve } from 'std/http/server.ts';
import { createClient } from 'supabase';
import { corsHeaders } from '../_shared/cors.ts';
import { verifyToken } from '../_shared/csrf.ts';

serve(async (req: Request) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Verify request method
    if (req.method !== 'POST') {
      return new Response('Method not allowed', { 
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

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
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
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
          path: '/advanced-user-analytics',
          ip: req.headers.get('x-real-ip') || req.headers.get('x-forwarded-for'),
          reason: 'missing_token'
        }
      });

      return new Response(
        JSON.stringify({
          code: 'CSRF_ERROR',
          message: 'Missing CSRF token',
          timestamp: Date.now()
        }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
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
          path: '/advanced-user-analytics',
          ip: req.headers.get('x-real-ip') || req.headers.get('x-forwarded-for'),
          reason: 'invalid_token'
        }
      });

      return new Response(
        JSON.stringify({
          code: 'CSRF_ERROR',
          message: 'Invalid CSRF token',
          timestamp: Date.now()
        }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
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
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Process analytics request
    const { action, date_range } = await req.json();

    // Get analytics data
    const { data: analyticsData, error: analyticsError } = await supabaseClient
      .from('analytics_events')
      .select('*')
      .eq('user_id', user.id)
      .gte('created_at', getDateRangeStart(date_range))
      .order('created_at', { ascending: false });

    if (analyticsError) {
      return new Response(
        JSON.stringify({
          code: 'DATABASE_ERROR',
          message: 'Failed to fetch analytics data',
          timestamp: Date.now()
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    return new Response(
      JSON.stringify({
        data: analyticsData,
        timestamp: Date.now()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
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
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

function getDateRangeStart(range: string): string {
  const now = new Date();
  switch (range) {
    case 'day':
      return new Date(now.setDate(now.getDate() - 1)).toISOString();
    case 'week':
      return new Date(now.setDate(now.getDate() - 7)).toISOString();
    case 'month':
      return new Date(now.setMonth(now.getMonth() - 1)).toISOString();
    default:
      return new Date(now.setDate(now.getDate() - 7)).toISOString();
  }
} 