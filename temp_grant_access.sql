-- Temporary SQL to grant access to test user for paid space testing
-- Run this in your Supabase SQL editor

INSERT INTO space_members (
  user_id, 
  space_id, 
  role, 
  status,
  created_at,
  updated_at
) VALUES (
  'fac2bb76-48a6-47e1-aad1-396f17c50d10',  -- Test user ID
  '235e68d1-89df-4d2d-8945-e7756d60de20',  -- Nocode Devils space ID
  'member',
  'active',
  NOW(),
  NOW()
) ON CONFLICT (user_id, space_id) 
DO UPDATE SET 
  status = 'active',
  updated_at = NOW();

-- Verify the insert worked
SELECT * FROM space_members 
WHERE user_id = 'fac2bb76-48a6-47e1-aad1-396f17c50d10' 
AND space_id = '235e68d1-89df-4d2d-8945-e7756d60de20'; 