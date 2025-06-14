# Online Members & Timezone Functionality

This document outlines the implementation of online members tracking and timezone functionality in the Lokaa application.

## Core Components

### Hooks

1. **useMemberCounts**
   - Located at: `src/hooks/useMemberCounts.ts`
   - Provides real-time counts of members in a space:
     - Total members
     - Online members
     - Admin members
   - Uses Supabase Realtime subscriptions to keep counts up-to-date

2. **useGlobalPresence**
   - Located at: `src/hooks/useGlobalPresence.ts`
   - Manages a user's online status across the entire application
   - Updates user's status when:
     - The app loads/unloads
     - Browser tab visibility changes
     - Regular heartbeat interval

3. **useTimezone**
   - Located at: `src/hooks/useTimezone.ts`
   - Manages user timezone preferences
   - Functions for:
     - Detecting user's local timezone
     - Saving timezone to user profile
     - Formatting dates in user's timezone

### Components

1. **GlobalPresenceProvider**
   - Located at: `src/providers/GlobalPresenceProvider.tsx`
   - Integrates the global presence tracking into the React component tree
   - Added to the application's root `App` component

2. **OnlineIndicator**
   - Located at: `src/components/user/OnlineIndicator.tsx`
   - Reusable UI component for displaying a user's online status
   - Customizable size and animation

3. **TimezoneSelector**
   - Located at: `src/components/settings/TimezoneSelector.tsx`
   - UI component for selecting and managing user timezone
   - Features:
     - Timezone dropdown with IANA timezone names
     - Auto-detect button
     - Fallback for browsers without timezone API support

4. **OnlineMembers**
   - Located at: `src/components/space/OnlineMembers.tsx`
   - Displays a list of online and recently active members
   - Shows online status indicator for each member
   - Displays last active time for offline members

### Integration Points

1. **SpaceInfoSidebar**
   - Updated to use `useMemberCounts` for real-time online member counts

2. **SpaceCardPreview**
   - Updated to use `useMemberCounts` for accurate online member counts

3. **SpaceAboutPage**
   - Updated to use `useMemberCounts` for consistent member counting

4. **App Component**
   - Added `GlobalPresenceProvider` to enable app-wide presence tracking

## How It Works

### Online Status Tracking

1. The `GlobalPresenceProvider` initializes presence tracking when the app loads
2. `useGlobalPresence` hook updates the user's status across all spaces:
   - Sets `is_online = true` when the app loads
   - Sets `is_online = false` when the user leaves
   - Updates `last_active_at` timestamp
   - Sends heartbeats every 30 seconds

3. Components subscribe to presence changes using Supabase Realtime
4. UI components display appropriate indicators for online status

### Timezone Management

1. The `useTimezone` hook detects the user's local timezone
2. The timezone is saved to the user's profile
3. All date/time displays can be formatted in the user's timezone
4. `TimezoneSelector` component provides UI for users to view and change their timezone

## Optimizations for Scalability

The implementation has been optimized for scalability and maintainability in several ways:

### 1. Database Optimization

- Added indexes on commonly queried columns:
  ```sql
  CREATE INDEX IF NOT EXISTS idx_space_members_online
  ON space_members(space_id, is_online)
  WHERE is_online = true;
  ```
- This speeds up online member count queries, particularly as the user base grows

### 2. Debouncing & Request Limiting

- Implemented debounce mechanisms in `useMemberCounts` to prevent excessive database queries:
  ```typescript
  // Debounce frequent fetches unless force update is requested
  const now = Date.now();
  if (!forceUpdate && now - lastFetchTime.current < FETCH_DEBOUNCE_TIME) {
    return;
  }
  ```
- This reduces database load during high-frequency events

### 3. Memory Leak Prevention

- Added proper cleanup with mounted state tracking:
  ```typescript
  // Track if component is mounted to prevent memory leaks
  const isMounted = useRef(true);
  
  // In useEffect cleanup
  return () => {
    isMounted.current = false;
    // Other cleanup...
  };
  ```
- This prevents state updates after components unmount

### 4. Heartbeat Optimization

- Reduced heartbeat frequency from 60s to 30s for more reliable presence detection
- Added concurrent update prevention to avoid race conditions:
  ```typescript
  const updateInProgress = useRef(false);
  // Before update
  if (updateInProgress.current) return;
  updateInProgress.current = true;
  // After update
  updateInProgress.current = false;
  ```

### 5. Better Error Handling

- Improved error handling throughout the system
- Graceful fallbacks when operations fail
- Clear error logging for easier debugging

## Best Practices

1. **Optimized Database Queries**
   - Use efficient queries with proper filtering and joins
   - Fetch only needed fields

2. **Realtime Subscriptions**
   - Subscribe only to relevant tables and columns
   - Unsubscribe when components unmount

3. **UI Considerations**
   - Show loading states during data fetching
   - Provide fallbacks for empty states
   - Use consistent visual indicators for online status

4. **Performance**
   - Throttle heartbeats to reduce database load (30-second interval)
   - Use cached values when appropriate
   - Batch update operations when possible

## Adding New Features

To extend this functionality:

1. For new components needing online status:
   - Import `usePresence` or `useMemberCounts` hooks
   - Subscribe to relevant Supabase channels
   - Use the `OnlineIndicator` component for visual display

2. For new timezone features:
   - Import `useTimezone` hook
   - Use `formatInUserTimezone` for date formatting
   - Add the `TimezoneSelector` component where needed 