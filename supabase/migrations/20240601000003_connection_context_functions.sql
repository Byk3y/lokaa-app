-- Create function to get context about how users are connected
CREATE OR REPLACE FUNCTION get_user_connection_context(user_id_1 UUID, user_id_2 UUID)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    connection_info jsonb;
    shared_space record;
    first_message record;
BEGIN
    -- Check if users are in the same space
    SELECT 
        s.id, 
        s.name, 
        s.icon_url, 
        s.subdomain
    INTO shared_space
    FROM space_members sm1
    JOIN space_members sm2 ON sm1.space_id = sm2.space_id
    JOIN spaces s ON s.id = sm1.space_id
    WHERE sm1.user_id = user_id_1 
    AND sm2.user_id = user_id_2
    LIMIT 1;
    
    IF shared_space IS NOT NULL THEN
        -- Check if they have a conversation history
        SELECT 
            m.user_id AS first_message_user_id,
            m.created_at AS first_message_time,
            p.full_name AS first_message_sender_name
        INTO first_message
        FROM direct_messages m
        JOIN profiles p ON p.id = m.user_id
        WHERE 
            (m.sender_id = user_id_1 AND m.receiver_id = user_id_2)
            OR
            (m.sender_id = user_id_2 AND m.receiver_id = user_id_1)
        ORDER BY m.created_at ASC
        LIMIT 1;
        
        connection_info := jsonb_build_object(
            'connection_type', 'space',
            'space_id', shared_space.id,
            'space_name', shared_space.name,
            'space_icon', shared_space.icon_url,
            'space_subdomain', shared_space.subdomain,
            'has_conversation', first_message IS NOT NULL
        );
        
        IF first_message IS NOT NULL THEN
            connection_info := connection_info || jsonb_build_object(
                'first_message_user_id', first_message.first_message_user_id,
                'first_message_time', first_message.first_message_time,
                'first_message_sender_name', first_message.first_message_sender_name
            );
        END IF;
    ELSE
        connection_info := jsonb_build_object(
            'connection_type', 'unknown'
        );
    END IF;
    
    RETURN connection_info;
END;
$$; 