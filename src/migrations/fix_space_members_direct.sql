-- Direct SQL script to fix member visibility issues
-- Run this directly in your database

-- Step 1: Get the space ID for the space with subdomain 'nocode-architects'
DO $$
DECLARE
    target_space_id UUID;
    target_owner_id UUID;
    fixed_count INTEGER := 0;
BEGIN
    -- Get the space ID and owner ID
    SELECT id, owner_id INTO target_space_id, target_owner_id
    FROM spaces
    WHERE subdomain = 'nocode-architects';
    
    IF target_space_id IS NULL THEN
        RAISE NOTICE 'Space with subdomain nocode-architects not found';
        RETURN;
    END IF;
    
    RAISE NOTICE 'Found space ID: %', target_space_id;
    RAISE NOTICE 'Owner ID: %', target_owner_id;
    
    -- Step 2: Ensure the owner has a space_access record
    IF NOT EXISTS (
        SELECT 1 FROM space_access
        WHERE space_id = target_space_id
        AND user_id = target_owner_id
    ) THEN
        -- Insert owner record
        INSERT INTO space_access (
            space_id,
            user_id,
            is_active,
            role,
            created_at
        ) VALUES (
            target_space_id,
            target_owner_id,
            true,
            'owner',
            NOW()
        );
        
        RAISE NOTICE 'Added owner record for user %', target_owner_id;
        fixed_count := fixed_count + 1;
    ELSE
        -- Make sure the owner record is active and has proper role
        UPDATE space_access
        SET is_active = true, role = 'owner'
        WHERE space_id = target_space_id
        AND user_id = target_owner_id
        AND (is_active = false OR role != 'owner');
        
        IF FOUND THEN
            RAISE NOTICE 'Updated owner record for user %', target_owner_id;
            fixed_count := fixed_count + 1;
        END IF;
    END IF;
    
    -- Step 3: Reactivate any inactive records
    UPDATE space_access
    SET is_active = true
    WHERE space_id = target_space_id
    AND is_active = false;
    
    GET DIAGNOSTICS fixed_count = ROW_COUNT;
    RAISE NOTICE 'Reactivated % inactive member records', fixed_count;
    
    -- Step 4: List all members for verification
    RAISE NOTICE '--- Current space_access records ---';
    FOR r IN (
        SELECT 
            sa.id, 
            sa.user_id, 
            sa.role, 
            sa.is_active, 
            u.email, 
            u.full_name
        FROM space_access sa
        JOIN auth.users u ON sa.user_id = u.id
        WHERE sa.space_id = target_space_id
        ORDER BY sa.role, sa.created_at
    ) LOOP
        RAISE NOTICE 'Member: % (%) - Role: % - Active: %', 
            r.full_name, r.email, r.role, r.is_active;
    END LOOP;
    
    -- Step 5: Fix the foreign key relationship issue
    RAISE NOTICE '--- Checking for foreign key relationship issues ---';
    
    -- Ensure the space_access table has the correct foreign key constraints
    -- This is a common cause of the "Searched for a foreign key relationship" error
    
    -- First check if the constraint exists and drop it if needed
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'space_access_user_id_fkey' 
        AND table_name = 'space_access'
    ) THEN
        RAISE NOTICE 'Dropping existing foreign key constraint';
        ALTER TABLE space_access DROP CONSTRAINT space_access_user_id_fkey;
    END IF;
    
    -- Re-create the constraint with the correct reference
    RAISE NOTICE 'Creating correct foreign key constraint';
    ALTER TABLE space_access 
    ADD CONSTRAINT space_access_user_id_fkey 
    FOREIGN KEY (user_id) 
    REFERENCES auth.users(id) ON DELETE CASCADE;
    
    RAISE NOTICE 'Fixed foreign key relationship';
    
    RAISE NOTICE '--- Fix complete ---';
END $$; 