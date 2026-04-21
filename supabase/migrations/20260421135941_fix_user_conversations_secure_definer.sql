-- Revert user_conversations_secure to SECURITY DEFINER.
--
-- The Phase D3 conversion to security_invoker was wrong for this view.
-- Under security_invoker, the view's JOIN public.users is subject to the
-- caller's users RLS, which gates on "shared space membership." Chat
-- partners you've DM'd but don't currently share a space with get filtered
-- out, and the UI falls back to "Unknown User" in the conversation list.
--
-- Chat-participant display is intentionally not space-gated: if I've ever
-- had a conversation with someone, I should see their name regardless of
-- current space membership. That's why this view was SECURITY DEFINER in
-- the first place. Reverting, with an explicit comment.
--
-- Trade-off: re-introduces the security_definer_view advisor warning for
-- this specific view. The warning is correct in general, but this view's
-- elevated privileges are deliberate. view_course_details stays as
-- security_invoker since its natural RLS scoping is correct.

DROP VIEW IF EXISTS public.user_conversations_secure;

CREATE VIEW public.user_conversations_secure AS
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
WHERE p.user_id = auth.uid();

COMMENT ON VIEW public.user_conversations_secure IS
  'SECURITY DEFINER is intentional — chat-partner name/avatar must be '
  'visible regardless of whether the viewer currently shares a space with '
  'the partner. Callers should filter by their own user_id; the view''s '
  'final WHERE clause enforces that.';
