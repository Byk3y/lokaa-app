-- Deprecate space_access table RLS policies

-- Drop existing policies on space_access
DROP POLICY IF EXISTS "Members can view members without recursion" ON public.space_access;
DROP POLICY IF EXISTS "Simple insert policy for space_access" ON public.space_access;
DROP POLICY IF EXISTS "Simple update policy for space_access" ON public.space_access;

-- Disable Row Level Security on the table
ALTER TABLE public.space_access DISABLE ROW LEVEL SECURITY; 