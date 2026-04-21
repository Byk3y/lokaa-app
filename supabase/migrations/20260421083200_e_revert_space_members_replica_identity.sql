-- Phase E: space_members was set to REPLICA IDENTITY FULL to emit full-row
-- payloads on realtime UPDATE/DELETE events. But every consumer of the
-- space_members realtime channel (src/hooks/useSpacePresence.ts,
-- src/hooks/useSpaceMemberCounts.ts) only reads payload.eventType and
-- re-fetches; they never inspect row contents. Meanwhile, the triggers on
-- posts/comments/likes write is_online+last_active_at to space_members on
-- every interaction, turning every click into a full-row WAL entry.
--
-- Revert to REPLICA IDENTITY DEFAULT (primary-key only). Realtime event type
-- is unchanged; WAL amplification drops.

ALTER TABLE public.space_members REPLICA IDENTITY DEFAULT;
