import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';
import { encode as base64Encode } from 'https://deno.land/std@0.177.0/encoding/base64.ts';
import { crypto } from 'https://deno.land/std@0.177.0/crypto/mod.ts';

// 15 minutes in milliseconds
const TOKEN_EXPIRY = 15 * 60 * 1000;

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

/**
 * Generate a secure CSRF token for a user
 */
export async function generateToken(userId: string): Promise<string> {
  // Generate random bytes for token
  const tokenBytes = new Uint8Array(32);
  crypto.getRandomValues(tokenBytes);
  const token = base64Encode(tokenBytes);

  // Store token in database with expiry
  const expiresAt = new Date(Date.now() + TOKEN_EXPIRY);
  await supabaseAdmin
    .from('csrf_tokens')
    .insert({
      token,
      user_id: userId,
      expires_at: expiresAt.toISOString(),
    });

  return token;
}

/**
 * Verify a CSRF token is valid and not expired
 */
export async function verifyToken(token: string): Promise<boolean> {
  try {
    // Get token from database
    const { data: tokens, error } = await supabaseAdmin
      .from('csrf_tokens')
      .select('expires_at')
      .eq('token', token)
      .limit(1);

    if (error || !tokens || tokens.length === 0) {
      return false;
    }

    const tokenRecord = tokens[0];
    const now = new Date();
    const expiresAt = new Date(tokenRecord.expires_at);

    // Check if token is expired
    if (now > expiresAt) {
      // Delete expired token
      await supabaseAdmin
        .from('csrf_tokens')
        .delete()
        .eq('token', token);
      return false;
    }

    // Delete used token (one-time use)
    await supabaseAdmin
      .from('csrf_tokens')
      .delete()
      .eq('token', token);

    return true;
  } catch (error) {
    console.error('Error verifying CSRF token:', error);
    return false;
  }
} 