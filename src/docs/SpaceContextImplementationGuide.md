# Space Context Implementation Guide

## Overview

We've created a new `SpaceContext` to centralize all space data fetching and caching, which will eliminate duplicate API calls, provide better caching, and make the app more responsive.

This document explains how to migrate your components to use the new context.

## Quick Start

### 1. Using the SpaceContext directly

```tsx
import { useSpace } from '@/contexts/SpaceContext';

function MyComponent() {
  const { spaceData, loading, error, fetchSpaceData, clearCache } = useSpace();
  
  // Now you can use spaceData instead of making direct API calls
  
  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;
  if (!spaceData) return <div>No space data</div>;
  
  return (
    <div>
      <h1>{spaceData.name}</h1>
      <p>{spaceData.description}</p>
    </div>
  );
}
```

### 2. Using the SpaceComponentAdapter for legacy components

For existing components that expect `space` props, you can use the adapter:

```tsx
import { SpaceComponentAdapter } from '@/adapters/SpaceComponentAdapter';
import ExistingComponent from './ExistingComponent';

function MyContainer() {
  return (
    <SpaceComponentAdapter 
      component={ExistingComponent}
      componentProps={{ extraProp: 'value' }}
      includeUser={true} // If the component also needs user data
    />
  );
}
```

## Migration Checklist

When migrating components to use the SpaceContext:

1. Replace direct Supabase calls to fetch space data with `useSpace()` hook
2. Remove any duplicate space fetching logic
3. Use the cached data from context instead of local state
4. Add appropriate loading/error handling
5. For components that can't be easily refactored, use the `SpaceComponentAdapter`

## Benefits

- **Reduced API Calls**: Space data is now fetched once and shared
- **Consistent Caching**: 30-second TTL with both memory and sessionStorage fallbacks
- **Automatic Refresh**: Data automatically refreshes when stale on tab visibility change
- **Better Loading Experience**: Quick initial render from cache with background refresh
- **Simplified Code**: Less duplicate logic across components

## How It Works

1. SpaceContext maintains an in-memory cache of space data with a 30-second TTL
2. It also persists data to sessionStorage as a fallback
3. When a component requests data via `fetchSpaceData(subdomain)`:
   - If there's valid cached data, it returns immediately
   - Otherwise, it fetches fresh data from Supabase
4. Multiple simultaneous requests for the same space data are deduplicated
5. When a tab regains focus, stale data is automatically refreshed in the background

## Example: Converting an Existing Component

Before:
```tsx
function MyComponent({ subdomain }) {
  const [space, setSpace] = useState(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    async function fetchSpace() {
      const { data, error } = await supabase
        .from('spaces')
        .select('*')
        .eq('subdomain', subdomain)
        .single();
        
      if (data) setSpace(data);
      setLoading(false);
    }
    
    fetchSpace();
  }, [subdomain]);
  
  // Component implementation
}
```

After:
```tsx
function MyComponent({ subdomain }) {
  const { spaceData, loading } = useSpace();
  
  useEffect(() => {
    // Only fetch if we don't already have the data for this subdomain
    if (subdomain && (!spaceData || spaceData.subdomain !== subdomain)) {
      fetchSpaceData(subdomain);
    }
  }, [subdomain, spaceData, fetchSpaceData]);
  
  // Component implementation using spaceData instead of space
}
```

## Force Refreshing Space Data

If you need to force a refresh of the data:

```tsx
const { fetchSpaceData, clearCache } = useSpace();

// Force refresh for a specific space
fetchSpaceData(subdomain, true);  // The true flag forces a refresh

// Or clear the cache entirely
clearCache();  // Clears all spaces
clearCache(subdomain);  // Clears just one space
``` 