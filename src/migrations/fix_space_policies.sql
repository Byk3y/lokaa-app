-- Fix for the infinite recursion in spaces table policies
-- This script can be run through Supabase SQL editor to resolve the issue

-- First, drop any existing RLS policies on the spaces table that might be causing recursion
DROP POLICY IF EXISTS "Enable read access for all authenticated users" ON spaces;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON spaces;
DROP POLICY IF EXISTS "Enable update for users based on owner_id" ON spaces;
DROP POLICY IF EXISTS "Enable delete for users based on owner_id" ON spaces;

-- Create simplified read policy (show spaces to authenticated users who have access)
CREATE POLICY "Read spaces for authenticated users" ON spaces
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = owner_id OR  -- User owns the space
    EXISTS (
      SELECT 1 FROM space_access 
      WHERE space_access.space_id = spaces.id 
      AND space_access.user_id = auth.uid()
      AND space_access.is_active = true
    )
  );

-- Simple insert policy (authenticated users can create spaces)
CREATE POLICY "Insert spaces for authenticated users" ON spaces
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = owner_id);

-- Update policy (owners can update their spaces)
CREATE POLICY "Update spaces for owners" ON spaces
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

-- Delete policy (owners can delete their spaces)
CREATE POLICY "Delete spaces for owners" ON spaces
  FOR DELETE
  TO authenticated
  USING (auth.uid() = owner_id);

-- Ensure RLS is enabled on the spaces table
ALTER TABLE spaces ENABLE ROW LEVEL SECURITY; 