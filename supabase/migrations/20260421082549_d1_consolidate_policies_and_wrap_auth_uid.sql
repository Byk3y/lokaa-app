-- Phase D1: remove redundant permissive policies and wrap auth.uid() /
-- auth.role() in (SELECT ...) so the planner caches the value once per query
-- instead of re-evaluating per row (Supabase auth_rls_initplan advisor).
--
-- Scope: space_members, posts, courses, course_enrollments, lesson_completions,
-- notifications, presence, space_user_points, space_access, spaces.
-- Deliberately skips low-volume/pre-launch tables (search_analytics,
-- email_analytics, user_devices, push_subscriptions, revoked_tokens,
-- user_space_progress) — we'll revisit before those start taking traffic.

-- ---------------------------------------------------------------------------
-- space_members: two identical SELECT policies live. Keep one.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "space_members_select_policy" ON public.space_members;

DROP POLICY IF EXISTS "space_members_optimized_consolidated" ON public.space_members;
CREATE POLICY "space_members_select_v2" ON public.space_members
  FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS "space_members_insert_final" ON public.space_members;
CREATE POLICY "space_members_insert_v2" ON public.space_members
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.spaces
      WHERE spaces.id = space_members.space_id
        AND spaces.owner_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "space_members_delete_final" ON public.space_members;
CREATE POLICY "space_members_delete_v2" ON public.space_members
  FOR DELETE TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.spaces
      WHERE spaces.id = space_members.space_id
        AND spaces.owner_id = (SELECT auth.uid())
    )
  );

-- ---------------------------------------------------------------------------
-- posts: duplicate UPDATE policies; posts_insert_simple uses naked auth.uid().
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "posts_update_simple" ON public.posts;

DROP POLICY IF EXISTS "posts_insert_simple" ON public.posts;
CREATE POLICY "posts_insert_v2" ON public.posts
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

-- posts_update_final / posts_delete_final already use (SELECT auth.uid()).
-- posts_select_v2 was fixed in the Phase B migration.

-- ---------------------------------------------------------------------------
-- courses: drop the older duplicate SELECT; rewrite the remaining three with
-- wrapped auth.uid() calls.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Allow everyone to select published courses" ON public.courses;

DROP POLICY IF EXISTS "course_access_policy_final" ON public.courses;
CREATE POLICY "courses_select_v2" ON public.courses
  FOR SELECT TO authenticated
  USING (
    is_published = true
    OR creator_id = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.space_members sm
      WHERE sm.space_id = courses.space_id
        AND sm.user_id = (SELECT auth.uid())
        AND sm.status = 'active'::member_status
    )
  );

DROP POLICY IF EXISTS "Allow space owners to insert courses" ON public.courses;
CREATE POLICY "courses_insert_v2" ON public.courses
  FOR INSERT TO authenticated
  WITH CHECK (
    public.check_is_space_owner(space_id, (SELECT auth.uid()))
    OR public.check_is_space_admin(space_id, (SELECT auth.uid()))
  );

DROP POLICY IF EXISTS "Allow space owners/admins to update courses" ON public.courses;
CREATE POLICY "courses_update_v2" ON public.courses
  FOR UPDATE TO authenticated
  USING (
    public.check_is_space_owner(space_id, (SELECT auth.uid()))
    OR public.check_is_space_admin(space_id, (SELECT auth.uid()))
  )
  WITH CHECK (
    public.check_is_space_owner(space_id, (SELECT auth.uid()))
    OR public.check_is_space_admin(space_id, (SELECT auth.uid()))
  );

DROP POLICY IF EXISTS "Allow space owners/admins to delete courses" ON public.courses;
CREATE POLICY "courses_delete_v2" ON public.courses
  FOR DELETE TO authenticated
  USING (
    public.check_is_space_owner(space_id, (SELECT auth.uid()))
    OR public.check_is_space_admin(space_id, (SELECT auth.uid()))
  );

-- ---------------------------------------------------------------------------
-- course_enrollments: wrap auth.uid() in the INSERT check.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Insert own enrollment for open courses" ON public.course_enrollments;
CREATE POLICY "course_enrollments_insert_v2" ON public.course_enrollments
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = (SELECT auth.uid())
    AND public.check_is_course_member(course_id, (SELECT auth.uid()))
  );

-- ---------------------------------------------------------------------------
-- lesson_completions: drop the redundant FOR-ALL policy. Per-command policies
-- already exist and already use (SELECT auth.uid()).
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Allow user to manage own lesson completions" ON public.lesson_completions;

-- ---------------------------------------------------------------------------
-- notifications: the FOR-ALL policy already covers INSERT; the dedicated
-- "System can create notifications" is redundant. Also wrap auth.role().
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "System can create notifications" ON public.notifications;

DROP POLICY IF EXISTS "notifications_optimized_consolidated" ON public.notifications;
CREATE POLICY "notifications_access_v2" ON public.notifications
  FOR ALL TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    OR (SELECT auth.role()) = 'service_role'
  )
  WITH CHECK (
    user_id = (SELECT auth.uid())
    OR (SELECT auth.role()) = 'service_role'
  );

-- ---------------------------------------------------------------------------
-- presence: the FOR-ALL policy already covers INSERT+DELETE; the dedicated
-- "*_consolidated" per-command ones are redundant.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "presence_insert_consolidated" ON public.presence;
DROP POLICY IF EXISTS "presence_delete_consolidated" ON public.presence;
-- presence_optimized_consolidated already uses (SELECT auth.uid()).

-- ---------------------------------------------------------------------------
-- space_user_points: all four policies use naked auth.uid(). Rewrite.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "space_user_points_select_policy" ON public.space_user_points;
CREATE POLICY "space_user_points_select_v2" ON public.space_user_points
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.space_members sm
      WHERE sm.space_id = space_user_points.space_id
        AND sm.user_id = (SELECT auth.uid())
        AND sm.status = 'active'::member_status
    )
  );

DROP POLICY IF EXISTS "space_user_points_insert_policy" ON public.space_user_points;
CREATE POLICY "space_user_points_insert_v2" ON public.space_user_points
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.space_members sm
      WHERE sm.space_id = space_user_points.space_id
        AND sm.user_id = (SELECT auth.uid())
        AND sm.status = 'active'::member_status
    )
  );

DROP POLICY IF EXISTS "space_user_points_update_policy" ON public.space_user_points;
CREATE POLICY "space_user_points_update_v2" ON public.space_user_points
  FOR UPDATE TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    OR public.is_space_admin(space_id, (SELECT auth.uid()))
  )
  WITH CHECK (
    user_id = (SELECT auth.uid())
    OR public.is_space_admin(space_id, (SELECT auth.uid()))
  );

DROP POLICY IF EXISTS "space_user_points_delete_policy" ON public.space_user_points;
CREATE POLICY "space_user_points_delete_v2" ON public.space_user_points
  FOR DELETE TO authenticated
  USING (public.is_space_admin(space_id, (SELECT auth.uid())));

-- ---------------------------------------------------------------------------
-- spaces: wrap the simple auth.uid() IS NOT NULL check.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "spaces_optimized_consolidated" ON public.spaces;
CREATE POLICY "spaces_select_v2" ON public.spaces
  FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) IS NOT NULL);
