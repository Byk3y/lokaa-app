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
  const baseUrl = 'https://lokaa.app';
  const defaultDescription = 'Transform Your Passion Into a Profitable Community - Build and join thriving communities on Lokaa';
  const defaultImage = `${baseUrl}/og-image.png`;

  switch (type) {
    case 'landing':
      return {
        title: 'Lokaa - Transform Your Passion Into a Profitable Community',
        description: 'Build engaged communities around your passion, create valuable content, and monetize your expertise. Join thousands of creators building profitable communities on Lokaa.',
        ogImage: defaultImage,
        canonical: baseUrl,
        type: 'website',
        keywords: ['community platform', 'turn passion into revenue', 'monetize your passion', 'build profitable community', 'online learning communities', 'passion communities', 'community building', 'find communities'],
        author: 'Lokaa Team',
        robots: 'index,follow',
        language: 'en'
      };

    case 'space':
      if (!spaceData) {
        throw new Error('Space data required for space SEO');
      }

      return {
        title: `${spaceData.name} - Community on Lokaa`,
        description: spaceData.description || `Join the ${spaceData.name} community on Lokaa. Connect with like-minded people and grow together.`,
        ogImage: spaceData.cover_image || defaultImage,
        canonical: `${baseUrl}/${spaceData.subdomain}`,
        type: 'website',
        keywords: [spaceData.name, 'community', 'collaboration', 'lokaa', spaceData.subdomain],
        author: spaceData.name,
        robots: 'index,follow',
        language: 'en'
      };

    case 'post':
      if (!spaceData) {
        throw new Error('Space data required for post SEO');
      }

      return {
        title: `${spaceData.title || 'Post'} - ${spaceData.name}`,
        description: spaceData.content ? spaceData.content.replace(/<[^>]*>/g, '').substring(0, 160) : `Read this post in the ${spaceData.name} community`,
        ogImage: spaceData.media_urls?.[0]?.url || spaceData.cover_image || defaultImage,
        canonical: `${baseUrl}/${spaceData.subdomain}/space/${spaceData.slug}`,
        type: 'article',
        keywords: [spaceData.title, spaceData.name, 'community post', 'lokaa'],
        author: spaceData.author_name || spaceData.name,
        robots: 'index,follow',
        language: 'en',
        publishedTime: spaceData.created_at,
        modifiedTime: spaceData.updated_at
      };

    case 'course':
      if (!spaceData) {
        throw new Error('Space data required for course SEO');
      }

      return {
        title: `${spaceData.title} - Course in ${spaceData.name}`,
        description: spaceData.description || `Learn ${spaceData.title} in the ${spaceData.name} community on Lokaa`,
        ogImage: spaceData.cover_image || spaceData.space_cover_image || defaultImage,
        canonical: `${baseUrl}/${spaceData.subdomain}/courses/${spaceData.slug}`,
        type: 'course',
        keywords: [spaceData.title, 'course', 'learning', spaceData.name, 'lokaa'],
        author: spaceData.instructor_name || spaceData.name,
        robots: 'index,follow',
        language: 'en',
        publishedTime: spaceData.created_at,
        modifiedTime: spaceData.updated_at
      };

    case 'user':
      if (!spaceData) {
        throw new Error('User data required for user SEO');
      }

      return {
        title: `${spaceData.full_name || spaceData.profile_url} - Profile on Lokaa`,
        description: spaceData.bio || `View ${spaceData.full_name || spaceData.profile_url}'s profile on Lokaa`,
        ogImage: spaceData.avatar_url || defaultImage,
        canonical: `${baseUrl}/@${spaceData.profile_url}`,
        type: 'profile',
        keywords: [spaceData.full_name, 'profile', 'community member', 'lokaa'],
        author: spaceData.full_name || spaceData.profile_url,
        robots: 'index,follow',
        language: 'en'
      };

    default:
      return {
        title: 'Lokaa - Community Platform',
        description: defaultDescription,
        ogImage: defaultImage,
        canonical: baseUrl,
        type: 'website',
        keywords: ['community platform', 'collaborative spaces', 'lokaa'],
        author: 'Lokaa Team',
        robots: 'index,follow',
        language: 'en'
      };
  }
} 