# Unified Presence System Implementation

## Overview

The unified presence system consolidates all presence functionality into a single, coordinated system to eliminate the competing presence systems that were causing online member counts to show and disappear during navigation.

## Problem Solved

**Before**: Multiple competing presence systems running simultaneously:
- `useGlobalPresence` - Updated database directly but didn't coordinate with real-time subscriptions
- `useMemberCounts` - Had its own presence subscription system  
- `useMembersCache` - Had its own presence subscription (now disabled)
- `usePresence` - Another presence system for individual spaces

**Result**: Online counts would show and disappear as different systems activated during tab navigation.

## Solution Implemented

### 1. Unified Presence Hook (`src/hooks/useUnifiedPresence.ts`)

**Core Features:**
- **Global State Management**: Single interface tracking online users, subscriptions, and listeners per space
- **Global Heartbeat System**: Uses `createManagedInterval` to keep users online across all spaces every 30 seconds
- **Space-Specific Subscriptions**: Manages presence subscriptions with proper cleanup when no listeners remain
- **Real-time Event Handling**: Processes presence events (sync, join, leave) consistently
- **Debugging Tools**: `window.getUnifiedPresenceState()` for monitoring

**Main Hooks:**
- `useSpacePresence(spaceId)` - Subscribe to presence updates for specific space
- `useUnifiedPresence()` - Global presence management for app level

### 2. Updated Member Counts (`src/hooks/useMemberCounts.ts`)

**Changes Made:**
- ✅ Removed all internal presence subscription logic (100+ lines removed)
- ✅ Now imports and uses `useSpacePresence` from unified system
- ✅ Preserves real-time online count from unified system during database operations
- ✅ Maintains fallback logic for known spaces but uses unified presence for online counts
- ✅ Removed old debugging tools and global state management

### 3. Updated Members Cache (`src/hooks/useMembersCache.ts`)

**Changes Made:**
- ✅ Replaced `subscribeToPresence` function with no-op that logs delegation to unified system
- ✅ Removed call to presence subscription in `fetchMembers` function
- ✅ Added comment noting presence is handled by unified system

### 4. App-Level Integration (`src/App.tsx`)

**Changes Made:**
- ✅ Added `UnifiedPresenceInitializer` component to initialize global presence system
- ✅ Ensures single initialization of global presence system at app level

## Technical Benefits

1. **Single Source of Truth**: All presence state managed in one place
2. **Proper Lifecycle Management**: Subscriptions properly created and cleaned up across navigation
3. **Eliminates Race Conditions**: No more competing systems causing count flickering
4. **Maintains State During Navigation**: Presence state persists during tab switches
5. **Comprehensive Debugging**: Built-in debugging tools for monitoring system health
6. **Reliable Heartbeat**: Uses managed intervals for consistent presence updates

## Testing the System

### 1. Browser Console Testing

The system exposes several debugging functions in the browser console:

```javascript
// Get current unified presence state
getUnifiedPresenceState()

// Test basic presence functionality
testPresence('space-id', 'user-id')

// Get presence state for a specific space
getPresenceState('space-id')
```

### 2. Manual Testing Steps

1. **Open the app** and navigate to a space
2. **Open browser console** and run `getUnifiedPresenceState()`
3. **Navigate between tabs** and verify online count remains consistent
4. **Open multiple browser tabs** to the same space and verify count increases
5. **Close tabs** and verify count decreases appropriately
6. **Check console logs** for presence system activity

### 3. Expected Console Output

Look for these log messages indicating proper operation:

```
🌐 [UnifiedPresence] Global presence system initialized for user: [user-id]
🌐 [UnifiedPresence] Starting space presence subscription for: [space-id]
💓 [UnifiedPresence] Global heartbeat sent for user: [user-id]
🔄 [UnifiedPresence] Presence sync received for space: [space-id]
```

### 4. Debugging Commands

```javascript
// Monitor presence state changes
const unsubscribe = window.addEventListener('unified-presence-change', (event) => {
  console.log('Presence changed:', event.detail);
});

// Check if heartbeat is running
console.log('Heartbeat active:', !!window.unifiedPresenceHeartbeat);

// Force a heartbeat (for testing)
window.sendPresenceHeartbeat?.();
```

## System Architecture

```
App.tsx
├── UnifiedPresenceInitializer (initializes global system)
│
├── useUnifiedPresence() (global management)
│   ├── Global heartbeat (30s intervals)
│   ├── Global state management
│   └── Subscription coordination
│
└── Components using presence
    ├── MembersTab → useMemberCounts → useSpacePresence
    ├── SpaceInfoSidebar → useSpacePresence
    └── Other components → useSpacePresence
```

## Migration Status

- ✅ **Core System**: `useUnifiedPresence.ts` created and functional
- ✅ **Member Counts**: `useMemberCounts.ts` updated to use unified system
- ✅ **Members Cache**: `useMembersCache.ts` updated to delegate to unified system
- ✅ **App Integration**: `UnifiedPresenceInitializer` added to App.tsx
- ✅ **Debugging Tools**: Console functions and monitoring available

## Next Steps

1. **Monitor Production**: Watch for any presence-related issues after deployment
2. **Performance Optimization**: Fine-tune heartbeat intervals if needed
3. **Additional Features**: Consider adding presence indicators, typing indicators, etc.
4. **Cleanup**: Remove any remaining unused presence code after verification

## Troubleshooting

### If online counts are still inconsistent:

1. Check console for error messages
2. Run `getUnifiedPresenceState()` to inspect system state
3. Verify no old presence systems are still running
4. Check network connectivity and Supabase connection

### If presence updates are slow:

1. Check heartbeat interval (currently 30s)
2. Verify real-time subscriptions are active
3. Check Supabase real-time connection status

### If memory leaks occur:

1. Verify subscriptions are properly cleaned up
2. Check that intervals are cleared on unmount
3. Monitor subscription count with debugging tools

## Performance Considerations

- **Heartbeat Frequency**: 30 seconds balances accuracy with performance
- **Subscription Management**: Only creates subscriptions when components need them
- **Memory Management**: Proper cleanup prevents memory leaks
- **Network Efficiency**: Batches presence updates to reduce API calls

The unified presence system provides a robust, scalable solution for managing user presence across the entire application while eliminating the race conditions and inconsistencies of the previous multi-system approach. 