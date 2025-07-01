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
          path: '/seo-metadata-generator',
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
          path: '/seo-metadata-generator',
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

    // Process SEO request
    const { type, spaceId } = await req.json();

    // Get space data if spaceId provided
    let spaceData = null;
    if (spaceId) {
      const { data: space, error: spaceError } = await supabaseClient
        .from('spaces')
        .select('*')
        .eq('id', spaceId)
        .single();

      if (spaceError) {
        return new Response(
          JSON.stringify({
            code: 'DATABASE_ERROR',
            message: 'Failed to fetch space data',
            timestamp: Date.now()
          }),
          {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }

      spaceData = space;
    }

    // Generate SEO metadata
    const metadata = generateSEOMetadata(type, spaceData);

    return new Response(
      JSON.stringify({
        data: metadata,
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

function generateSEOMetadata(type: string, spaceData?: any): any {
  const baseUrl = 'https://app.lokaa.io';
  const defaultDescription = 'Lokaa Connect - Create and manage collaborative spaces';
  const defaultImage = `${baseUrl}/og-image.png`;

  switch (type) {
    case 'landing':
      return {
        title: 'Lokaa Connect - Collaborative Spaces Platform',
        description: defaultDescription,
        ogImage: defaultImage,
        canonical: baseUrl,
        type: 'website'
      };

    case 'space':
      if (!spaceData) {
        throw new Error('Space data required for space SEO');
      }

      return {
        title: `${spaceData.name} - Lokaa Connect Space`,
        description: spaceData.description || defaultDescription,
        ogImage: spaceData.cover_image || defaultImage,
        canonical: `${baseUrl}/space/${spaceData.subdomain}`,
        type: 'website'
      };

    default:
      return {
        title: 'Lokaa Connect',
        description: defaultDescription,
        ogImage: defaultImage,
        canonical: baseUrl,
        type: 'website'
      };
  }
} 