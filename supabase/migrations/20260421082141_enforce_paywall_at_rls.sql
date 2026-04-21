-- Pre-launch: payments are not wired yet, but this is the right time to
-- encode the paywall in RLS so the client can't be the only gate.
--
-- Model:
--   * Course "managers" = creator, space owner, space admin. They see and edit
--     everything, including unpublished drafts.
--   * Course "consumers" = everyone else with a legitimate access path:
--       - open course (access_type='open')        → active space member
--       - paid course (access_type='paid')        → active space member AND
--                                                   active course_enrollments row
--     Consumers only see PUBLISHED content.
--
-- Four SECURITY DEFINER helpers centralize this logic so RLS policies stay
-- declarative. All helpers explicitly set search_path to prevent hijacking.

------------------------------------------------------------------------------
-- Helpers
------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.check_user_can_manage_course(p_course_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_space_id   uuid;
  v_creator_id uuid;
BEGIN
  IF p_user_id IS NULL THEN
    RETURN FALSE;
  END IF;

  SELECT creator_id, space_id
    INTO v_creator_id, v_space_id
  FROM public.courses
  WHERE id = p_course_id;

  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  IF v_creator_id = p_user_id THEN
    RETURN TRUE;
  END IF;

  -- is_space_admin covers space owner (s.owner_id = user_id) too.
  RETURN public.is_space_admin(v_space_id, p_user_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.check_user_can_consume_course(p_course_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_space_id    uuid;
  v_access_type text;
BEGIN
  IF p_user_id IS NULL THEN
    RETURN FALSE;
  END IF;

  SELECT space_id, access_type
    INTO v_space_id, v_access_type
  FROM public.courses
  WHERE id = p_course_id;

  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  -- Must be an active member of the space in all cases.
  IF NOT public.check_is_space_member(v_space_id, p_user_id) THEN
    RETURN FALSE;
  END IF;

  -- Open course: space membership is sufficient.
  IF v_access_type = 'open' OR v_access_type IS NULL THEN
    RETURN TRUE;
  END IF;

  -- Paid course: also require an active enrollment. Once payments are wired,
  -- only the payment-completion Edge Function (running as service_role) should
  -- insert here.
  RETURN EXISTS (
    SELECT 1 FROM public.course_enrollments ce
    WHERE ce.course_id = p_course_id AND ce.user_id = p_user_id
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.check_user_can_manage_lesson(p_module_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_course_id uuid;
BEGIN
  SELECT course_id INTO v_course_id FROM public.course_modules WHERE id = p_module_id;
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;
  RETURN public.check_user_can_manage_course(v_course_id, p_user_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.check_user_can_consume_lesson(p_module_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_course_id uuid;
BEGIN
  SELECT course_id INTO v_course_id FROM public.course_modules WHERE id = p_module_id;
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;
  RETURN public.check_user_can_consume_course(v_course_id, p_user_id);
END;
$$;

------------------------------------------------------------------------------
-- course_modules: managers see everything; consumers see published only.
------------------------------------------------------------------------------

DROP POLICY IF EXISTS "course_modules_premium_policy" ON public.course_modules;

CREATE POLICY "course_modules_select_v2" ON public.course_modules
  FOR SELECT
  TO authenticated
  USING (
    public.check_user_can_manage_course(course_id, (SELECT auth.uid()))
    OR (
      is_published = true
      AND public.check_user_can_consume_course(course_id, (SELECT auth.uid()))
    )
  );

------------------------------------------------------------------------------
-- course_lessons: same model, keyed through module → course.
------------------------------------------------------------------------------

DROP POLICY IF EXISTS "course_lessons_premium_policy" ON public.course_lessons;

CREATE POLICY "course_lessons_select_v2" ON public.course_lessons
  FOR SELECT
  TO authenticated
  USING (
    public.check_user_can_manage_lesson(module_id, (SELECT auth.uid()))
    OR (
      is_published = true
      AND public.check_user_can_consume_lesson(module_id, (SELECT auth.uid()))
    )
  );

------------------------------------------------------------------------------
-- lesson_content_blocks: split the prior FOR ALL policy into per-command
-- policies so reads, inserts, updates, and deletes have distinct rules.
------------------------------------------------------------------------------

DROP POLICY IF EXISTS "lesson_content_blocks_consolidated_policy" ON public.lesson_content_blocks;

-- Read: managers always; consumers only when the parent lesson is published.
CREATE POLICY "lesson_content_blocks_select_v2" ON public.lesson_content_blocks
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.course_lessons cl
      WHERE cl.id = lesson_content_blocks.lesson_id
        AND (
          public.check_user_can_manage_lesson(cl.module_id, (SELECT auth.uid()))
          OR (
            cl.is_published = true
            AND public.check_user_can_consume_lesson(cl.module_id, (SELECT auth.uid()))
          )
        )
    )
  );

-- Writes: managers only.
CREATE POLICY "lesson_content_blocks_insert_v2" ON public.lesson_content_blocks
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.course_lessons cl
      WHERE cl.id = lesson_content_blocks.lesson_id
        AND public.check_user_can_manage_lesson(cl.module_id, (SELECT auth.uid()))
    )
  );

CREATE POLICY "lesson_content_blocks_update_v2" ON public.lesson_content_blocks
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.course_lessons cl
      WHERE cl.id = lesson_content_blocks.lesson_id
        AND public.check_user_can_manage_lesson(cl.module_id, (SELECT auth.uid()))
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.course_lessons cl
      WHERE cl.id = lesson_content_blocks.lesson_id
        AND public.check_user_can_manage_lesson(cl.module_id, (SELECT auth.uid()))
    )
  );

CREATE POLICY "lesson_content_blocks_delete_v2" ON public.lesson_content_blocks
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.course_lessons cl
      WHERE cl.id = lesson_content_blocks.lesson_id
        AND public.check_user_can_manage_lesson(cl.module_id, (SELECT auth.uid()))
    )
  );
