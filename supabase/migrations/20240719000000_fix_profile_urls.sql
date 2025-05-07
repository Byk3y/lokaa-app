-- Fix profile_url formats in the users table
-- This migration ensures profile_url values are consistent

-- Step 1: Remove @ symbol from the beginning of profile_url values
UPDATE users
SET profile_url = SUBSTRING(profile_url, 2)
WHERE profile_url LIKE '@%';

-- Step 2: Ensure all users have a profile_url (use username or email if missing)
UPDATE users
SET profile_url = username
WHERE profile_url IS NULL AND username IS NOT NULL;

-- Step 3: For any users still missing profile_url, use the email prefix
UPDATE users
SET profile_url = SPLIT_PART(email, '@', 1)
WHERE profile_url IS NULL AND email IS NOT NULL;

-- Step 4: Add an index to make profile_url lookups faster
CREATE INDEX IF NOT EXISTS idx_users_profile_url ON users(profile_url);

-- Step 5: To prevent duplicates, fix any duplicate profile_urls by appending a random number
-- First, identify duplicates
CREATE TEMPORARY TABLE duplicate_profile_urls AS
SELECT profile_url, COUNT(*) as count
FROM users
WHERE profile_url IS NOT NULL
GROUP BY profile_url
HAVING COUNT(*) > 1;

-- Then update them with a random suffix
UPDATE users
SET profile_url = profile_url || '-' || FLOOR(RANDOM() * 10000)::TEXT
WHERE profile_url IN (
  SELECT profile_url FROM duplicate_profile_urls
) AND id NOT IN (
  -- Keep the first occurrence of each duplicate unchanged
  SELECT MIN(id) FROM users GROUP BY profile_url
); 