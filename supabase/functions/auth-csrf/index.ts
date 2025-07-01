import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';
import { corsHeaders } from '../_shared/cors.ts';
import { generateToken } from '../_shared/csrf.ts';

Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Verify request method
    if (req.method !== 'GET') {
      return new Response('Method not allowed', { 
        status: 405,
        headers: corsHeaders,
      });
    }

    // Get current session from cookie
    const authCookie = req.headers.get('cookie')?.match(/sb-[^=]+=([^;]+)/)?.[1];
    if (!authCookie) {
      return new Response('No session cookie found', {
        status: 401,
        headers: corsHeaders,
      });
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

    // Verify session is valid
    const { data: { user }, error: getUserError } = await supabaseAdmin.auth.getUser(authCookie);
    if (getUserError || !user) {
      return new Response('Invalid session', {
        status: 440,
        headers: corsHeaders,
      });
    }

    // Generate CSRF token
    const token = await generateToken(user.id);

    return new Response(
      JSON.stringify({ token }),
      { 
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );

  } catch (error) {
    console.error('CSRF token generation error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
}); 