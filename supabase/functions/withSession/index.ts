// withSession — LIBRARY module deployed as an edge function (2026-04-22 audit).
//
// Exports a `withSession` middleware factory but has no `Deno.serve(...)`
// call, so hitting /functions/v1/withSession as an endpoint does nothing.
// Committed to repo for completeness; safe to delete the deployed
// endpoint via the Supabase Dashboard (tracked in launch checklist).
//
// The code also references an undefined `supabaseAdmin` (no import, no
// declaration). Even if the module were imported, it would throw at
// runtime. Belongs to an earlier design that never fully landed.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';

// CSRF validation helper
function validateCsrf(req: Request): boolean {
  const headerToken = req.headers.get('x-csrf-token');
  if (!headerToken) return false;

  // Get cookie value
  const cookies = req.headers.get('cookie')?.split(';') || [];
  const csrfCookie = cookies
    .find(c => c.trim().startsWith('csrf-token='))
    ?.split('=')[1];

  if (!csrfCookie) return false;

  // Constant-time string comparison to prevent timing attacks
  return crypto.subtle.timingSafeEqual(
    new TextEncoder().encode(headerToken),
    new TextEncoder().encode(csrfCookie)
  );
}

interface WithSessionOptions {
  enforceUser?: boolean;
  skipCsrf?: boolean;
}

/**
 * Middleware to handle session validation, CSRF protection, and token reuse detection
 */
export function withSession(handler: Function, options: WithSessionOptions = {}) {
  return async (req: Request): Promise<Response> => {
    const { enforceUser = true, skipCsrf = false } = options;

    try {
      // 1. JWT Verification
      const jwt = req.headers.get('Authorization')?.replace('Bearer ', '');
      if (!jwt && enforceUser) {
        return new Response(
          JSON.stringify({ error: 'Missing authorization header' }),
          { status: 401 }
        );
      }

      let user;
      if (jwt) {
        const { data: { user: userData }, error: userError } = await supabaseAdmin.auth.getUser(jwt);
        if (userError && enforceUser) {
          return new Response(
            JSON.stringify({ error: 'Invalid token' }),
            { status: 401 }
          );
        }
        user = userData;
      }

      // 2. CSRF Validation for non-GET requests
      if (!skipCsrf && req.method !== 'GET') {
        if (!validateCsrf(req)) {
          // Log CSRF failure
          await supabaseAdmin
            .from('analytics_events')
            .insert({
              user_id: user?.id,
              event_type: 'security.csrf_fail',
              event_name: 'CSRF Validation Failed',
              event_data: {
                path: new URL(req.url).pathname,
                method: req.method
              }
            });

          return new Response(
            JSON.stringify({ error: 'Invalid CSRF token' }),
            { status: 403 }
          );
        }
      }

      // 3. Handle refresh token reuse (when Supabase flags it)
      const refreshTokenError = req.headers.get('x-refresh-token-reuse');
      if (refreshTokenError === 'true' && user) {
        // Get the actual token from the Authorization header
        const token = req.headers.get('Authorization')?.split(' ')[1];

        if (token) {
          // Insert into revoked_tokens
          await supabaseAdmin
            .from('auth.revoked_tokens')
            .insert({
              user_id: user.id,
              old_token: token
            });

          // Log token reuse attempt
          await supabaseAdmin
            .from('analytics_events')
            .insert({
              user_id: user.id,
              event_type: 'security.token_reuse',
              event_name: 'Refresh Token Reuse Detected',
              event_data: {
                path: new URL(req.url).pathname
              }
            });

          return new Response(
            JSON.stringify({
              error: 'Session terminated due to token reuse',
              code: 'TOKEN_REUSE'
            }),
            { status: 440 }
          );
        }
      }

      // All checks passed, add user to request context and continue
      const ctx = {
        user,
        supabaseClient: supabaseAdmin
      };

      return await handler(req, ctx);

    } catch (error) {
      console.error('Session middleware error:', error);

      return new Response(
        JSON.stringify({ error: 'Internal server error' }),
        { status: 500 }
      );
    }
  };
}
