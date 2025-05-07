-- Add missing profile columns to the users table
ALTER TABLE users
ADD COLUMN IF NOT EXISTS followers INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS following INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS contributions INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS activity_score INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS social_links JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS location TEXT;

-- Populate activity_score with random values for existing users
UPDATE users
SET activity_score = FLOOR(RANDOM() * 1000)
WHERE activity_score IS NULL;

-- Update null values to defaults
UPDATE users SET followers = 0 WHERE followers IS NULL;
UPDATE users SET following = 0 WHERE following IS NULL;
UPDATE users SET contributions = 0 WHERE contributions IS NULL;

COMMENT ON COLUMN users.followers IS 'Number of users following this user';
COMMENT ON COLUMN users.following IS 'Number of users this user is following';
COMMENT ON COLUMN users.contributions IS 'Number of user contributions (posts, comments, etc.)';
COMMENT ON COLUMN users.activity_score IS 'User activity score for gamification';
COMMENT ON COLUMN users.social_links IS 'JSON object containing users social media links';
COMMENT ON COLUMN users.location IS 'User location (city, country)'; 