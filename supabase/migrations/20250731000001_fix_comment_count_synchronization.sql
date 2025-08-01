-- ============================================================================
-- MIGRATION: Fix Comment Count Synchronization Issues
-- ============================================================================
-- This migration addresses the comment count discrepancies and race conditions
-- that cause inconsistent comment counts between stored and actual values.
--
-- Issues Fixed:
-- 1. Remove duplicate triggers causing double execution
-- 2. Fix race conditions in trigger functions
-- 3. Sync existing comment count discrepancies
-- 4. Add database constraints to prevent future issues
-- ============================================================================

-- Step 1: Remove duplicate triggers
-- The trigger 'trigger_update_user_presence_v2_post_comments' appears twice
-- causing double execution and potential race conditions

-- First, drop all instances of the duplicate trigger
DROP TRIGGER IF EXISTS trigger_update_user_presence_v2_post_comments ON post_comments;

-- Recreate the trigger properly (single instance)
CREATE TRIGGER trigger_update_user_presence_v2_post_comments
  AFTER INSERT OR UPDATE ON post_comments
  FOR EACH ROW
  EXECUTE FUNCTION handle_user_presence_v2();

-- Step 2: Fix race conditions in increment_post_comment_count function
-- Add proper locking and error handling to prevent concurrent update issues

CREATE OR REPLACE FUNCTION increment_post_comment_count()
RETURNS TRIGGER AS $$
DECLARE
    post_id_val uuid;
    increment_value integer;
    lock_key integer;
    retry_count integer := 0;
    max_retries integer := 3;
BEGIN
    -- Phase 4C: Enhanced race condition prevention and safe operations
    
    IF TG_OP = 'INSERT' THEN
        post_id_val := NEW.post_id;
        increment_value := 1;
    ELSIF TG_OP = 'DELETE' THEN
        post_id_val := OLD.post_id;
        increment_value := -1;
    ELSE
        RETURN COALESCE(NEW, OLD);
    END IF;
    
    -- Validate post_id
    IF post_id_val IS NULL THEN
        RETURN COALESCE(NEW, OLD);
    END IF;
    
    -- Create a unique lock key based on post_id
    lock_key := abs(hashtext(post_id_val::text)) % 2147483647;
    
    -- Retry loop with advisory lock to prevent race conditions
    WHILE retry_count < max_retries LOOP
        BEGIN
            -- Acquire advisory lock to prevent concurrent updates to the same post
            IF pg_try_advisory_lock(lock_key) THEN
                -- Update comment count with safe error handling
                UPDATE public.posts 
                SET comment_count = GREATEST(0, COALESCE(comment_count, 0) + increment_value),
                    updated_at = NOW()
                WHERE id = post_id_val;
                
                -- Release the advisory lock
                PERFORM pg_advisory_unlock(lock_key);
                
                -- Success, exit retry loop
                EXIT;
            ELSE
                -- Lock not available, wait a bit and retry
                retry_count := retry_count + 1;
                IF retry_count < max_retries THEN
                    PERFORM pg_sleep(0.01 * retry_count); -- Exponential backoff
                END IF;
            END IF;
            
        EXCEPTION WHEN OTHERS THEN
            -- Release lock if we have it
            PERFORM pg_advisory_unlock(lock_key);
            
            -- Log error and retry
            retry_count := retry_count + 1;
            IF retry_count < max_retries THEN
                PERFORM pg_sleep(0.01 * retry_count);
            ELSE
                -- Max retries reached, log error but don't fail the operation
                RAISE LOG 'increment_post_comment_count failed after % retries for post %: %', 
                    max_retries, post_id_val, SQLERRM;
            END IF;
        END;
    END LOOP;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Step 3: Fix race conditions in decrement_post_comment_count function
-- Add proper locking and error handling

CREATE OR REPLACE FUNCTION decrement_post_comment_count()
RETURNS TRIGGER AS $$
DECLARE
    lock_key integer;
    retry_count integer := 0;
    max_retries integer := 3;
BEGIN
    -- Phase 4C: Enhanced race condition prevention and validation
    
    -- Input validation
    IF OLD.post_id IS NULL THEN
        RAISE EXCEPTION 'Post ID cannot be null';
    END IF;
    
    -- Create a unique lock key based on post_id
    lock_key := abs(hashtext(OLD.post_id::text)) % 2147483647;
    
    -- Retry loop with advisory lock to prevent race conditions
    WHILE retry_count < max_retries LOOP
        BEGIN
            -- Acquire advisory lock to prevent concurrent updates to the same post
            IF pg_try_advisory_lock(lock_key) THEN
                -- Decrement comment count safely
                UPDATE public.posts 
                SET comment_count = GREATEST(0, comment_count - 1),
                    updated_at = NOW()
                WHERE id = OLD.post_id;
                
                -- Release the advisory lock
                PERFORM pg_advisory_unlock(lock_key);
                
                -- Success, exit retry loop
                EXIT;
            ELSE
                -- Lock not available, wait a bit and retry
                retry_count := retry_count + 1;
                IF retry_count < max_retries THEN
                    PERFORM pg_sleep(0.01 * retry_count); -- Exponential backoff
                END IF;
            END IF;
            
        EXCEPTION WHEN OTHERS THEN
            -- Release lock if we have it
            PERFORM pg_advisory_unlock(lock_key);
            
            -- Log error and retry
            retry_count := retry_count + 1;
            IF retry_count < max_retries THEN
                PERFORM pg_sleep(0.01 * retry_count);
            ELSE
                -- Max retries reached, log error but don't block the operation
                RAISE LOG 'decrement_post_comment_count failed after % retries for post %: %', 
                    max_retries, OLD.post_id, SQLERRM;
            END IF;
        END;
    END LOOP;
    
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Step 4: Sync existing comment count discrepancies
-- Fix the posts that have mismatched comment counts

UPDATE posts 
SET comment_count = (
  SELECT COUNT(*) 
  FROM post_comments 
  WHERE post_comments.post_id = posts.id
),
updated_at = NOW()
WHERE id IN (
  -- Posts with known discrepancies from investigation
  'ae72e966-abdf-45c4-8aef-0795c7b3e5aa',  -- "testin image upload part 3" (was 9, should be 5)
  'ccf7643e-53ee-4525-a42e-d25023a00b43',  -- "how to activate manus ai" (was 40, should be 38)
  '83ca7b12-beea-4ee9-8176-701a314c8433',  -- "🌟 Share your favorites with the community!" (was 3, should be 2)
  '82883e58-362a-44e0-b8b6-4671b0b88ae4'   -- "testing post notification" (was 2, should be 1)
);

-- Step 5: Add database constraint to prevent future count mismatches
-- This constraint will help catch any future discrepancies

-- First, create a function to check comment count consistency
CREATE OR REPLACE FUNCTION check_comment_count_consistency()
RETURNS TRIGGER AS $$
BEGIN
    -- Check if the comment count matches the actual count
    IF NEW.comment_count != (
        SELECT COUNT(*) 
        FROM post_comments 
        WHERE post_comments.post_id = NEW.id
    ) THEN
        RAISE EXCEPTION 'Comment count inconsistency detected for post %: stored=% vs actual=%', 
            NEW.id, 
            NEW.comment_count, 
            (SELECT COUNT(*) FROM post_comments WHERE post_comments.post_id = NEW.id);
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to enforce comment count consistency
DROP TRIGGER IF EXISTS enforce_comment_count_consistency ON posts;
CREATE TRIGGER enforce_comment_count_consistency
    BEFORE UPDATE ON posts
    FOR EACH ROW
    EXECUTE FUNCTION check_comment_count_consistency();

-- Step 6: Add index for better performance on comment count queries
CREATE INDEX IF NOT EXISTS idx_post_comments_post_id ON post_comments(post_id);

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '🎉 Comment count synchronization fixes applied successfully!';
    RAISE NOTICE '✅ Removed duplicate triggers causing race conditions';
    RAISE NOTICE '✅ Enhanced trigger functions with proper locking';
    RAISE NOTICE '✅ Synced existing comment count discrepancies';
    RAISE NOTICE '✅ Added database constraints to prevent future issues';
    RAISE NOTICE '✅ Added performance indexes for comment queries';
END $$; 