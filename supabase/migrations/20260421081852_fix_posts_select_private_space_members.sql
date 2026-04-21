-- The prior posts_select_simple policy granted SELECT only when the post's
-- space was public (is_private = false) or the caller wrote the post.
-- A member of a PRIVATE space could not see other members' posts — the feed
-- would go blank for any paying customer of a private space.
--
-- Replace it with a correct rule using the existing SECURITY DEFINER helper
-- check_is_space_member (owner or active member). Also wrap auth.uid() in
-- (SELECT auth.uid()) so the planner caches it once per query instead of
-- re-evaluating per row (auth_rls_initplan advisor).

DROP POLICY IF EXISTS "posts_select_simple" ON public.posts;

CREATE POLICY "posts_select_v2" ON public.posts
  FOR SELECT
  TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    OR public.check_is_space_member(space_id, (SELECT auth.uid()))
    OR EXISTS (
      SELECT 1 FROM public.spaces s
      WHERE s.id = posts.space_id AND s.is_private = false
    )
  );
