-- Create a reliable welcome email trigger that fires when email is confirmed
-- This ensures welcome emails are sent even if the client-side fails

-- Function to send welcome email via edge function
CREATE OR REPLACE FUNCTION public.send_welcome_email_on_confirmation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
  project_ref text;
  functions_url text;
  user_email text;
  user_first_name text;
  user_full_name text;
BEGIN
  -- Only proceed if email was just confirmed
  IF NEW.email_confirmed_at IS NOT NULL AND 
     (OLD.email_confirmed_at IS NULL OR OLD.email_confirmed_at != NEW.email_confirmed_at) THEN
    
    -- Get user details
    user_email := NEW.email;
    user_first_name := NEW.raw_user_meta_data->>'first_name';
    user_full_name := NEW.raw_user_meta_data->>'full_name';
    
    -- Determine first name (fallback to email prefix if not provided)
    IF user_first_name IS NULL OR user_first_name = '' THEN
      IF user_full_name IS NOT NULL AND user_full_name != '' THEN
        user_first_name := split_part(user_full_name, ' ', 1);
      ELSE
        user_first_name := split_part(user_email, '@', 1);
      END IF;
    END IF;
    
    -- Check if welcome email was already sent
    IF EXISTS (
      SELECT 1 FROM public.email_sends 
      WHERE user_id = NEW.id AND type = 'welcome'
    ) THEN
      RETURN NEW; -- Already sent, skip
    END IF;
    
    -- Record the email send attempt (idempotency)
    INSERT INTO public.email_sends (user_id, type, created_at)
    VALUES (NEW.id, 'welcome', NOW())
    ON CONFLICT (user_id, type) DO NOTHING;
    
    -- Send welcome email via edge function (fire-and-forget)
    -- Note: This is a best-effort approach. The edge function will handle the actual sending
    PERFORM net.http_post(
      url := 'https://' || current_setting('app.project_ref') || '.functions.supabase.co/send-welcome-email',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.service_role_key')
      ),
      body := jsonb_build_object(
        'type', 'welcome',
        'to', user_email,
        'firstName', user_first_name,
        'userId', NEW.id
      )
    );
    
  END IF;
  
  RETURN NEW;
END;
$$;

-- Ensure the function owner is postgres so it can bypass RLS
ALTER FUNCTION public.send_welcome_email_on_confirmation() OWNER TO postgres;

-- Create the trigger on auth.users
DROP TRIGGER IF EXISTS trigger_send_welcome_email_on_confirmation ON auth.users;

CREATE TRIGGER trigger_send_welcome_email_on_confirmation
  AFTER UPDATE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.send_welcome_email_on_confirmation();

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.send_welcome_email_on_confirmation() TO service_role;

-- Add helpful comments
COMMENT ON FUNCTION public.send_welcome_email_on_confirmation() IS 
'Sends welcome email when a user confirms their email address';

COMMENT ON TRIGGER trigger_send_welcome_email_on_confirmation ON auth.users IS 
'Ensures welcome emails are sent reliably when users confirm their email';



