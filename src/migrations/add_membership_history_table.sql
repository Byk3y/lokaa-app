-- Migration: add_membership_history_table
-- Description: Creates a membership_history table to track all membership-related actions

-- Create membership_history table for audit trail
CREATE TABLE IF NOT EXISTS public.membership_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    space_id UUID NOT NULL REFERENCES public.spaces(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    action VARCHAR(50) NOT NULL,
    previous_role VARCHAR(50),
    new_role VARCHAR(50),
    performed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    metadata JSONB
);

-- Add indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_membership_history_space_id ON public.membership_history(space_id);
CREATE INDEX IF NOT EXISTS idx_membership_history_user_id ON public.membership_history(user_id);
CREATE INDEX IF NOT EXISTS idx_membership_history_action ON public.membership_history(action);
CREATE INDEX IF NOT EXISTS idx_membership_history_created_at ON public.membership_history(created_at);

-- Add RLS policies
ALTER TABLE public.membership_history ENABLE ROW LEVEL SECURITY;

-- Space owners can see all history for their space
CREATE POLICY "Space owners can see all membership history"
    ON public.membership_history FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM spaces
            WHERE spaces.id = membership_history.space_id
            AND spaces.owner_id = auth.uid()
        )
    );

-- Space admins can see all history for their space
CREATE POLICY "Space admins can see all membership history"
    ON public.membership_history FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM space_access
            WHERE space_access.space_id = membership_history.space_id
            AND space_access.user_id = auth.uid()
            AND space_access.role = 'admin'
            AND space_access.is_active = true
        )
    );

-- Users can see their own membership history
CREATE POLICY "Users can see their own membership history"
    ON public.membership_history FOR SELECT
    USING (
        user_id = auth.uid()
    );

-- Only service role can insert records (will be done via functions)
CREATE POLICY "Service role can insert membership history"
    ON public.membership_history FOR INSERT
    WITH CHECK (auth.uid() = membership_history.performed_by);

-- Create a function to record membership events
CREATE OR REPLACE FUNCTION record_membership_event(
    space_id_param UUID,
    user_id_param UUID,
    action_param VARCHAR,
    previous_role_param VARCHAR DEFAULT NULL,
    new_role_param VARCHAR DEFAULT NULL,
    performed_by_param UUID DEFAULT NULL,
    metadata_param JSONB DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    record_id UUID;
BEGIN
    -- Set performed_by to the current user if not provided
    IF performed_by_param IS NULL THEN
        performed_by_param := auth.uid();
    END IF;

    -- Insert the record
    INSERT INTO public.membership_history(
        space_id,
        user_id,
        action,
        previous_role,
        new_role,
        performed_by,
        metadata
    ) VALUES (
        space_id_param,
        user_id_param,
        action_param,
        previous_role_param,
        new_role_param,
        performed_by_param,
        metadata_param
    )
    RETURNING id INTO record_id;

    RETURN record_id;
END;
$$;

-- Create a trigger to automatically record membership changes
CREATE OR REPLACE FUNCTION record_membership_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Handle INSERT
    IF (TG_OP = 'INSERT') THEN
        PERFORM record_membership_event(
            NEW.space_id,
            NEW.user_id,
            'join',
            NULL,
            NEW.role,
            auth.uid()
        );
        RETURN NEW;
    
    -- Handle UPDATE
    ELSIF (TG_OP = 'UPDATE') THEN
        -- If role changed
        IF NEW.role <> OLD.role THEN
            PERFORM record_membership_event(
                NEW.space_id,
                NEW.user_id,
                'role_change',
                OLD.role,
                NEW.role,
                auth.uid()
            );
        END IF;
        
        -- If active status changed
        IF NEW.is_active <> OLD.is_active THEN
            PERFORM record_membership_event(
                NEW.space_id,
                NEW.user_id,
                CASE WHEN NEW.is_active THEN 'reactivate' ELSE 'deactivate' END,
                NULL,
                NULL,
                auth.uid()
            );
        END IF;
        
        RETURN NEW;
    
    -- Handle DELETE
    ELSIF (TG_OP = 'DELETE') THEN
        PERFORM record_membership_event(
            OLD.space_id,
            OLD.user_id,
            'remove',
            OLD.role,
            NULL,
            auth.uid()
        );
        RETURN OLD;
    END IF;
    
    RETURN NULL;
END;
$$;

-- Add the trigger to the space_access table
DROP TRIGGER IF EXISTS membership_audit_trigger ON public.space_access;
CREATE TRIGGER membership_audit_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.space_access
FOR EACH ROW EXECUTE FUNCTION record_membership_change(); 