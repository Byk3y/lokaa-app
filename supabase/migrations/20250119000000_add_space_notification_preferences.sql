-- Create space_notification_preferences table for per-space notification settings
-- This allows users to customize notification preferences for each space they're in
-- Matching Skool's per-space notification preference system

CREATE TABLE IF NOT EXISTS space_notification_preferences (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    space_id UUID NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
    
    -- Email frequency settings (matching Skool)
    digest_email_frequency VARCHAR(20) DEFAULT 'weekly' CHECK (digest_email_frequency IN ('never', 'daily', 'weekly', 'monthly')),
    notifications_email_frequency VARCHAR(20) DEFAULT 'hourly' CHECK (notifications_email_frequency IN ('never', 'immediate', 'hourly', 'daily')),
    
    -- Individual notification type preferences (null = inherit from global)
    new_posts BOOLEAN DEFAULT NULL,
    comments BOOLEAN DEFAULT NULL,
    likes BOOLEAN DEFAULT NULL,
    mentions BOOLEAN DEFAULT NULL,
    space_joins BOOLEAN DEFAULT NULL,
    
    -- Skool-specific notification types
    admin_announcements BOOLEAN DEFAULT TRUE,
    event_reminders BOOLEAN DEFAULT TRUE,
    new_customers BOOLEAN DEFAULT NULL, -- Only for owners/admins
    
    -- Push and email overrides (null = inherit from global)
    push_enabled BOOLEAN DEFAULT NULL,
    email_enabled BOOLEAN DEFAULT NULL,
    
    -- Quiet hours (null = inherit from global)
    quiet_hours_enabled BOOLEAN DEFAULT NULL,
    quiet_hours_start TIME DEFAULT NULL,
    quiet_hours_end TIME DEFAULT NULL,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    
    -- Ensure one preference set per user per space
    UNIQUE(user_id, space_id)
);

-- Add indexes for performance
CREATE INDEX idx_space_notification_preferences_user_id ON space_notification_preferences(user_id);
CREATE INDEX idx_space_notification_preferences_space_id ON space_notification_preferences(space_id);
CREATE INDEX idx_space_notification_preferences_user_space ON space_notification_preferences(user_id, space_id);

-- Enable RLS
ALTER TABLE space_notification_preferences ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own space notification preferences" ON space_notification_preferences
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own space notification preferences" ON space_notification_preferences
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own space notification preferences" ON space_notification_preferences
    FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own space notification preferences" ON space_notification_preferences
    FOR DELETE USING (user_id = auth.uid());

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_space_notification_preferences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
CREATE TRIGGER update_space_notification_preferences_updated_at_trigger
    BEFORE UPDATE ON space_notification_preferences
    FOR EACH ROW
    EXECUTE FUNCTION update_space_notification_preferences_updated_at();

-- Function to get effective notification preferences for a user in a space
-- This resolves space-specific preferences with global fallbacks
CREATE OR REPLACE FUNCTION get_effective_notification_preferences(
    p_user_id UUID,
    p_space_id UUID DEFAULT NULL
)
RETURNS TABLE (
    user_id UUID,
    space_id UUID,
    digest_email_frequency VARCHAR,
    notifications_email_frequency VARCHAR,
    new_posts BOOLEAN,
    comments BOOLEAN,
    likes BOOLEAN,
    mentions BOOLEAN,
    space_joins BOOLEAN,
    admin_announcements BOOLEAN,
    event_reminders BOOLEAN,
    new_customers BOOLEAN,
    push_enabled BOOLEAN,
    email_enabled BOOLEAN,
    quiet_hours_enabled BOOLEAN,
    quiet_hours_start TIME,
    quiet_hours_end TIME
) AS $$
BEGIN
    -- If no space_id provided, return global preferences only
    IF p_space_id IS NULL THEN
        RETURN QUERY
        SELECT 
            p_user_id as user_id,
            NULL::UUID as space_id,
            'weekly'::VARCHAR as digest_email_frequency,
            'hourly'::VARCHAR as notifications_email_frequency,
            COALESCE(np.new_posts, TRUE) as new_posts,
            COALESCE(np.comments, TRUE) as comments,
            COALESCE(np.likes, TRUE) as likes,
            COALESCE(np.mentions, TRUE) as mentions,
            COALESCE(np.space_joins, TRUE) as space_joins,
            TRUE as admin_announcements,
            TRUE as event_reminders,
            FALSE as new_customers,
            COALESCE(np.push_enabled, TRUE) as push_enabled,
            COALESCE(np.email_enabled, FALSE) as email_enabled,
            COALESCE(np.quiet_hours_enabled, FALSE) as quiet_hours_enabled,
            np.quiet_hours_start,
            np.quiet_hours_end
        FROM notification_preferences np
        WHERE np.user_id = p_user_id;
        RETURN;
    END IF;
    
    -- Return space-specific preferences with global fallbacks
    RETURN QUERY
    SELECT 
        p_user_id as user_id,
        p_space_id as space_id,
        COALESCE(snp.digest_email_frequency, 'weekly'::VARCHAR) as digest_email_frequency,
        COALESCE(snp.notifications_email_frequency, 'hourly'::VARCHAR) as notifications_email_frequency,
        COALESCE(snp.new_posts, np.new_posts, TRUE) as new_posts,
        COALESCE(snp.comments, np.comments, TRUE) as comments,
        COALESCE(snp.likes, np.likes, TRUE) as likes,
        COALESCE(snp.mentions, np.mentions, TRUE) as mentions,
        COALESCE(snp.space_joins, np.space_joins, TRUE) as space_joins,
        COALESCE(snp.admin_announcements, TRUE) as admin_announcements,
        COALESCE(snp.event_reminders, TRUE) as event_reminders,
        COALESCE(snp.new_customers, FALSE) as new_customers,
        COALESCE(snp.push_enabled, np.push_enabled, TRUE) as push_enabled,
        COALESCE(snp.email_enabled, np.email_enabled, FALSE) as email_enabled,
        COALESCE(snp.quiet_hours_enabled, np.quiet_hours_enabled, FALSE) as quiet_hours_enabled,
        COALESCE(snp.quiet_hours_start, np.quiet_hours_start) as quiet_hours_start,
        COALESCE(snp.quiet_hours_end, np.quiet_hours_end) as quiet_hours_end
    FROM notification_preferences np
    LEFT JOIN space_notification_preferences snp ON snp.user_id = p_user_id AND snp.space_id = p_space_id
    WHERE np.user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create default space preferences when user joins a space
CREATE OR REPLACE FUNCTION create_default_space_notification_preferences(
    p_user_id UUID,
    p_space_id UUID
)
RETURNS VOID AS $$
BEGIN
    -- Insert default space preferences if they don't exist
    INSERT INTO space_notification_preferences (
        user_id,
        space_id,
        digest_email_frequency,
        notifications_email_frequency,
        admin_announcements,
        event_reminders
    )
    VALUES (
        p_user_id,
        p_space_id,
        'weekly',
        'hourly',
        TRUE,
        TRUE
    )
    ON CONFLICT (user_id, space_id) DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to cleanup space preferences when user leaves a space
CREATE OR REPLACE FUNCTION cleanup_space_notification_preferences(
    p_user_id UUID,
    p_space_id UUID
)
RETURNS VOID AS $$
BEGIN
    DELETE FROM space_notification_preferences
    WHERE user_id = p_user_id AND space_id = p_space_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enable realtime for space notification preferences
ALTER PUBLICATION supabase_realtime ADD TABLE space_notification_preferences;

-- Create a view for easier querying of effective preferences
CREATE OR REPLACE VIEW user_effective_notification_preferences AS
SELECT 
    np.user_id,
    s.id as space_id,
    s.name as space_name,
    s.subdomain as space_subdomain,
    COALESCE(snp.digest_email_frequency, 'weekly') as digest_email_frequency,
    COALESCE(snp.notifications_email_frequency, 'hourly') as notifications_email_frequency,
    COALESCE(snp.new_posts, np.new_posts) as new_posts,
    COALESCE(snp.comments, np.comments) as comments,
    COALESCE(snp.likes, np.likes) as likes,
    COALESCE(snp.mentions, np.mentions) as mentions,
    COALESCE(snp.space_joins, np.space_joins) as space_joins,
    COALESCE(snp.admin_announcements, TRUE) as admin_announcements,
    COALESCE(snp.event_reminders, TRUE) as event_reminders,
    COALESCE(snp.new_customers, FALSE) as new_customers,
    COALESCE(snp.push_enabled, np.push_enabled) as push_enabled,
    COALESCE(snp.email_enabled, np.email_enabled) as email_enabled,
    COALESCE(snp.quiet_hours_enabled, np.quiet_hours_enabled) as quiet_hours_enabled,
    COALESCE(snp.quiet_hours_start, np.quiet_hours_start) as quiet_hours_start,
    COALESCE(snp.quiet_hours_end, np.quiet_hours_end) as quiet_hours_end,
    sm.role as user_role_in_space
FROM notification_preferences np
CROSS JOIN spaces s
LEFT JOIN space_members sm ON sm.user_id = np.user_id AND sm.space_id = s.id AND sm.status = 'active'
LEFT JOIN space_notification_preferences snp ON snp.user_id = np.user_id AND snp.space_id = s.id
WHERE sm.user_id IS NOT NULL; -- Only include spaces where user is a member

-- Add RLS to the view
ALTER VIEW user_effective_notification_preferences SET (security_invoker = on);