# Admin Guide: Fixing Database Issues

## Space Creation Error: Infinite Recursion Detected

If you're seeing the error message "Schema check failed: infinite recursion detected in policy for relation 'spaces'", this is a known issue with the Row Level Security (RLS) policies in the Supabase database. This document provides instructions for fixing it.

## How to Fix the Issue

### 1. Access the SQL Editor in Supabase

1. Log in to your Supabase dashboard
2. Navigate to the project where the error is occurring
3. Select "SQL Editor" from the left sidebar

### 2. Run the SQL Fix Script

Copy and paste the following SQL script into the editor, then click "Run":

```sql
-- Fix for the infinite recursion in spaces table policies
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
```

### 3. Verify the Fix

After running the script, you should see a message indicating that the commands have been executed successfully. To verify the fix:

1. Navigate to the "Authentication" > "Policies" section in your Supabase dashboard
2. Look for the "spaces" table
3. You should see the new policies listed:
   - "Read spaces for authenticated users"
   - "Insert spaces for authenticated users"
   - "Update spaces for owners"
   - "Delete spaces for owners"

### 4. Test Space Creation

Try creating a new space in your application. The infinite recursion error should no longer occur.

## Technical Explanation

The issue was caused by a circular reference in the RLS policies for the "spaces" table. Specifically, one of the policies was referring to itself (either directly or through another table), creating an infinite loop when the database tried to evaluate the policy condition.

The fix replaces all policies with simplified versions that don't create circular references while maintaining proper security controls:

1. Users can view spaces they own or have access to
2. Users can create spaces where they are the owner
3. Users can update and delete only spaces they own

## If the Issue Persists

If you're still encountering issues after applying the fix, try the following:

1. Check if there are any triggers on the spaces table that might be causing recursive behavior
2. Look for functions that might reference the spaces table in a recursive manner
3. Consider temporarily disabling RLS on the table to test if it resolves the issue
4. Contact support for further assistance

## Need Help?

If you're unable to resolve the issue using this guide, please contact our support team at support@lokaa.com with the following information:

- Your Supabase project ID
- Any error messages you're seeing
- The email address associated with your account

We'll be happy to help you resolve this issue promptly. 