# Space Component Performance Quick Wins

## Introduction

This guide outlines practical optimizations that can be applied to the existing Space component to improve performance without requiring a complete rewrite.

## 1. Optimize Data Fetching

### Current Implementation
```typescript
const fetchInitialSpaceData = useCallback(async () => {
  if (!subdomain || !user) {
    setLoadingSpace(false);
    return;
  }
  
  setLoadingSpace(true);
  try {
    const { data: spaceData, error } = await supabase
      .from("spaces")
      .select("id, name, description, cover_image, icon_image, primary_color, member_count, pricing_type, price_per_month, subdomain, owner_id, is_private")
      .eq("subdomain", subdomain)
      .single();
      
    // ...rest of function
  } catch (error) {
    console.error('Error fetching space:', error);
    navigate('/discover');
  } finally {
    setLoadingSpace(false);
  }
}, [subdomain, user, navigate, fetchSpaceSettings]);
```

### Optimized Version
```typescript
const fetchInitialSpaceData = useCallback(async () => {
  if (!subdomain || !user) {
    setLoadingSpace(false);
    return;
  }
  
  // Try to use cache first for immediate display
  try {
    const cacheKey = `space_data_${subdomain}`;
    const cachedData = sessionStorage.getItem(cacheKey);
    
    if (cachedData) {
      const parsed = JSON.parse(cachedData);
      const cacheAge = Date.now() - parsed.timestamp;
      
      // Use cache if less than 5 minutes old
      if (cacheAge < 5 * 60 * 1000) {
        // Set space data from cache immediately
        useSpaceSettingsStore.setState({ 
          space: parsed.space,
          loading: true // Keep loading true until fresh data arrives
        });
      }
    }
  } catch (err) {
    console.warn('Failed to use cache:', err);
  }
  
  setLoadingSpace(true);
  try {
    const { data: spaceData, error } = await supabase
      .from("spaces")
      .select("id, name, description, cover_image, icon_image, primary_color, member_count, pricing_type, price_per_month, subdomain, owner_id, is_private")
      .eq("subdomain", subdomain)
      .single();
      
    if (!error && spaceData) {
      // Cache the fresh data
      try {
        const cacheKey = `space_data_${subdomain}`;
        sessionStorage.setItem(cacheKey, JSON.stringify({
          space: spaceData,
          timestamp: Date.now()
        }));
      } catch (cacheErr) {
        console.warn('Failed to cache space data:', cacheErr);
      }
    }
    
    // ...rest of function
  } catch (error) {
    console.error('Error fetching space:', error);
    navigate('/discover');
  } finally {
    setLoadingSpace(false);
  }
}, [subdomain, user, navigate, fetchSpaceSettings]);
```

## 2. Optimize Tab Switching

### Current Implementation
```typescript
// Fetch space details AND trigger settings fetch
useEffect(() => {
  // Check if we're just changing tabs within the same space
  const isTabChangeOnly = location.state && 
    typeof location.state === 'object' && 
    'preserveSpace' in location.state && 
    location.state.preserveSpace === true;
  
  // Skip data fetching if just changing tabs and space data is already loaded
  if (isTabChangeOnly && space) {
    console.log("Space component: Skipping data fetch for tab change");
    return;
  }
  
  fetchInitialSpaceData();
}, [subdomain, user, fetchSpaceSettings, navigate, location, space, fetchInitialSpaceData]);
```

### Optimized Version
```typescript
// Memoize expensive tab components
const memoizedTabs = useMemo(() => {
  return {
    about: <AboutTab space={space as any} onSpaceUpdate={(updatedSpace) => {/* update logic */}} />,
    calendar: <CalendarTab space={space} />,
    members: <MembersTab space={space} />,
    leaderboard: <LeaderboardsTab space={space} />,
    classroom: <ClassroomTab space={space} />,
    community: (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2">
          <FeedTab space={space} user={user} />
        </div>
        {/* Right sidebar */}
        <div className="space-y-3">
          {/* Sidebar content */}
        </div>
      </div>
    )
  };
}, [space, user]);

// Fetch space details but optimize tab changes
useEffect(() => {
  // Check if we're just changing tabs within the same space
  const isTabChangeOnly = location.state && 
    typeof location.state === 'object' && 
    'preserveSpace' in location.state && 
    location.state.preserveSpace === true;
  
  // Skip data fetching if just changing tabs and space data is already loaded
  if (isTabChangeOnly && space) {
    console.log("Space component: Skipping data fetch for tab change");
    // Just focus on tab change - no need to fetch data
    return;
  }
  
  fetchInitialSpaceData();
}, [subdomain, user, fetchSpaceSettings, navigate, location, space, fetchInitialSpaceData]);

// In render function, use memoized tab components
return (
  <main className="flex-grow py-6">
    <div className="max-w-6xl mx-auto px-4">
      {memoizedTabs[activeTab as keyof typeof memoizedTabs]}
    </div>
  </main>
);
```

## 3. Implement Better Loading States

### Current Implementation
```typescript
// While loading or auth is in process, show only a loading screen
if (loadingSpace || !user) {
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

### Optimized Version
```typescript
// Elegant loading state management
const [visibleLoading, setVisibleLoading] = useState(loadingSpace);
const [loadStartTime, setLoadStartTime] = useState(0);

// Prevent loading UI flicker for fast loads
useEffect(() => {
  if (loadingSpace && !visibleLoading) {
    setVisibleLoading(true);
    setLoadStartTime(Date.now());
  } else if (!loadingSpace && visibleLoading) {
    // Calculate how long loading has been shown
    const loadingDuration = Date.now() - loadStartTime;
    const minLoadingTime = 500; // ms
    
    if (loadingDuration < minLoadingTime) {
      // Ensure loading shows for at least minLoadingTime
      setTimeout(() => setVisibleLoading(false), minLoadingTime - loadingDuration);
    } else {
      setVisibleLoading(false);
    }
  }
}, [loadingSpace, visibleLoading, loadStartTime]);

// In component
if (visibleLoading || !user) {
  return <SpaceLoadingSkeleton activeTab={activeTab} />;
}
```

## 4. Preload Critical Assets

```typescript
// Preload space assets when data is loaded
useEffect(() => {
  if (space) {
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

## 5. Reduce Re-renders

### Current Implementation
```typescript
// Too many dependencies in useEffect
useEffect(() => {
  // ...
}, [subdomain, user, fetchSpaceSettings, navigate, location, space, fetchInitialSpaceData]);

// Inline functions causing rerenders
<Button onClick={() => handleTaskComplete(taskId, event)}>
```

### Optimized Version
```typescript
// Reduce dependencies with proper memoization
const deps = useMemo(() => ({
  subdomain,
  userId: user?.id,
  spaceId: space?.id,
  pathName: location.pathname
}), [subdomain, user?.id, space?.id, location.pathname]);

useEffect(() => {
  // Code remains the same
  if (deps.subdomain && !isTabChangeOnly) {
    fetchInitialSpaceData();
  }
}, [deps, isTabChangeOnly, fetchInitialSpaceData]);

// Memoize handlers
const handleTaskCompleteCallback = useCallback((taskId, event) => {
  // Implementation
}, []);

// In render
<Button onClick={(event) => handleTaskCompleteCallback(taskId, event)}>
```

## 6. Optimize Component Structure

### Current Implementation
- Space.tsx is over 1200 lines
- Contains tab rendering logic and state management

### Optimized Structure
1. Split into smaller components
2. Move tab-specific code to respective components
3. Use composition for better performance

```tsx
// Space.tsx - Main component
return (
  <SpaceLayout 
    header={<SpaceHeader />}
    navigation={<SpaceNavigation activeTab={activeTab} onChange={setActiveTab} />}
    content={
      <SpaceContent 
        activeTab={activeTab}
        space={space}
        user={user}
      />
    }
    sidebar={<SpaceSidebar space={space} user={user} isOwner={isOwner} />}
  />
);

// SpaceContent.tsx - Handle tab switching
export function SpaceContent({ activeTab, space, user }) {
  // Tab components remain memoized here
  return memoizedTabs[activeTab];
}
```

## Implementation Strategy

1. Start with simple caching improvements
2. Add loading skeletons
3. Optimize tab switching logic
4. Implement preloading
5. Reduce re-renders
6. Refactor component structure

These optimizations can be applied incrementally without disrupting the existing functionality. 