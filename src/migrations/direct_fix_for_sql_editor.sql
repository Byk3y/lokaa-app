-- Direct SQL fix for member visibility issues
-- Copy and paste this entire script into the Supabase SQL Editor

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
            u.email
        FROM space_access sa
        JOIN auth.users u ON sa.user_id = u.id
        WHERE sa.space_id = target_space_id
        ORDER BY sa.role, sa.created_at
    ) LOOP
        RAISE NOTICE 'Member: % - Role: % - Active: %', 
            r.email, r.role, r.is_active;
    END LOOP;
END $$;

-- Step 5: Add any missing members (run this separately for each member you want to add)
-- Replace the values below with the actual user ID and space ID
DO $$
DECLARE
    target_space_id UUID;
    target_user_id UUID;
BEGIN
    -- Get the space ID
    SELECT id INTO target_space_id
    FROM spaces
    WHERE subdomain = 'nocode-architects';
    
    -- Set the user ID you want to add (replace with actual user ID)
    -- You can find user IDs in the auth.users table
    target_user_id := 'REPLACE_WITH_USER_ID'; -- Example: '123e4567-e89b-12d3-a456-426614174000'
    
    -- Skip if this is not a valid UUID
    IF target_user_id = 'REPLACE_WITH_USER_ID' THEN
        RAISE NOTICE 'Please replace REPLACE_WITH_USER_ID with an actual user ID';
        RETURN;
    END IF;
    
    -- Check if the user already has access
    IF EXISTS (
        SELECT 1 FROM space_access
        WHERE space_id = target_space_id
        AND user_id = target_user_id
    ) THEN
        -- Update existing record to ensure it's active
        UPDATE space_access
        SET is_active = true
        WHERE space_id = target_space_id
        AND user_id = target_user_id;
        
        RAISE NOTICE 'Updated existing access for user %', target_user_id;
    ELSE
        -- Add the user as a member
        INSERT INTO space_access (
            space_id,
            user_id,
            is_active,
            role,
            created_at
        ) VALUES (
            target_space_id,
            target_user_id,
            true,
            'member',
            NOW()
        );
        
        RAISE NOTICE 'Added new access for user %', target_user_id;
    END IF;
END $$; 