-- Drop obsolete RPC functions related to space_access joining
DROP FUNCTION IF EXISTS public.join_space_directly(user_id_param UUID, space_id_param UUID);
DROP FUNCTION IF EXISTS public.join_space_directly(UUID, UUID); -- Alternate signature if exists

DROP FUNCTION IF EXISTS public.add_space_join_policy();

-- Optionally, drop the RLS policy if it's known and managed here
-- However, RLS policies are often managed in bulk policy files.
-- For now, we focus on dropping the functions that create/use them for space_access.
-- If the policy "Allow users to join spaces" on space_access needs explicit dropping,
-- it can be added here, e.g.:
-- DROP POLICY IF EXISTS "Allow users to join spaces" ON public.space_access;

COMMENT ON MIGRATION IS 'Drops the obsolete join_space_directly and add_space_join_policy RPCs that interacted with the space_access table.'; 