-- Migration: add_last_joined_space_id_to_profiles
-- Description: Adds last_joined_space_id column to profiles table to track the most recently joined space

-- First determine which table to use (profiles, users, or auth.users)
DO $$
DECLARE
  target_table TEXT;
BEGIN
  -- Check which table exists: profiles, users, or auth.users
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles' AND table_schema = 'public') THEN
    target_table := 'profiles';
  ELSIF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users' AND table_schema = 'public') THEN
    target_table := 'users';
  ELSIF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users' AND table_schema = 'auth') THEN
    target_table := 'auth.users';
  ELSE
    RAISE EXCEPTION 'Neither profiles, users, nor auth.users table found in the database';
  END IF;

  RAISE NOTICE 'Target table for migration: %', target_table;

  -- Check if the column already exists in the target table
  IF target_table = 'profiles' AND NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'profiles'
    AND column_name = 'last_joined_space_id'
  ) THEN
    -- Add the last_joined_space_id column to the profiles table
    EXECUTE format('
      ALTER TABLE profiles
      ADD COLUMN last_joined_space_id UUID DEFAULT NULL;

      -- Create a foreign key constraint referencing the spaces table
      ALTER TABLE profiles
      ADD CONSTRAINT fk_profiles_last_joined_space_id
      FOREIGN KEY (last_joined_space_id)
      REFERENCES spaces(id)
      ON DELETE SET NULL;

      -- Create an index on last_joined_space_id for better performance
      CREATE INDEX idx_profiles_last_joined_space_id ON profiles(last_joined_space_id);
    ');
    
    RAISE NOTICE 'Added last_joined_space_id column to profiles table with foreign key and index';

  ELSIF target_table = 'users' AND NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'users' AND table_schema = 'public'
    AND column_name = 'last_joined_space_id'
  ) THEN
    -- Add the last_joined_space_id column to the users table
    EXECUTE format('
      ALTER TABLE users
      ADD COLUMN last_joined_space_id UUID DEFAULT NULL;

      -- Create a foreign key constraint referencing the spaces table
      ALTER TABLE users
      ADD CONSTRAINT fk_users_last_joined_space_id
      FOREIGN KEY (last_joined_space_id)
      REFERENCES spaces(id)
      ON DELETE SET NULL;

      -- Create an index on last_joined_space_id for better performance
      CREATE INDEX idx_users_last_joined_space_id ON users(last_joined_space_id);
    ');
    
    RAISE NOTICE 'Added last_joined_space_id column to users table with foreign key and index';

  ELSIF target_table = 'auth.users' AND NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'users' AND table_schema = 'auth'
    AND column_name = 'last_joined_space_id'
  ) THEN
    -- Add the last_joined_space_id column to the auth.users table
    EXECUTE format('
      ALTER TABLE auth.users
      ADD COLUMN last_joined_space_id UUID DEFAULT NULL;

      -- Create a foreign key constraint referencing the spaces table
      ALTER TABLE auth.users
      ADD CONSTRAINT fk_auth_users_last_joined_space_id
      FOREIGN KEY (last_joined_space_id)
      REFERENCES spaces(id)
      ON DELETE SET NULL;

      -- Create an index on last_joined_space_id for better performance
      CREATE INDEX idx_auth_users_last_joined_space_id ON auth.users(last_joined_space_id);
    ');
    
    RAISE NOTICE 'Added last_joined_space_id column to auth.users table with foreign key and index';
  ELSE
    RAISE NOTICE 'Column last_joined_space_id already exists in % table', target_table;
  END IF;

  -- Update RLS policies if needed
  IF target_table = 'profiles' OR target_table = 'users' THEN
    -- Check for existing policies and update them as needed
    IF EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE tablename = replace(target_table, 'public.', '')
    ) THEN
      RAISE NOTICE 'Checking RLS policies on % table', target_table;
      
      -- Ensure users can read/update their own last_joined_space_id
      -- Specific policy updates will depend on existing policies
    END IF;
  END IF;
END $$;

-- Create a function to update the last_joined_space_id when a user joins a space
CREATE OR REPLACE FUNCTION update_last_joined_space()
RETURNS TRIGGER AS $$
DECLARE
  target_table TEXT;
BEGIN
  -- Check which table exists: profiles, users, or auth.users
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles' AND table_schema = 'public') THEN
    target_table := 'profiles';
  ELSIF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users' AND table_schema = 'public') THEN
    target_table := 'users';
  ELSIF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users' AND table_schema = 'auth') THEN
    target_table := 'auth.users';
  ELSE
    RAISE EXCEPTION 'Neither profiles, users, nor auth.users table found in the database';
  END IF;

  -- Only update on INSERT or UPDATE with is_active = true
  IF (TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND NEW.is_active = true)) THEN
    -- Update the user's profile with the new space_id
    IF target_table = 'profiles' THEN
      EXECUTE format('
        UPDATE profiles
        SET last_joined_space_id = $1
        WHERE id = $2
      ') USING NEW.space_id, NEW.user_id;
    ELSIF target_table = 'users' THEN
      EXECUTE format('
        UPDATE users
        SET last_joined_space_id = $1
        WHERE id = $2
      ') USING NEW.space_id, NEW.user_id;
    ELSIF target_table = 'auth.users' THEN
      EXECUTE format('
        UPDATE auth.users
        SET last_joined_space_id = $1
        WHERE id = $2
      ') USING NEW.space_id, NEW.user_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a trigger on space_access table to update the appropriate user table
DO $$
BEGIN
  -- Drop the trigger if it already exists
  DROP TRIGGER IF EXISTS update_last_joined_space_trigger ON space_access;
  
  -- Create the trigger
  CREATE TRIGGER update_last_joined_space_trigger
  AFTER INSERT OR UPDATE OF is_active ON space_access
  FOR EACH ROW
  EXECUTE FUNCTION update_last_joined_space();
  
  RAISE NOTICE 'Created trigger to automatically update last_joined_space_id when users join spaces';
END $$; 