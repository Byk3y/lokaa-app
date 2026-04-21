-- Phase D2: add covering indexes for foreign keys on hot-path tables.
-- These FKs are traversed during space load, feed render, classroom render,
-- and notification fetch. Missing indexes here forced seq-scans against
-- space_members/lesson/course tables on every JOIN, which was masked by
-- current tiny row counts but will bite as soon as data grows.
--
-- Skipped (pre-launch / low-volume): chat_conversations.created_by,
-- course_media.*, course_videos.*, educational_content_versions.*,
-- membership_history.*, referrals.*, search_analytics.*, security_alerts.*,
-- space_events.creator_id, space_media.created_by, space_setup.space_id,
-- user_devices.push_subscription_id, app_auth.revoked_tokens.fk_user.

-- classroom & course traversal
CREATE INDEX IF NOT EXISTS idx_course_modules_space_id         ON public.course_modules (space_id);
CREATE INDEX IF NOT EXISTS idx_course_modules_parent_module_id ON public.course_modules (parent_module_id);
CREATE INDEX IF NOT EXISTS idx_course_enrollments_user_id      ON public.course_enrollments (user_id);
CREATE INDEX IF NOT EXISTS idx_lesson_completions_user_id      ON public.lesson_completions (user_id);
CREATE INDEX IF NOT EXISTS idx_lesson_completions_course_id    ON public.lesson_completions (course_id);
CREATE INDEX IF NOT EXISTS idx_lesson_completions_module_id    ON public.lesson_completions (module_id);
CREATE INDEX IF NOT EXISTS idx_lesson_content_blocks_lesson_id  ON public.lesson_content_blocks (lesson_id);
CREATE INDEX IF NOT EXISTS idx_lesson_content_blocks_content_id ON public.lesson_content_blocks (content_id);
CREATE INDEX IF NOT EXISTS idx_course_lessons_post_id          ON public.course_lessons (post_id);
CREATE INDEX IF NOT EXISTS idx_courses_creator_id              ON public.courses (creator_id);

-- feed & post interactions
CREATE INDEX IF NOT EXISTS idx_posts_category_id               ON public.posts (category_id);
CREATE INDEX IF NOT EXISTS idx_posts_course_id                 ON public.posts (course_id);
CREATE INDEX IF NOT EXISTS idx_posts_pinned_by                 ON public.posts (pinned_by);
CREATE INDEX IF NOT EXISTS idx_post_likes_user_id              ON public.post_likes (user_id);
CREATE INDEX IF NOT EXISTS idx_poll_votes_post_id              ON public.poll_votes (post_id);

-- notifications
CREATE INDEX IF NOT EXISTS idx_notifications_actor_id          ON public.notifications (actor_id);

-- space metadata
CREATE INDEX IF NOT EXISTS idx_space_access_user_id            ON public.space_access (user_id);
CREATE INDEX IF NOT EXISTS idx_space_categories_space_id       ON public.space_categories (space_id);
CREATE INDEX IF NOT EXISTS idx_space_categories_created_by     ON public.space_categories (created_by);

-- users: used during auth-boot to resolve the last-joined space.
CREATE INDEX IF NOT EXISTS idx_users_last_joined_space_id      ON public.users (last_joined_space_id);

-- presence audit
CREATE INDEX IF NOT EXISTS idx_presence_logs_space_id          ON public.presence_logs (space_id);
CREATE INDEX IF NOT EXISTS idx_presence_state_space_id         ON public.presence_state (space_id);
