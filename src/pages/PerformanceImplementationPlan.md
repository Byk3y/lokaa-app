# Space Component Performance Implementation Plan

## Phase 1: Quick Wins (1-2 days)

These changes provide immediate benefits with minimal risk:

### 1. Enhanced Caching 

```typescript
// Add to Space.tsx
// At the top of the component, after useState declarations
const [quickRecoveryAttempted, setQuickRecoveryAttempted] = useState(false);

// Modify the existing useEffect for quick recovery
useEffect(() => {
  // Only attempt quick recovery once and only if we're in loading state
  if (!quickRecoveryAttempted && loadingSpace && subdomain) {
    setQuickRecoveryAttempted(true);
    try {
      const cacheKey = `space_data_${subdomain}`;
      const cachedData = sessionStorage.getItem(cacheKey);
      
      if (cachedData) {
        const parsed = JSON.parse(cachedData);
        const cacheAge = new Date().getTime() - parsed.timestamp;
        
        // Use cache if it's less than 5 minutes old
        if (cacheAge < 5 * 60 * 1000) {
          console.log('[Space] Quick recovery from cache while fetching fresh data');
          useSpaceSettingsStore.setState({ 
            space: parsed.space,
            loading: true // Keep loading true until the real data arrives
          });
        }
      }
    } catch (err) {
      console.warn('[Space] Failed to recover from cache:', err);
    }
  }
}, [loadingSpace, subdomain, quickRecoveryAttempted]);
```

### 2. Add Cache Storage for Fresh Data

```typescript
// Add to the end of fetchInitialSpaceData after successful data fetching
if (spaceData) {
  // Cache the fresh data for future use
  try {
    const cacheKey = `space_data_${subdomain}`;
    sessionStorage.setItem(cacheKey, JSON.stringify({
      space: spaceData,
      timestamp: new Date().getTime()
    }));
    console.log('[Space] Cached fresh space data');
  } catch (err) {
    console.warn('[Space] Failed to cache fresh data:', err);
  }
}
```

### 3. Image Preloading

```typescript
// Add a new useEffect after component initialization
useEffect(() => {
  if (space) {
    // Preload critical images
    const imagesToPreload = [
      space.cover_image,
      space.icon_image
    ].filter(Boolean);
    
    // Preload images
    imagesToPreload.forEach(url => {
      if (typeof url === 'string') {
        const img = new Image();
        img.src = url;
      }
    });
  }
}, [space]);
```

### 4. Optimize Loading Experience

```typescript
// Add elegant loading state
const [visibleLoading, setVisibleLoading] = useState(loadingSpace);
const [loadStartTime, setLoadStartTime] = useState(0);

// Control loading UI with minimum duration
useEffect(() => {
  if (loadingSpace && !visibleLoading) {
    // Started loading
    setVisibleLoading(true);
    setLoadStartTime(Date.now());
  } else if (!loadingSpace && visibleLoading) {
    // Finished loading - add a small delay for smooth UX
    const loadingTime = Date.now() - loadStartTime;
    const minimumLoadingTime = 500; // ms
    
    if (loadingTime < minimumLoadingTime) {
      // If loading was too quick, keep showing loading state
      const remainingTime = minimumLoadingTime - loadingTime;
      setTimeout(() => setVisibleLoading(false), remainingTime);
    } else {
      setVisibleLoading(false);
    }
  }
}, [loadingSpace, visibleLoading, loadStartTime]);

// Use visibleLoading instead of loadingSpace in the component's rendering logic
if (visibleLoading || !user) {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="flex flex-col items-center">
        <div className="animate-spin h-10 w-10 rounded-full border-t-2 border-b-2 border-amber-600 mb-4"></div>
        {quickRecoveryAttempted && <div className="text-sm text-gray-500">Reconnecting to your space...</div>}
      </div>
    </div>
  );
}
```

## Phase 2: Structural Optimizations (2-3 days)

These changes enhance performance through structural improvements:

### 1. Tab Component Memoization

```typescript
// Add tab memoization to prevent unnecessary rerenders
const memoizedTabs = useMemo(() => ({
  about: (space && 
    <AboutTab 
      space={space} 
      onSpaceUpdate={(updatedSpace) => {
        console.log("Space updated with new data:", updatedSpace);
        useSpaceSettingsStore.setState((state) => ({
          space: {
            ...state.space,
            about_description: updatedSpace.about_description
          }
        }));
      }} 
    />
  ),
  calendar: (space && <CalendarTab space={space} />),
  members: (space && <MembersTab space={space} />),
  leaderboard: (space && <LeaderboardsTab space={space} />),
  classroom: (space && <ClassroomTab space={space} />),
  community: (space && user && (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div className="md:col-span-2">
        <FeedTab space={space} user={user} />
      </div>
      <div className="space-y-3">
        {/* Right sidebar content */}
        {/* (Copy existing sidebar code here) */}
      </div>
    </div>
  ))
}), [space, user]);

// In the return statement, replace the tab content rendering with:
<main className="flex-grow py-6">
  <div className="max-w-6xl mx-auto px-4">
    {memoizedTabs[activeTab]}
  </div>
</main>
```

### 2. Event Handler Optimization

```typescript
// Replace inline handlers with memoized callbacks
const handleCloseNotification = useCallback(() => {
  setNotificationShown(false);
}, []);

const toggleProfileDropdown = useCallback(() => {
  setProfileDropdownOpen(prev => !prev);
}, []);

const handleSignOut = useCallback(async () => {
  try {
    // Implementation
  } catch (error) {
    // Error handling
  }
}, [signOut, navigate]);
```

### 3. Create a Performance Monitoring Component

```typescript
// Add this at the beginning of Space.tsx
import { useEffect } from 'react';

function usePerformanceMonitoring(componentName: string) {
  useEffect(() => {
    const startTime = performance.now();
    console.log(`[Performance] ${componentName} started rendering at ${startTime.toFixed(2)}ms`);
    
    return () => {
      const endTime = performance.now();
      console.log(`[Performance] ${componentName} unmounted after ${(endTime - startTime).toFixed(2)}ms`);
    };
  }, [componentName]);
}

// Inside Space component
usePerformanceMonitoring('Space');
```

## Phase 3: Full Integration (3-5 days)

These changes fully integrate our optimized components:

### 1. Prepare Required Components

First, ensure all required components are properly created and exported:

- Verify `SpaceContext.tsx` has working `useSpace` and `SpaceProvider` exports
- Make sure `SpaceLoadingSkeleton.tsx` has both default and named exports
- Confirm `spacePerformance.ts` exports `preloadSpaceAssets`

### 2. Update Route Configuration

In the file where routes are defined, wrap the Space route with SpaceProvider:

```typescript
// In router configuration file
import { SpaceProvider } from '@/contexts/SpaceContext';
import Space from '@/pages/Space';

// Update route
<Route 
  path="/:subdomain/space/:tab?" 
  element={
    <SpaceProvider>
      <Space />
    </SpaceProvider>
  }
/>
```

### 3. Update Space Component

Gradually update the Space component to use the context:

```typescript
// In Space.tsx
import { useSpace } from '@/contexts/SpaceContext';

// Inside component
const { 
  space,
  isLoading,
  error,
  isOwner,
  activeTab,
  navigateToTab,
  refreshSpace
} = useSpace();

// Replace existing state and data fetching with context usage
```

### 4. Add Monitoring and Metrics

Add more detailed performance tracking to measure improvements:

```typescript
// Add detailed performance tracking
useEffect(() => {
  if (space) {
    // Report space load time
    const loadTime = performance.now();
    console.log(`[Performance] Space data loaded at ${loadTime.toFixed(2)}ms`);
    
    // Report metrics
    const metrics = {
      loadTime,
      spaceId: space.id,
      hasCache: quickRecoveryAttempted,
      // Add more metrics
    };
    
    // Send metrics (if analytics available)
    // analytics.trackEvent('space_loaded', metrics);
  }
}, [space, quickRecoveryAttempted]);
```

## Testing Strategy

For each phase:

1. **Measure Baseline Performance**
   - Time to first meaningful content
   - Tab switching time
   - Server request count

2. **Test Changes in Development**
   - Verify functionality
   - Compare metrics to baseline

3. **Verify in Production-like Environment**
   - Test with network throttling
   - Test on lower-end devices

## Rollback Strategy

Each phase should have a clean rollback plan:

1. **Phase 1**: Remove the new caching and loading behavior if issues occur
2. **Phase 2**: Revert to non-memoized tab rendering if problems arise
3. **Phase 3**: Disable context usage and return to direct data fetching

## Success Metrics

We'll consider the implementation successful if we achieve:

1. 30% or greater reduction in Time to First Contentful Paint
2. 50% or greater reduction in tab switching time
3. No increase in error rates
4. Positive user feedback regarding perceived performance 