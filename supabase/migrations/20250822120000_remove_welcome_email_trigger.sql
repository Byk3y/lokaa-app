-- Remove the welcome email trigger that's causing timing issues
-- The AuthContext will handle the entire welcome email process

-- Drop the trigger first
DROP TRIGGER IF EXISTS trigger_send_welcome_email_on_confirmation ON auth.users;

-- Drop the function
DROP FUNCTION IF EXISTS public.send_welcome_email_on_confirmation();

-- Reset any users who had welcome_email_sent_at set by the trigger
-- This allows the AuthContext to properly send welcome emails
UPDATE public.users 
SET welcome_email_sent_at = NULL 
WHERE welcome_email_sent_at IS NOT NULL;
