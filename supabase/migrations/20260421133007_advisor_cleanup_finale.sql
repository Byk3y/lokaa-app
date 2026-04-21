-- Phase 3 (final): clear the remaining Supabase advisor findings that are
-- actionable via SQL. Leaves behind only the auth_leaked_password_protection
-- toggle (dashboard-only) and the public-bucket-listing warnings (product
-- decision — narrow vs wipe out the LIST capability).

-- ---------------------------------------------------------------------------
-- auth_rls_initplan: wrap the remaining 11 policies' auth.uid() / auth.role()
-- calls in (SELECT ...) so the planner caches the value per query.
-- ---------------------------------------------------------------------------

-- push_subscriptions
DROP POLICY IF EXISTS "users_manage_own_push_subscriptions" ON public.push_subscriptions;
CREATE POLICY "push_subscriptions_own_v2" ON public.push_subscriptions
  FOR ALL TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

-- search_analytics: two naked policies
DROP POLICY IF EXISTS "Users can insert their own search analytics" ON public.search_analytics;
CREATE POLICY "search_analytics_insert_v2" ON public.search_analytics
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can view their own search analytics" ON public.search_analytics;
CREATE POLICY "search_analytics_select_v2" ON public.search_analytics
  FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = user_id);

-- user_space_progress: four per-command policies
DROP POLICY IF EXISTS "Users can delete their own setup progress" ON public.user_space_progress;
CREATE POLICY "user_space_progress_delete_v2" ON public.user_space_progress
  FOR DELETE TO authenticated
  USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can insert their own setup progress" ON public.user_space_progress;
CREATE POLICY "user_space_progress_insert_v2" ON public.user_space_progress
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update their own setup progress" ON public.user_space_progress;
CREATE POLICY "user_space_progress_update_v2" ON public.user_space_progress
  FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can view their own setup progress" ON public.user_space_progress;
CREATE POLICY "user_space_progress_select_v2" ON public.user_space_progress
  FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = user_id);

-- email_analytics
DROP POLICY IF EXISTS "email_analytics_consolidated_policy" ON public.email_analytics;
CREATE POLICY "email_analytics_policy_v2" ON public.email_analytics
  FOR ALL TO authenticated
  USING ((SELECT auth.role()) = 'service_role' OR (SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.role()) = 'service_role' OR (SELECT auth.uid()) = user_id);

-- user_devices
DROP POLICY IF EXISTS "users_manage_own_devices" ON public.user_devices;
CREATE POLICY "user_devices_own_v2" ON public.user_devices
  FOR ALL TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

-- ---------------------------------------------------------------------------
-- Remaining unindexed foreign keys. CREATE INDEX IF NOT EXISTS is idempotent.
-- Skipping app_auth.revoked_tokens (separate schema, internal audit table).
-- ---------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_chat_conversations_created_by          ON public.chat_conversations (created_by);
CREATE INDEX IF NOT EXISTS idx_course_media_content_id                ON public.course_media (content_id);
CREATE INDEX IF NOT EXISTS idx_course_media_course_id                 ON public.course_media (course_id);
CREATE INDEX IF NOT EXISTS idx_course_media_lesson_id                 ON public.course_media (lesson_id);
CREATE INDEX IF NOT EXISTS idx_course_videos_content_id               ON public.course_videos (content_id);
CREATE INDEX IF NOT EXISTS idx_course_videos_lesson_id                ON public.course_videos (lesson_id);
CREATE INDEX IF NOT EXISTS idx_educational_content_versions_created_by ON public.educational_content_versions (created_by);
CREATE INDEX IF NOT EXISTS idx_membership_history_performed_by        ON public.membership_history (performed_by);
CREATE INDEX IF NOT EXISTS idx_membership_history_space_id            ON public.membership_history (space_id);
CREATE INDEX IF NOT EXISTS idx_membership_history_user_id             ON public.membership_history (user_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referred_id                  ON public.referrals (referred_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referrer_id                  ON public.referrals (referrer_id);
CREATE INDEX IF NOT EXISTS idx_search_analytics_space_id              ON public.search_analytics (space_id);
CREATE INDEX IF NOT EXISTS idx_search_analytics_user_id               ON public.search_analytics (user_id);
CREATE INDEX IF NOT EXISTS idx_security_alerts_resolved_by            ON public.security_alerts (resolved_by);
CREATE INDEX IF NOT EXISTS idx_space_events_creator_id                ON public.space_events (creator_id);
CREATE INDEX IF NOT EXISTS idx_space_media_created_by                 ON public.space_media (created_by);
CREATE INDEX IF NOT EXISTS idx_space_setup_space_id                   ON public.space_setup (space_id);
CREATE INDEX IF NOT EXISTS idx_user_devices_push_subscription_id      ON public.user_devices (push_subscription_id);
CREATE INDEX IF NOT EXISTS idx_user_space_progress_space_id           ON public.user_space_progress (space_id);

-- ---------------------------------------------------------------------------
-- function_search_path_mutable: lock search_path on the remaining ~60 funcs.
-- ALTER FUNCTION SET search_path is a metadata change — no body rewrite.
-- ---------------------------------------------------------------------------

ALTER FUNCTION public.add_space_owner_as_admin()                               SET search_path TO 'public';
ALTER FUNCTION public.auto_generate_content_slug()                             SET search_path TO 'public';
ALTER FUNCTION public.auto_generate_lesson_slug()                              SET search_path TO 'public';
ALTER FUNCTION public.auto_generate_short_id()                                 SET search_path TO 'public';
ALTER FUNCTION public.award_first_post_badge()                                 SET search_path TO 'public';
ALTER FUNCTION public.award_space_points(uuid, uuid, integer)                  SET search_path TO 'public';
ALTER FUNCTION public.check_comment_count_consistency()                        SET search_path TO 'public';
ALTER FUNCTION public.cleanup_expired_notifications()                          SET search_path TO 'public';
ALTER FUNCTION public.cleanup_old_batched_notifications()                      SET search_path TO 'public';
ALTER FUNCTION public.cleanup_space_notification_preferences(uuid, uuid)       SET search_path TO 'public';
ALTER FUNCTION public.cleanup_stale_online_status_v2(integer)                  SET search_path TO 'public';
ALTER FUNCTION public.create_default_space_notification_preferences(uuid, uuid) SET search_path TO 'public';
ALTER FUNCTION public.create_default_space_notification_preferences_trigger()  SET search_path TO 'public';
ALTER FUNCTION public.create_or_update_batched_notification(uuid, uuid, character varying, text, text, character varying, uuid, text, timestamp with time zone) SET search_path TO 'public';
ALTER FUNCTION public.decrement_post_comment_count()                           SET search_path TO 'public';
ALTER FUNCTION public.fix_user_profiles()                                      SET search_path TO 'public';
ALTER FUNCTION public.generate_short_id()                                      SET search_path TO 'public';
ALTER FUNCTION public.generate_slug_from_title(text)                           SET search_path TO 'public';
ALTER FUNCTION public.generate_unique_content_slug(text)                       SET search_path TO 'public';
ALTER FUNCTION public.generate_unique_course_slug(text, uuid)                  SET search_path TO 'public';
ALTER FUNCTION public.generate_unique_lesson_slug(text, uuid)                  SET search_path TO 'public';
ALTER FUNCTION public.generate_unique_short_id()                               SET search_path TO 'public';
ALTER FUNCTION public.get_effective_notification_preferences(uuid, uuid)       SET search_path TO 'public';
ALTER FUNCTION public.get_lesson_content(uuid)                                 SET search_path TO 'public';
ALTER FUNCTION public.get_notifications_with_actors(uuid, integer, integer, text) SET search_path TO 'public';
ALTER FUNCTION public.get_poll_results(uuid)                                   SET search_path TO 'public';
ALTER FUNCTION public.get_search_performance_stats(uuid, integer)              SET search_path TO 'public';
ALTER FUNCTION public.get_search_suggestions(uuid, text, integer)              SET search_path TO 'public';
ALTER FUNCTION public.get_space_leaderboard(uuid, integer)                     SET search_path TO 'public';
ALTER FUNCTION public.get_unread_notification_count(uuid)                      SET search_path TO 'public';
ALTER FUNCTION public.get_unread_notification_count()                          SET search_path TO 'public';
ALTER FUNCTION public.handle_new_post_points()                                 SET search_path TO 'public';
ALTER FUNCTION public.handle_new_space_seed_category()                         SET search_path TO 'public';
ALTER FUNCTION public.hello_lokaa()                                            SET search_path TO 'public';
ALTER FUNCTION public.increment_post_comment_count()                           SET search_path TO 'public';
ALTER FUNCTION public.initialize_space_points_for_space(uuid)                  SET search_path TO 'public';
ALTER FUNCTION public.mark_notifications_as_read(uuid[])                       SET search_path TO 'public';
ALTER FUNCTION public.migrate_lesson_to_educational_content(uuid)              SET search_path TO 'public';
ALTER FUNCTION public.populate_existing_space_notification_preferences()       SET search_path TO 'public';
ALTER FUNCTION public.refresh_course_modules_summary()                         SET search_path TO 'public';
ALTER FUNCTION public.refresh_search_materialized_views()                      SET search_path TO 'public';
ALTER FUNCTION public.reorder_pinned_posts(uuid[], integer[])                  SET search_path TO 'public';
ALTER FUNCTION public.search_posts_in_space(uuid, text, integer, integer)      SET search_path TO 'public';
ALTER FUNCTION public.search_posts_in_space_optimized(uuid, text, integer, integer, boolean, uuid, interval) SET search_path TO 'public';
ALTER FUNCTION public.search_spaces(text, uuid, integer, integer)              SET search_path TO 'public';
ALTER FUNCTION public.update_chat_activity_on_message()                        SET search_path TO 'public';
ALTER FUNCTION public.update_follow_counts()                                   SET search_path TO 'public';
ALTER FUNCTION public.update_last_active_timestamp()                           SET search_path TO 'public';
ALTER FUNCTION public.update_member_online_status()                            SET search_path TO 'public';
ALTER FUNCTION public.update_notification_preferences_updated_at()             SET search_path TO 'public';
ALTER FUNCTION public.update_posts_search_vector()                             SET search_path TO 'public';
ALTER FUNCTION public.update_push_subscriptions_updated_at()                   SET search_path TO 'public';
ALTER FUNCTION public.update_space_notification_preferences_updated_at()       SET search_path TO 'public';
ALTER FUNCTION public.update_space_setup(uuid, text, boolean)                  SET search_path TO 'public';
ALTER FUNCTION public.update_updated_at_column()                               SET search_path TO 'public';
ALTER FUNCTION public.update_user_activity_score_on_log()                      SET search_path TO 'public';
ALTER FUNCTION public.update_user_activity_scores()                            SET search_path TO 'public';
ALTER FUNCTION public.user_activity_by_month(uuid, timestamp with time zone)   SET search_path TO 'public';
ALTER FUNCTION public.verify_and_correct_member_counts()                       SET search_path TO 'public';

-- ---------------------------------------------------------------------------
-- materialized_view_in_api: revoke from anon + authenticated. These views
-- refresh on a schedule and were never meant to be a public API surface.
-- ---------------------------------------------------------------------------

REVOKE SELECT ON public.course_modules_summary FROM anon, authenticated;
REVOKE SELECT ON public.search_popular_terms    FROM anon, authenticated;
