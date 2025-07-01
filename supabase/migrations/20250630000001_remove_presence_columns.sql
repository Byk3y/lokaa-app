-- Migration: Remove old presence columns from space_members table
-- Created: 2025-06-30
-- Purpose: Remove is_online and last_active_at columns since we're moving to Supabase's built-in Presence feature

-- First, drop any existing triggers or functions that depend on these columns
DROP TRIGGER IF EXISTS update_last_active_at ON space_members;
DROP FUNCTION IF EXISTS update_last_active_at();
DROP FUNCTION IF EXISTS ensure_user_online_safe(UUID, UUID);
DROP FUNCTION IF EXISTS set_user_offline_safe(UUID, UUID);

-- Remove the columns
ALTER TABLE space_members 
  DROP COLUMN IF EXISTS is_online,
  DROP COLUMN IF EXISTS last_active_at; 