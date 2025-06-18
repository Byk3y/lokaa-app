-- Migration: Fix public_join_space RPC function to handle is_online constraint
-- Created: 2025-06-18
-- Purpose: Ensure the public_join_space function properly sets the is_online field to satisfy database constraints

-- Drop existing function if it exists (to update it)
DROP FUNCTION IF EXISTS public.public_join_space(p_space_id UUID);

-- Create the corrected public_join_space function
CREATE OR REPLACE FUNCTION public.public_join_space(p_space_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    current_user_id UUID;
    space_exists BOOLEAN := FALSE;
    existing_member RECORD;
    result JSON;
BEGIN
    -- Get the current authenticated user
    current_user_id := auth.uid();
    
    -- Check if user is authenticated
    IF current_user_id IS NULL THEN
        RETURN JSON_BUILD_OBJECT(
            'success', FALSE,
            'message', 'Authentication required',
            'error_code', 'AUTH_REQUIRED'
        );
    END IF;
    
    -- Check if space exists
    SELECT EXISTS (
        SELECT 1 FROM public.spaces 
        WHERE id = p_space_id
    ) INTO space_exists;
    
    IF NOT space_exists THEN
        RETURN JSON_BUILD_OBJECT(
            'success', FALSE,
            'message', 'Space not found',
            'error_code', 'SPACE_NOT_FOUND'
        );
    END IF;
    
    -- Check if user is already a member
    SELECT * INTO existing_member
    FROM public.space_members 
    WHERE user_id = current_user_id 
    AND space_id = p_space_id
    LIMIT 1;
    
    -- If already an active member
    IF existing_member.id IS NOT NULL AND existing_member.status = 'active' THEN
        RETURN JSON_BUILD_OBJECT(
            'success', TRUE,
            'message', 'You are already a member of this space',
            'space_id', p_space_id
        );
    END IF;
    
    -- If inactive member exists, reactivate
    IF existing_member.id IS NOT NULL AND existing_member.status != 'active' THEN
        UPDATE public.space_members 
        SET 
            status = 'active',
            is_online = FALSE, -- CRITICAL FIX: Explicitly set is_online
            joined_at = NOW()
        WHERE id = existing_member.id;
        
        RETURN JSON_BUILD_OBJECT(
            'success', TRUE,
            'message', 'Membership reactivated successfully',
            'space_id', p_space_id
        );
    END IF;
    
    -- Create new membership
    BEGIN
        INSERT INTO public.space_members (
            user_id,
            space_id,
            role,
            status,
            is_online, -- CRITICAL FIX: Explicitly set is_online field
            joined_at
        ) VALUES (
            current_user_id,
            p_space_id,
            'member',
            'active',
            FALSE, -- CRITICAL FIX: Set to FALSE to satisfy constraint
            NOW()
        );
        
        RETURN JSON_BUILD_OBJECT(
            'success', TRUE,
            'message', 'Successfully joined space',
            'space_id', p_space_id
        );
        
    EXCEPTION WHEN OTHERS THEN
        RETURN JSON_BUILD_OBJECT(
            'success', FALSE,
            'message', 'An error occurred: ' || SQLERRM,
            'error_code', SQLSTATE
        );
    END;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.public_join_space(UUID) TO authenticated;

-- Add comment
COMMENT ON FUNCTION public.public_join_space(UUID) IS 'Allows authenticated users to join a public space, with proper is_online field handling'; 