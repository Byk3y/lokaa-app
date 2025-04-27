-- Add is_private column to spaces table
ALTER TABLE public.spaces ADD COLUMN IF NOT EXISTS is_private BOOLEAN DEFAULT false;

-- Update existing spaces to have is_private as false (safe default)
UPDATE public.spaces SET is_private = false WHERE is_private IS NULL;

-- Make sure the column is not nullable after updating existing records
ALTER TABLE public.spaces ALTER COLUMN is_private SET NOT NULL; 