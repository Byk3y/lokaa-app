-- Per-space "Allow DMs from members of this group" preference.
--
-- The Chat tab in MemberSettingsModal used to be cosmetic-only: a local
-- useState toggle with a "TODO: Save preference to backend" next to it.
-- This migration turns it into a real feature:
--
--   1. Adds `chat_enabled` to space_notification_preferences
--      (default TRUE; NULL also reads as TRUE through COALESCE).
--   2. Extends get_effective_notification_preferences to surface it.
--   3. Teaches get_or_create_conversation to enforce it at DM creation
--      (the only chokepoint for new DMs — ChatApiService always goes
--      through this RPC).
--
-- Enforcement semantics (deliberately permissive):
--   Block a NEW DM iff sender and recipient share ≥1 space AND recipient
--   has chat_enabled=FALSE in ALL of those shared spaces. If they share
--   no space, the per-space preference isn't what connects them, so
--   behavior is unchanged (this matches current open-DM semantics).
--   EXISTING conversations are never blocked — a user toggling off
--   shouldn't silently break an in-flight chat with someone they already
--   trusted.

-- 1. Column
ALTER TABLE space_notification_preferences
  ADD COLUMN IF NOT EXISTS chat_enabled BOOLEAN DEFAULT TRUE;

-- 2. Rewrite get_effective_notification_preferences to include chat_enabled.
--
-- Also fixes a pre-existing crash: the original body referenced columns
-- np.new_posts / np.comments / np.likes / np.mentions / np.space_joins /
-- np.quiet_hours_* on notification_preferences. Those columns never
-- existed on that table (it only has email_enabled, push_enabled,
-- space_activity, direct_messages, affiliate_updates, timestamps), so
-- calling this RPC always errored with 42703. The Notifications tab of
-- MemberSettingsModal has been showing a perpetual spinner as a result.
-- Those fallbacks now default to TRUE directly, which matches the
-- existing hardcoded defaults elsewhere in the codebase.
--
-- Return-table signature changes, so drop and recreate.
DROP FUNCTION IF EXISTS public.get_effective_notification_preferences(UUID, UUID);

CREATE OR REPLACE FUNCTION public.get_effective_notification_preferences(
    p_user_id UUID,
    p_space_id UUID DEFAULT NULL
)
RETURNS TABLE (
    user_id UUID,
    space_id UUID,
    digest_email_frequency VARCHAR,
    notifications_email_frequency VARCHAR,
    new_posts BOOLEAN,
    comments BOOLEAN,
    likes BOOLEAN,
    mentions BOOLEAN,
    space_joins BOOLEAN,
    admin_announcements BOOLEAN,
    event_reminders BOOLEAN,
    new_customers BOOLEAN,
    push_enabled BOOLEAN,
    email_enabled BOOLEAN,
    quiet_hours_enabled BOOLEAN,
    quiet_hours_start TIME,
    quiet_hours_end TIME,
    chat_enabled BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
    IF p_space_id IS NULL THEN
        RETURN QUERY
        SELECT
            p_user_id AS user_id,
            NULL::UUID AS space_id,
            'weekly'::VARCHAR AS digest_email_frequency,
            'hourly'::VARCHAR AS notifications_email_frequency,
            TRUE AS new_posts,
            TRUE AS comments,
            TRUE AS likes,
            TRUE AS mentions,
            TRUE AS space_joins,
            TRUE AS admin_announcements,
            TRUE AS event_reminders,
            FALSE AS new_customers,
            COALESCE(np.push_enabled, TRUE) AS push_enabled,
            COALESCE(np.email_enabled, FALSE) AS email_enabled,
            FALSE AS quiet_hours_enabled,
            NULL::TIME AS quiet_hours_start,
            NULL::TIME AS quiet_hours_end,
            TRUE AS chat_enabled
        FROM notification_preferences np
        WHERE np.user_id = p_user_id;
        RETURN;
    END IF;

    RETURN QUERY
    SELECT
        p_user_id AS user_id,
        p_space_id AS space_id,
        COALESCE(snp.digest_email_frequency, 'weekly'::VARCHAR) AS digest_email_frequency,
        COALESCE(snp.notifications_email_frequency, 'hourly'::VARCHAR) AS notifications_email_frequency,
        COALESCE(snp.new_posts, TRUE) AS new_posts,
        COALESCE(snp.comments, TRUE) AS comments,
        COALESCE(snp.likes, TRUE) AS likes,
        COALESCE(snp.mentions, TRUE) AS mentions,
        COALESCE(snp.space_joins, TRUE) AS space_joins,
        COALESCE(snp.admin_announcements, TRUE) AS admin_announcements,
        COALESCE(snp.event_reminders, TRUE) AS event_reminders,
        COALESCE(snp.new_customers, FALSE) AS new_customers,
        COALESCE(snp.push_enabled, np.push_enabled, TRUE) AS push_enabled,
        COALESCE(snp.email_enabled, np.email_enabled, FALSE) AS email_enabled,
        COALESCE(snp.quiet_hours_enabled, FALSE) AS quiet_hours_enabled,
        snp.quiet_hours_start AS quiet_hours_start,
        snp.quiet_hours_end AS quiet_hours_end,
        COALESCE(snp.chat_enabled, TRUE) AS chat_enabled
    FROM notification_preferences np
    LEFT JOIN space_notification_preferences snp
      ON snp.user_id = p_user_id AND snp.space_id = p_space_id
    WHERE np.user_id = p_user_id;
END;
$function$;

-- 3. DM-creation chokepoint enforcement.
-- Replaces the previous body; the only behavior change is the preference
-- check block before INSERT. All prior validation, auth checks, and
-- existing-conversation lookup are preserved verbatim.
CREATE OR REPLACE FUNCTION public.get_or_create_conversation(user1 UUID, user2 UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    conv_id UUID;
    current_user_id UUID;
    sender_id UUID;
    recipient_id UUID;
    shared_count INT;
    allowing_count INT;
BEGIN
    IF user1 IS NULL OR user2 IS NULL THEN
        RAISE EXCEPTION 'Both user IDs must be provided';
    END IF;

    IF user1 = user2 THEN
        RAISE EXCEPTION 'Cannot create conversation with yourself';
    END IF;

    current_user_id := auth.uid();

    IF current_user_id IS NULL OR (current_user_id != user1 AND current_user_id != user2) THEN
        RAISE EXCEPTION 'Unauthorized: User can only create conversations they participate in';
    END IF;

    -- Check for existing conversation first (in both orderings).
    SELECT c.id INTO conv_id
    FROM public.chat_conversations c
    JOIN public.chat_participants p1 ON p1.conversation_id = c.id
    JOIN public.chat_participants p2 ON p2.conversation_id = c.id
    WHERE NOT c.is_group
      AND ((p1.user_id = user1 AND p2.user_id = user2)
           OR (p1.user_id = user2 AND p2.user_id = user1))
    LIMIT 1;

    -- If a conversation already exists, allow through regardless of preferences.
    -- Toggling off shouldn't silently break in-flight chats with people you
    -- already trusted; it only blocks NEW ones.
    IF conv_id IS NOT NULL THEN
        RETURN conv_id;
    END IF;

    -- New conversation: enforce chat_enabled preference on the recipient.
    sender_id := current_user_id;
    recipient_id := CASE WHEN user1 = current_user_id THEN user2 ELSE user1 END;

    -- Count shared active-member spaces and how many of those allow chat.
    SELECT
      COUNT(*),
      COUNT(*) FILTER (WHERE COALESCE(snp.chat_enabled, TRUE) = TRUE)
    INTO shared_count, allowing_count
    FROM public.space_members sm1
    JOIN public.space_members sm2
      ON sm2.space_id = sm1.space_id
    LEFT JOIN public.space_notification_preferences snp
      ON snp.user_id = recipient_id
     AND snp.space_id = sm1.space_id
    WHERE sm1.user_id = sender_id
      AND sm2.user_id = recipient_id
      AND sm1.status = 'active'
      AND sm2.status = 'active';

    -- Block only if they ARE connected through ≥1 space AND recipient has
    -- disabled chat in every one of those shared spaces.
    IF shared_count > 0 AND allowing_count = 0 THEN
        RAISE EXCEPTION 'chat_blocked_by_recipient_preference'
          USING HINT = 'The recipient has disabled direct messages from members of your shared spaces.';
    END IF;

    BEGIN
        INSERT INTO public.chat_conversations (is_group, created_by, created_at)
        VALUES (false, current_user_id, NOW())
        RETURNING id INTO conv_id;

        INSERT INTO public.chat_participants (conversation_id, user_id, joined_at, is_admin)
        VALUES
            (conv_id, user1, NOW(), user1 = current_user_id),
            (conv_id, user2, NOW(), user2 = current_user_id);

    EXCEPTION WHEN OTHERS THEN
        IF SQLERRM = 'chat_blocked_by_recipient_preference' THEN
            RAISE;
        END IF;
        RAISE LOG 'get_or_create_conversation error for users % and %: %', user1, user2, SQLERRM;
        RAISE EXCEPTION 'Unable to create conversation at this time';
    END;

    RETURN conv_id;
END;
$function$;
