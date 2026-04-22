-- Edge function rate limiter backing store.
--
-- A fixed-window counter keyed on (endpoint, bucket_key, window_start).
-- Callers are edge functions running as service_role, so the table RLS
-- denies everything else by default. Window is chosen per call.
--
-- Cleanup: rows older than 24h are pruned by a trigger on INSERT (bounded
-- to a handful of deletes per call) so we don't need a separate cron.

CREATE TABLE IF NOT EXISTS public.edge_function_rate_limits (
  endpoint      TEXT NOT NULL,
  bucket_key    TEXT NOT NULL,
  window_start  TIMESTAMPTZ NOT NULL,
  hits          INT NOT NULL DEFAULT 0,
  PRIMARY KEY (endpoint, bucket_key, window_start)
);

CREATE INDEX IF NOT EXISTS idx_edge_function_rate_limits_window
  ON public.edge_function_rate_limits (window_start);

ALTER TABLE public.edge_function_rate_limits ENABLE ROW LEVEL SECURITY;
-- No policies: this table is only accessible via service_role, which
-- bypasses RLS. Deny-by-default for everyone else.

-- Fixed-window rate limit check. Atomic upsert + count, returns whether
-- this call is allowed and when to retry if not.
CREATE OR REPLACE FUNCTION public.edge_rate_limit_check(
  p_endpoint        TEXT,
  p_bucket_key      TEXT,
  p_limit           INT,
  p_window_seconds  INT
)
RETURNS TABLE (
  allowed             BOOLEAN,
  remaining           INT,
  retry_after_seconds INT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_now          TIMESTAMPTZ := NOW();
  v_window_start TIMESTAMPTZ;
  v_hits         INT;
BEGIN
  -- Bucket the current instant into a window of p_window_seconds.
  v_window_start := TO_TIMESTAMP(
    FLOOR(EXTRACT(EPOCH FROM v_now) / p_window_seconds) * p_window_seconds
  );

  -- Increment atomically.
  INSERT INTO public.edge_function_rate_limits (endpoint, bucket_key, window_start, hits)
  VALUES (p_endpoint, p_bucket_key, v_window_start, 1)
  ON CONFLICT (endpoint, bucket_key, window_start)
  DO UPDATE SET hits = public.edge_function_rate_limits.hits + 1
  RETURNING hits INTO v_hits;

  -- Best-effort cleanup: prune rows older than 24h, bounded per call.
  DELETE FROM public.edge_function_rate_limits
   WHERE window_start < v_now - INTERVAL '24 hours'
   AND ctid IN (
     SELECT ctid FROM public.edge_function_rate_limits
      WHERE window_start < v_now - INTERVAL '24 hours'
      LIMIT 50
   );

  RETURN QUERY
  SELECT
    (v_hits <= p_limit) AS allowed,
    GREATEST(0, p_limit - v_hits) AS remaining,
    CASE
      WHEN v_hits <= p_limit THEN 0
      ELSE CEIL(EXTRACT(EPOCH FROM (v_window_start + make_interval(secs => p_window_seconds) - v_now)))::INT
    END AS retry_after_seconds;
END;
$function$;

-- Only service_role should be able to call this function. It's SECURITY
-- DEFINER but we explicitly revoke from other roles to be safe.
REVOKE ALL ON FUNCTION public.edge_rate_limit_check(TEXT, TEXT, INT, INT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.edge_rate_limit_check(TEXT, TEXT, INT, INT) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.edge_rate_limit_check(TEXT, TEXT, INT, INT) TO service_role;
