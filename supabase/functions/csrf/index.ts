// csrf — LIBRARY module deployed as an edge function (2026-04-22 audit).
//
// This file exports `createCsrfCookie` and `validateCsrf` helpers but has
// no `Deno.serve(...)` call, so hitting /functions/v1/csrf does nothing
// useful — the request times out or returns an empty response. This was
// deployed to the Edge Functions namespace by mistake at some point; the
// helpers are meant to be imported, not served.
//
// Committed to repo so there's no repo/prod divergence. Safe to delete
// the deployed endpoint via the Supabase Dashboard; tracked in the
// launch checklist.
//
// Note: other edge functions that need CSRF validation currently import
// from `../_shared/csrf.ts`, not from this endpoint. This file is truly
// dead surface.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";

/**
 * Creates a CSRF token cookie with SameSite=Lax protection
 * @param res Response object to set the cookie on
 * @returns The generated CSRF token
 */
export function createCsrfCookie(res: Response): string {
  const token = crypto.randomUUID();

  res.headers.append('Set-Cookie',
    `csrf-token=${token}; SameSite=Lax; Path=/; Max-Age=7200; Secure`
  );

  return token;
}

/**
 * Validates the CSRF token from the request header against the cookie
 * @param req Request object containing headers and cookies
 * @returns true if valid, false if invalid
 */
export function validateCsrf(req: Request): boolean {
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
