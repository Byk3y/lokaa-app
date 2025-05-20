-- Migration to add policy allowing users to self-join spaces
-- This policy allows authenticated users to insert their own membership records

-- Create a new policy for self-joining spaces
DO $$
BEGIN
    -- Check if the policy already exists
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'space_access' 
        AND policyname = 'Allow users to join spaces'
    ) THEN
        EXECUTE 'CREATE POLICY "Allow users to join spaces" ON space_access
            FOR INSERT
            TO authenticated
            WITH CHECK (
                user_id = auth.uid() AND
                EXISTS (
                    SELECT 1 FROM spaces 
                    WHERE spaces.id = space_access.space_id 
                    AND spaces.is_private = false
                )
            )';
        
        RAISE NOTICE 'Created policy: Allow users to join spaces';
    ELSE
        RAISE NOTICE 'Policy already exists: Allow users to join spaces';
    END IF;
END $$; 