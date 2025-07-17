# Post Slug Fix Guide

This guide will help you fix the issue with post slugs not being generated correctly.

## Background

After investigating the issue, we found that:

1. The database trigger responsible for generating slugs needed improvements to handle empty titles and content
2. The frontend code needed better retry mechanisms and fallbacks
3. The URL generation logic needed better error handling

## Changes Made

We've made the following changes:

1. **Database Migrations**:
   - Updated `supabase/migrations/20250611000000_ensure_post_slugs.sql` with improved slug generation
   - Updated `supabase/migrations/20250612000000_update_post_slug_function.sql` with debug logging
   - Modified the trigger to fire on all INSERT and UPDATE operations, not just when title changes

2. **Frontend Code**:
   - Enhanced `usePostSubmission.ts` with better retry logic and error handling
   - Explicitly setting `slug: null` in new post inserts to ensure the trigger fires
   - Added a direct RPC call to `generate_post_slug` as a fallback
   - Improved `slugUtils.ts` with better error handling and logging

## Manual Steps Required

Since the Supabase CLI is not available locally, you need to manually apply the database migrations:

1. Open the Supabase dashboard for your project
2. Go to the SQL Editor
3. Copy the contents of both migration files and run them in the SQL Editor:
   - First run `supabase/migrations/20250611000000_ensure_post_slugs.sql`
   - Then run `supabase/migrations/20250612000000_update_post_slug_function.sql`

## Testing

After applying the changes, test the post creation flow:

1. Create a new post with only a title (no content)
2. Create a new post with only content (no title)
3. Create a new post with both title and content
4. Check the browser console for debugging information
5. Verify that all posts have proper slugs in their URLs

## Troubleshooting

If you still encounter issues:

1. Check the PostgreSQL logs in Supabase dashboard for any errors
2. Look for "set_post_slug trigger called" log messages to confirm the trigger is firing
3. Check the browser console for any errors or warnings
4. Try manually updating a post's slug to an empty string and see if the trigger fires

## Long-term Fixes

For a more robust solution in the future:

1. Set up Supabase CLI locally to easily push database migrations
2. Add unit tests for slug generation
3. Consider moving more of the slug generation logic to the database side
4. Add a slug uniqueness check before submitting the post 