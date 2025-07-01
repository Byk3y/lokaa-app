import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';
import { corsHeaders } from './cors.ts';

interface SessionValidationResult {
  isValid: boolean;
  user?: any;
  error?: string;
  status?: number;
}

/**
 * Validates a session from the request headers
 */
export async function validateSession(req: Request): Promise<SessionValidationResult> {
  try {
    // Get auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return {
        isValid: false,
        error: 'Missing authorization header',
        status: 401
      };
    }

    // Get session cookie
    const authCookie = req.headers.get('cookie')?.match(/sb-[^=]+=([^;]+)/)?.[1];
    if (!authCookie) {
      return {
        isValid: false,
        error: 'No session cookie found',
        status: 401
      };
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

    // Get user from session
    const { data: { user }, error: getUserError } = await supabaseAdmin.auth.getUser(authCookie);
    if (getUserError || !user) {
      return {
        isValid: false,
        error: 'Invalid session',
        status: 440
      };
    }

    // Check if token is revoked
    const { data: revokedTokens, error: revokedError } = await supabaseAdmin
      .from('auth.revoked_tokens')
      .select('token_id')
      .eq('user_id', user.id)
      .limit(1);

    if (revokedError) {
      console.error('Error checking revoked tokens:', revokedError);
      return {
        isValid: false,
        error: 'Error validating session',
        status: 500
      };
    }

    if (revokedTokens && revokedTokens.length > 0) {
      // Log token reuse attempt
      await supabaseAdmin.from('analytics_events').insert({
        event_type: 'security.token_reuse',
        event_data: {
          user_id: user.id,
          path: new URL(req.url).pathname,
          ip: req.headers.get('x-real-ip') || req.headers.get('x-forwarded-for')
        }
      });

      return {
        isValid: false,
        error: 'Token revoked',
        status: 440
      };
    }

    // Session is valid
    return {
      isValid: true,
      user
    };

  } catch (error) {
    console.error('Session validation error:', error);
    return {
      isValid: false,
      error: 'Error validating session',
      status: 500
    };
  }
}

/**
 * Creates a standard error response
 */
export function createErrorResponse(error: string, status: number = 500) {
  return new Response(
    JSON.stringify({
      code: error.toUpperCase().replace(/\s+/g, '_'),
      message: error,
      timestamp: Date.now()
    }),
    {
      status,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    }
  );
}

/**
 * Validates session and returns error response if invalid
 */
export async function validateSessionAndGetUser(req: Request): Promise<{ user: any } | Response> {
  const validation = await validateSession(req);
  if (!validation.isValid) {
    return createErrorResponse(validation.error!, validation.status!);
  }
  return { user: validation.user };
} 