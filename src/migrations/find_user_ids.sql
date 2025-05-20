-- SQL script to find user IDs
-- Copy and paste this into the Supabase SQL Editor

-- Find users by email (partial match)
SELECT 
  id, 
  email, 
  raw_user_meta_data->>'full_name' as full_name,
  raw_user_meta_data->>'username' as username,
  last_sign_in_at
FROM auth.users
WHERE email ILIKE '%@example.com%'  -- Replace with your email domain or partial email
ORDER BY last_sign_in_at DESC;

-- Find users by username (partial match)
SELECT 
  id, 
  email, 
  raw_user_meta_data->>'full_name' as full_name,
  raw_user_meta_data->>'username' as username,
  last_sign_in_at
FROM auth.users
WHERE raw_user_meta_data->>'username' ILIKE '%username%'  -- Replace with part of the username
ORDER BY last_sign_in_at DESC;

-- Find recently active users
SELECT 
  id, 
  email, 
  raw_user_meta_data->>'full_name' as full_name,
  raw_user_meta_data->>'username' as username,
  last_sign_in_at
FROM auth.users
ORDER BY last_sign_in_at DESC
LIMIT 10;

-- Find users who are members of a specific space
SELECT 
  u.id, 
  u.email, 
  raw_user_meta_data->>'full_name' as full_name,
  raw_user_meta_data->>'username' as username,
  sa.role,
  sa.is_active,
  sa.created_at as joined_at
FROM auth.users u
JOIN space_access sa ON u.id = sa.user_id
JOIN spaces s ON sa.space_id = s.id
WHERE s.subdomain = 'nocode-architects'  -- Replace with your space subdomain
ORDER BY sa.created_at DESC; 