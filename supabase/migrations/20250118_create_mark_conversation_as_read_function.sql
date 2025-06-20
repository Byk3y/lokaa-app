-- Migration: Create mark_conversation_as_read RPC function
-- Created: 2025-01-18
-- Purpose: Add the missing RPC function to mark conversations as read and update unread counts

-- Create the mark_conversation_as_read function
CREATE OR REPLACE FUNCTION public.mark_conversation_as_read(
    p_conversation_id UUID,
    p_user_id UUID,
    p_before_timestamp TIMESTAMPTZ DEFAULT NOW()
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    conversation_exists BOOLEAN := FALSE;
    user_is_participant BOOLEAN := FALSE;
    result JSON;
BEGIN
    -- Check if user is authenticated
    IF auth.uid() IS NULL THEN
        RETURN JSON_BUILD_OBJECT(
            'success', FALSE,
            'message', 'Authentication required',
            'error_code', 'AUTH_REQUIRED'
        );
    END IF;
    
    -- Check if the conversation exists
    SELECT EXISTS (
        SELECT 1 FROM public.chat_conversations 
        WHERE id = p_conversation_id
    ) INTO conversation_exists;
    
    IF NOT conversation_exists THEN
        RETURN JSON_BUILD_OBJECT(
            'success', FALSE,
            'message', 'Conversation not found',
            'error_code', 'CONVERSATION_NOT_FOUND'
        );
    END IF;
    
    -- Check if user is a participant in this conversation
    SELECT EXISTS (
        SELECT 1 FROM public.chat_participants 
        WHERE conversation_id = p_conversation_id 
        AND user_id = p_user_id
    ) INTO user_is_participant;
    
    IF NOT user_is_participant THEN
        RETURN JSON_BUILD_OBJECT(
            'success', FALSE,
            'message', 'User is not a participant in this conversation',
            'error_code', 'NOT_PARTICIPANT'
        );
    END IF;
    
    -- Update the last_read_at timestamp for this user in this conversation
    UPDATE public.chat_participants 
    SET last_read_at = p_before_timestamp
    WHERE conversation_id = p_conversation_id 
    AND user_id = p_user_id;
    
    -- Check if the update was successful
    IF FOUND THEN
        RETURN JSON_BUILD_OBJECT(
            'success', TRUE,
            'message', 'Conversation marked as read successfully',
            'conversation_id', p_conversation_id,
            'user_id', p_user_id,
            'read_at', p_before_timestamp
        );
    ELSE
        RETURN JSON_BUILD_OBJECT(
            'success', FALSE,
            'message', 'Failed to update read status',
            'error_code', 'UPDATE_FAILED'
        );
    END IF;
    
EXCEPTION WHEN OTHERS THEN
    RETURN JSON_BUILD_OBJECT(
        'success', FALSE,
        'message', 'An error occurred: ' || SQLERRM,
        'error_code', SQLSTATE
    );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.mark_conversation_as_read(UUID, UUID, TIMESTAMPTZ) TO authenticated;

-- Add comment
COMMENT ON FUNCTION public.mark_conversation_as_read(UUID, UUID, TIMESTAMPTZ) IS 'Marks a conversation as read for a specific user by updating their last_read_at timestamp'; 