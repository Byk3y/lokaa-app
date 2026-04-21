-- Phase D3: SECURITY DEFINER views run with the view-creator's privileges,
-- not the caller's — inverting the RLS model we just spent Phase B/C hardening.
-- Supabase's security advisor flags all 5 of our *_secure views for this.
--
-- Audit of usage from src/:
--   email_performance_metrics_secure  — 0 consumers       → DROP
--   space_members_view_secure          — 0 consumers       → DROP
--   space_member_counts_secure         — 0 consumers       → DROP
--   user_conversations_secure          — 3 chat consumers → KEEP, security_invoker
--   view_course_details                — 1 classroom use  → KEEP, security_invoker
--
-- The two kept views query tables that now need a SELECT-own-row policy for
-- the invoker to see rows that SECURITY DEFINER previously hid behind.
-- course_enrollments has no SELECT policy today; add one.

-- ---------------------------------------------------------------------------
DROP VIEW IF EXISTS public.email_performance_metrics_secure;
DROP VIEW IF EXISTS public.space_members_view_secure;
DROP VIEW IF EXISTS public.space_member_counts_secure;

-- ---------------------------------------------------------------------------
-- course_enrollments SELECT policy so the view (and direct reads) can show a
-- user their own enrollment and let course managers see enrollments in their
-- own courses.
-- ---------------------------------------------------------------------------
CREATE POLICY "course_enrollments_select_v2" ON public.course_enrollments
  FOR SELECT TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    OR public.check_user_can_manage_course(course_id, (SELECT auth.uid()))
  );

-- ---------------------------------------------------------------------------
-- Recreate user_conversations_secure with security_invoker so the caller's
-- RLS applies to every table it reads.
-- ---------------------------------------------------------------------------
DROP VIEW IF EXISTS public.user_conversations_secure;

CREATE VIEW public.user_conversations_secure
WITH (security_invoker = true) AS
WITH latest_messages AS (
  SELECT DISTINCT ON (m.conversation_id)
         m.conversation_id, m.id AS message_id, m.content,
         m.created_at, m.sender_id
  FROM public.chat_messages m
  WHERE NOT m.is_deleted
  ORDER BY m.conversation_id, m.created_at DESC
),
unique_other_participants AS (
  SELECT p1.conversation_id,
         p1.user_id,
         json_agg(json_build_object(
           'user_id', u.id,
           'full_name', u.full_name,
           'avatar_url', u.avatar_url,
           'profile_url', u.profile_url,
           'last_seen_at', sm.last_active_at,
           'is_online', sm.is_online
         )) AS other_participants
  FROM public.chat_participants p1
  JOIN (
    SELECT DISTINCT conversation_id, user_id FROM public.chat_participants
  ) p2 ON p1.conversation_id = p2.conversation_id AND p1.user_id <> p2.user_id
  JOIN public.users u ON u.id = p2.user_id
  LEFT JOIN public.space_members sm ON sm.user_id = u.id
  GROUP BY p1.conversation_id, p1.user_id
)
SELECT c.id AS conversation_id,
       c.name AS conversation_name,
       c.is_group,
       c.created_at,
       c.last_message_at,
       p.user_id,
       p.last_read_at,
       p.is_admin,
       lm.message_id AS latest_message_id,
       lm.content    AS latest_message_content,
       lm.created_at AS latest_message_time,
       lm.sender_id  AS latest_message_sender,
       COALESCE((
         SELECT count(*) FROM public.chat_messages m
         WHERE m.conversation_id = c.id
           AND (p.last_read_at IS NULL OR m.created_at > p.last_read_at)
           AND m.sender_id <> p.user_id
           AND NOT m.is_deleted
       ), 0::bigint) AS unread_count,
       uop.other_participants
FROM public.chat_conversations c
JOIN (
  SELECT DISTINCT conversation_id, user_id, last_read_at, is_admin
  FROM public.chat_participants
) p ON p.conversation_id = c.id
LEFT JOIN latest_messages lm ON lm.conversation_id = c.id
LEFT JOIN unique_other_participants uop
       ON uop.conversation_id = c.id AND uop.user_id = p.user_id
WHERE p.user_id = (SELECT auth.uid());

-- ---------------------------------------------------------------------------
-- Recreate view_course_details with security_invoker. students_count will now
-- reflect the caller's RLS visibility on course_enrollments (managers see all,
-- members see just their own row). That's correct — only managers should have
-- an authoritative student count.
-- ---------------------------------------------------------------------------
DROP VIEW IF EXISTS public.view_course_details;

CREATE VIEW public.view_course_details
WITH (security_invoker = true) AS
WITH course_stats AS (
  SELECT c_1.id,
         (SELECT count(cl.id)
            FROM public.course_lessons cl
            JOIN public.course_modules cm ON cl.module_id = cm.id
           WHERE cm.course_id = c_1.id AND cl.is_published = true) AS total_lessons,
         (SELECT count(lc.id)
            FROM public.lesson_completions lc
           WHERE lc.course_id = c_1.id AND lc.user_id = (SELECT auth.uid())) AS completed_lessons
  FROM public.courses c_1
)
SELECT c.id, c.title, c.description, c.image_url, c.cover_image_url,
       c.slug, c.short_id, c.access_type, c.price, c.is_published,
       c.currency, c.creator_id, c.space_id, c.created_at,
       (SELECT count(*) FROM public.course_enrollments ce WHERE ce.course_id = c.id) AS students_count,
       (EXISTS (
         SELECT 1 FROM public.course_enrollments ce
         WHERE ce.course_id = c.id AND ce.user_id = (SELECT auth.uid())
       )) AS is_enrolled,
       cs.total_lessons,
       cs.completed_lessons,
       CASE WHEN cs.total_lessons > 0
            THEN round(cs.completed_lessons::double precision / cs.total_lessons::double precision * 100::double precision)
            ELSE 0::double precision
       END AS progress_percentage
FROM public.courses c
JOIN course_stats cs ON c.id = cs.id;
