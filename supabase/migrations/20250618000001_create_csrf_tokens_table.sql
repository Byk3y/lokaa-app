-- Create CSRF tokens table
CREATE TABLE IF NOT EXISTS csrf_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Add unique constraint on token
  CONSTRAINT csrf_tokens_token_key UNIQUE (token)
);

-- Add index for token lookups
CREATE INDEX IF NOT EXISTS csrf_tokens_token_idx ON csrf_tokens (token);

-- Add index for user_id lookups
CREATE INDEX IF NOT EXISTS csrf_tokens_user_id_idx ON csrf_tokens (user_id);

-- Add index for expiry cleanup
CREATE INDEX IF NOT EXISTS csrf_tokens_expires_at_idx ON csrf_tokens (expires_at);

-- Add RLS policies
ALTER TABLE csrf_tokens ENABLE ROW LEVEL SECURITY;

-- Only allow system level access (Edge Functions)
CREATE POLICY "csrf_tokens_system_only" 
  ON csrf_tokens
  USING (false);

-- Create cleanup function for expired tokens
CREATE OR REPLACE FUNCTION cleanup_expired_csrf_tokens()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM csrf_tokens WHERE expires_at < NOW();
END;
$$;

-- Create cron job to cleanup expired tokens every hour
SELECT cron.schedule(
  'cleanup-expired-csrf-tokens',
  '0 * * * *', -- Every hour
  'SELECT cleanup_expired_csrf_tokens();'
); 