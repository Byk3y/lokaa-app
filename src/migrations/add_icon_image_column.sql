-- Add icon_image column to spaces table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'spaces' 
                 AND column_name = 'icon_image') THEN
    ALTER TABLE public.spaces ADD COLUMN icon_image TEXT;
    RAISE NOTICE 'Added icon_image column to spaces table';
  END IF;
END $$; 