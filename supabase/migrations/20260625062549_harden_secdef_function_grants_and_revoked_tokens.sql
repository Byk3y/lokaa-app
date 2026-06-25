-- Capture an out-of-band security change into version control.
--
-- This migration was originally applied directly to the live database via the
-- Supabase MCP (recorded remotely as version 20260625062549). It existed only in
-- the live DB; this file records the exact SQL so a fresh DB build / preview branch
-- keeps the hardening. The version/name match the remote history, so `db push`
-- treats it as already applied and will not re-run it.
--
-- =====================================================================
-- Security hardening for SECURITY DEFINER function exposure + app_auth.revoked_tokens
--
-- Context: Postgres grants EXECUTE to PUBLIC by default, so anon/authenticated
-- could reach internal SECURITY DEFINER functions via PostgREST /rest/v1/rpc/.
-- We revoke PUBLIC where the functions are internal-only. Trigger-driven and
-- cron-driven callers are unaffected (those run as the function owner/cron owner,
-- not as anon/authenticated). Verified no frontend .rpc() calls these.
-- =====================================================================

-- Block A: Internal-only / maintenance functions. Fully lock to owner + service.
--   * award_space_points: real privilege bug (any caller could grant arbitrary
--     points). Only ever called internally by trigger fn handle_new_post_points.
--   * cleanup_* / update_all_spaces_member_counts: cron- or trigger-driven only.
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = ANY (ARRAY[
        'award_space_points',
        'cleanup_inactive_members',
        'cleanup_expired_notifications',
        'cleanup_stale_presence',
        'cleanup_expired_csrf_tokens',
        'cleanup_old_presence_logs',
        'update_all_spaces_member_counts'])
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon, authenticated;', r.sig);
  END LOOP;
END $$;

-- Block B: Admin/debug functions. Block anon entirely; keep authenticated because
-- they enforce their own internal admin checks and SpaceDebugPage.tsx calls
-- debug_space_members / fix_space_members via the authenticated client.
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = ANY (ARRAY[
        'debug_space_members',
        'fix_space_members',
        'debug_chat_access',
        'get_database_health',
        'get_slow_queries',
        'get_app_performance_metrics_admin',
        'test_auth_context'])
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon;', r.sig);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated;', r.sig);
  END LOOP;
END $$;

-- Block C: All SECURITY DEFINER trigger functions. These cannot be invoked via
-- PostgREST anyway (they return `trigger`); revoking PUBLIC EXECUTE is pure
-- hygiene and does NOT affect trigger firing (triggers run as the table owner).
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prosecdef
      AND pg_get_function_result(p.oid) = 'trigger'
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon, authenticated;', r.sig);
  END LOOP;
END $$;

-- Block D: app_auth.revoked_tokens
--   * Add covering index for FK fk_user (user_id -> auth.users).
--   * Wrap auth.uid() in a scalar subselect so RLS evaluates it once per query
--     instead of once per row (auth_rls_initplan advisor warning).
CREATE INDEX IF NOT EXISTS idx_revoked_tokens_user_id
  ON app_auth.revoked_tokens (user_id);

ALTER POLICY "Users can view their own revoked tokens"
  ON app_auth.revoked_tokens
  USING (user_id = (SELECT auth.uid()));

ALTER POLICY "Users can insert their own revoked tokens"
  ON app_auth.revoked_tokens
  WITH CHECK (user_id = (SELECT auth.uid()));
