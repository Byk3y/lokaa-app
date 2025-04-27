# Space Access Fix Guide

## Issue: Redirect Loop When Accessing Space Pages

Users were experiencing a redirect loop when trying to access their spaces:
1. User click on space in Discover page
2. Redirected to /space/[subdomain]
3. Error "Failed to load space. Redirecting to discover page."
4. Loop back to step 1

## Root Causes Identified

1. **Incorrect Ownership Check**: The code was only checking for `owner_id === user.id` and not considering space membership via the `space_access` table.
2. **Missing Error Messages**: The error handling didn't provide specific reasons for redirection, making debugging difficult.
3. **Infinite Recursion in RLS Policy**: The database Row-Level Security policy was causing infinite recursion when checking access rights.

## Fixes Implemented

### 1. Database Fix: RLS Policy

The core issue was a recursion in the Row-Level Security policy for the spaces table. We fixed this by:

- Creating a safe function that performs permission checks without causing recursion
- Revising the policy to avoid triggering infinite recursion
- Adding a bypass function for emergency scenarios

```sql
-- Create a safe access check function
CREATE OR REPLACE FUNCTION public.check_space_access_safely(space_id uuid, user_id uuid)
RETURNS boolean AS $$
  -- Function code that safely checks access without recursion
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Revised policy that avoids recursion
CREATE POLICY spaces_select ON spaces FOR SELECT USING (
  (NOT is_private)
  OR (auth.uid() = owner_id)
  OR (auth.uid() IS NOT NULL AND EXISTS (
    SELECT 1 FROM space_access
    WHERE space_access.space_id = spaces.id
    AND space_access.user_id = auth.uid()
    AND space_access.is_active = true
  ))
);
```

### 2. Recovery Mechanisms

We've added multiple recovery mechanisms to the application:

1. **Access Recovery Button**: Added a recovery button to the "Space not found" error page
2. **Timeout Recovery**: Added recovery option to the loading timeout toast
3. **Browser Console Utilities**: Created powerful debugging utilities accessible via the browser console

### 3. Space Component (`src/pages/Space.tsx`)

- Added detailed logging to track the space loading process
- Added explicit check for both ownership AND membership access
- Improved error messages to indicate exact reason for access issues
- Added debugging utilities accessible via browser console

### 4. Utilities (`src/utils/fixSpacesAccess.ts`)

Created a new utility module with special functions to diagnose and fix space access issues:

```typescript
// Fix access for a specific space
async function fixSpaceAccessBySubdomain(subdomain: string): Promise<boolean>

// Check access directly without RLS policies
async function directSpaceAccessCheck(subdomain: string): Promise<{
  success: boolean; 
  hasAccess?: boolean;
  isOwner?: boolean;
  space?: any;
}>
```

## How to Debug Space Access Issues

### 1. Using Browser Console Utilities

When on a Space page, open the browser console (F12) and run:

```javascript
// Check space access with our most reliable direct method
window.spaceDebug.directCheck()

// Check using the older method (for comparison)
window.spaceDebug.checkAccess()

// Get current space info
window.spaceDebug.spaceInfo

// Fix access issues
window.fixSpacesAccess.fixSpaceAccessBySubdomain('your-space-subdomain')
```

### 2. Using the Recovery Button

If you see the "Space Not Found" error page, click the "Attempt Access Recovery" button which will:

1. Use our bypass function to get the space directly
2. Create a space_access record for your user
3. Reload the page once access is fixed

### 3. SQL Database Access Recovery

If you have database access, you can manually fix access using:

```sql
-- Check current access state
SELECT * FROM public.check_space_access_safely('space-id-here', 'user-id-here');

-- Grant access directly
INSERT INTO space_access (space_id, user_id, is_active, role)
VALUES ('space-id-here', 'user-id-here', true, 'member');
```

## Conclusion

These fixes ensure that:
1. Users can access spaces they own
2. Users can access spaces they're members of via space_access
3. Error messages are clear and specific
4. Debugging tools are available for resolving edge cases
5. The core database issue with infinite recursion is fixed
6. Robust recovery mechanisms exist for users experiencing issues 