-- Migration: Populate space notification preferences for existing users
-- This creates default space preferences for all existing user-space combinations

-- Function to create default space notification preferences for existing users
CREATE OR REPLACE FUNCTION populate_existing_space_notification_preferences()
RETURNS INTEGER AS $$
DECLARE
    created_count INTEGER := 0;
    user_space_record RECORD;
BEGIN
    -- Create default space preferences for all existing user-space memberships
    -- that don't already have space-specific preferences
    FOR user_space_record IN 
        SELECT DISTINCT sm.user_id, sm.space_id, s.name as space_name
        FROM space_members sm
        JOIN spaces s ON s.id = sm.space_id
        WHERE NOT EXISTS (
            SELECT 1 FROM space_notification_preferences snp 
            WHERE snp.user_id = sm.user_id AND snp.space_id = sm.space_id
        )
    LOOP
        BEGIN
            -- Insert default space preferences
            INSERT INTO space_notification_preferences (
                user_id,
                space_id,
                digest_email_frequency,
                notifications_email_frequency,
                admin_announcements,
                event_reminders
                -- Other fields default to NULL (inherit from global preferences)
            ) VALUES (
                user_space_record.user_id,
                user_space_record.space_id,
                'weekly',
                'hourly', 
                true,
                true
            );
            
            created_count := created_count + 1;
            
            -- Log progress every 100 records
            IF created_count % 100 = 0 THEN
                RAISE NOTICE 'Created % space notification preferences so far...', created_count;
            END IF;
            
        EXCEPTION
            WHEN unique_violation THEN
                -- Skip if already exists (race condition protection)
                CONTINUE;
            WHEN OTHERS THEN
                -- Log error but continue with other records
                RAISE WARNING 'Failed to create space preferences for user % in space %: %', 
                    user_space_record.user_id, user_space_record.space_id, SQLERRM;
        END;
    END LOOP;
    
    RAISE NOTICE 'Migration completed. Created % space notification preference records.', created_count;
    RETURN created_count;
END;
$$ LANGUAGE plpgsql;

-- Execute the migration
SELECT populate_existing_space_notification_preferences();

-- Clean up the function (optional - can keep for future use)
-- DROP FUNCTION IF EXISTS populate_existing_space_notification_preferences();

-- Create a trigger function to automatically create space preferences for new space members
CREATE OR REPLACE FUNCTION create_default_space_notification_preferences_trigger()
RETURNS TRIGGER AS $$
BEGIN
    -- Only create preferences if they don't already exist
    IF NOT EXISTS (
        SELECT 1 FROM space_notification_preferences 
        WHERE user_id = NEW.user_id AND space_id = NEW.space_id
    ) THEN
        INSERT INTO space_notification_preferences (
            user_id,
            space_id,
            digest_email_frequency,
            notifications_email_frequency,
            admin_announcements,
            event_reminders
        ) VALUES (
            NEW.user_id,
            NEW.space_id,
            'weekly',
            'hourly',
            true,
            true
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-create space preferences when users join spaces
DROP TRIGGER IF EXISTS auto_create_space_notification_preferences ON space_members;
CREATE TRIGGER auto_create_space_notification_preferences
    AFTER INSERT ON space_members
    FOR EACH ROW 
    EXECUTE FUNCTION create_default_space_notification_preferences_trigger();

-- Add helpful comments
COMMENT ON FUNCTION create_default_space_notification_preferences_trigger() IS 
'Automatically creates default space notification preferences when a user joins a space';

COMMENT ON TRIGGER auto_create_space_notification_preferences ON space_members IS 
'Ensures every space member has space-specific notification preferences';