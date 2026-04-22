// Small DB-backed rate limiter for edge functions.
//
// Uses a fixed window: (endpoint, bucket_key, window_start) counts
// requests within a window of `windowSeconds`. Cheap, no Redis required,
// consistent with the single-region Supabase deploy. Good enough for
// abuse prevention on email/outbound spend; not intended for fine-grained
// per-millisecond throttling.
//
// Bucket key is the caller's choice: user id, IP, or a composite. We
// write via service_role so RLS can stay locked down on the table.

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'

export interface RateLimitOptions {
  endpoint: string;
  bucketKey: string;
  limit: number;
  windowSeconds: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

export async function checkEdgeRateLimit(
  admin: SupabaseClient,
  opts: RateLimitOptions,
): Promise<RateLimitResult> {
  const { endpoint, bucketKey, limit, windowSeconds } = opts
  try {
    const { data, error } = await admin.rpc('edge_rate_limit_check', {
      p_endpoint: endpoint,
      p_bucket_key: bucketKey,
      p_limit: limit,
      p_window_seconds: windowSeconds,
    })
    if (error) {
      // Fail-open on unexpected DB errors — a broken limiter shouldn't
      // lock users out entirely. The caller still logs the failure.
      console.error('edge_rate_limit_check_failed', error)
      return { allowed: true, remaining: limit, retryAfterSeconds: 0 }
    }
    const row = Array.isArray(data) ? data[0] : data
    return {
      allowed: !!row?.allowed,
      remaining: Number(row?.remaining ?? 0),
      retryAfterSeconds: Number(row?.retry_after_seconds ?? 0),
    }
  } catch (err) {
    console.error('edge_rate_limit_check_exception', err)
    return { allowed: true, remaining: limit, retryAfterSeconds: 0 }
  }
}
