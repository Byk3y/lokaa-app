# Scalable Authentication and Space Redirection Solution

## Overview

This document outlines the implementation plan for a scalable, reliable authentication and space redirection system that can support 2000+ users while providing a seamless experience. The solution addresses the current issues with auth redirects and eliminates the brief flash of the Discover page for users with spaces.

## Current Issues

1. Inconsistent redirection after authentication
2. Users with spaces briefly see the Discover page
3. Hanging at `/auth-redirect` page
4. Multiple competing redirection mechanisms
5. Potential race conditions between auth state and redirection

## Implementation Plan

### Phase 1: Authentication Flow Streamlining

1. **Unify Auth Callback Handling**
   - Update App.tsx to include a catch-all route for both `/auth/callback` and `/auth-redirect`
   - Fix any Supabase URL configurations to consistently use `/auth/callback`
   - Create a robust AuthCallbackHandler component to handle all auth callbacks

2. **Create Universal Auth State Manager**
   - Implement a more reliable auth state mechanism using localStorage with synchronization
   - Add event listeners for cross-tab authentication state management
   - Create utilities for consistent auth token handling

### Phase 2: Direct Space Navigation

1. **Smart Space Cache Implementation**
   - Create a SpaceCache utility to store and retrieve space information
   - Add TTL (Time To Live) mechanism to ensure cache freshness
   - Implement background refresh for cached space data

2. **Direct Navigation Router**
   - Create a DirectNavigationRouter utility to handle all space redirections
   - Implement fallback hierarchy: cached space → API check → Discover page
   - Add telemetry to track redirection success/failure

### Phase 3: Global Auth Handler

1. **Create GlobalAuthHandler Component**
   ```tsx
   // src/components/auth/GlobalAuthHandler.tsx
   // This component will handle all auth callbacks and redirections
   ```
   - Support query parameters for customizing flow
   - Add robust error handling and recovery
   - Implement space detection and direct navigation

2. **Refactor Auth Context**
   - Simplify AuthContext to focus only on auth state
   - Remove redirection logic from AuthContext
   - Add hooks for Auth → Space navigation

### Phase 4: Integration and Testing

1. **Update Routes**
   - Modify App.tsx to use the new GlobalAuthHandler
   - Add support routes for direct space navigation
   - Create fallback routes for handling edge cases

2. **Testing Plan**
   - Test with various auth flows (password, OAuth)
   - Test with users who have spaces vs. no spaces
   - Test with expired tokens and recovery scenarios
   - Load testing with simulated concurrent users

## Detailed Implementation Steps

### 1. Create Universal Auth Callback Handler

```typescript
// src/components/auth/AuthCallbackHandler.tsx

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';
import { getUserSpaceInfo } from '@/utils/spaceCache';

export default function AuthCallbackHandler() {
  const navigate = useNavigate();
  const [status, setStatus] = useState('Processing authentication...');
  const [attempt, setAttempt] = useState(0);
  
  useEffect(() => {
    const processAuthCallback = async () => {
      try {
        setStatus('Exchanging authentication code...');
        
        // Get code from URL
        const params = new URLSearchParams(window.location.search);
        const code = params.get('code');
        
        if (!code) {
          console.error('No auth code found in URL');
          setStatus('Authentication error: No code found');
          setTimeout(() => navigate('/login'), 2000);
          return;
        }
        
        // Exchange code for session
        const { data, error } = await supabase.auth.exchangeCodeForSession(code);
        
        if (error) {
          console.error('Auth code exchange error:', error);
          setStatus(`Authentication error: ${error.message}`);
          setTimeout(() => navigate('/login'), 2000);
          return;
        }
        
        // Set telemetry marker for successful auth
        sessionStorage.setItem('auth_success_time', Date.now().toString());
        
        // Check if user has a space
        setStatus('Looking for your spaces...');
        
        if (!data.session?.user?.id) {
          navigate('/discover', { replace: true });
          return;
        }
        
        // Get user's space
        const userSpace = await getUserSpaceInfo(data.session.user.id);
        
        // Redirect to appropriate destination
        if (userSpace?.subdomain) {
          setStatus(`Taking you to ${userSpace.name || 'your space'}...`);
          navigate(`/space/${userSpace.subdomain}`, { replace: true });
        } else {
          // No space found, go to discover
          navigate('/discover', { replace: true });
        }
      } catch (err) {
        console.error('Unexpected error in auth callback:', err);
        setStatus('Unexpected error processing authentication');
        setAttempt(a => a + 1);
        
        // After 3 attempts, give up and redirect to login
        if (attempt >= 2) {
          setTimeout(() => navigate('/login'), 2000);
        }
      }
    };
    
    processAuthCallback();
  }, [navigate, attempt]);
  
  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <Loader2 className="w-12 h-12 animate-spin text-teal-600 mb-4" />
      <h1 className="text-xl font-medium text-gray-800 mb-2">
        {status}
      </h1>
      <p className="text-sm text-gray-500">
        Redirect attempt {attempt + 1}/3...
      </p>
    </div>
  );
}
```

### 2. Space Cache Utility

```typescript
// src/utils/spaceCache.ts

import { supabase } from '@/integrations/supabase/client';

// Cache TTL in milliseconds (10 minutes)
const CACHE_TTL = 10 * 60 * 1000;

// Space info type
export interface SpaceInfo {
  id: string;
  subdomain: string;
  name?: string;
  owner_id?: string;
  last_updated: number; // timestamp
}

/**
 * Get space info for a user, using cache when available
 */
export async function getUserSpaceInfo(userId: string): Promise<SpaceInfo | null> {
  if (!userId) return null;
  
  try {
    // Check cache first
    const cachedSpace = getCachedSpaceInfo(userId);
    
    // If we have a recent cache hit, use it
    if (cachedSpace && (Date.now() - cachedSpace.last_updated < CACHE_TTL)) {
      console.log('Using cached space info:', cachedSpace.subdomain);
      
      // Start a background refresh if the cache is getting old (over 5 minutes)
      if (Date.now() - cachedSpace.last_updated > 5 * 60 * 1000) {
        refreshSpaceCache(userId).catch(err => 
          console.error('Background cache refresh error:', err)
        );
      }
      
      return cachedSpace;
    }
    
    // No valid cache, fetch from db
    return await refreshSpaceCache(userId);
  } catch (error) {
    console.error('Error getting user space info:', error);
    
    // On error, try to use cache regardless of age as fallback
    const cachedSpace = getCachedSpaceInfo(userId);
    if (cachedSpace) {
      console.log('Using expired cache as fallback');
      return cachedSpace;
    }
    
    return null;
  }
}

/**
 * Get space info from cache
 */
function getCachedSpaceInfo(userId: string): SpaceInfo | null {
  try {
    const key = `space_info_${userId}`;
    const cachedData = localStorage.getItem(key);
    
    if (!cachedData) return null;
    
    return JSON.parse(cachedData) as SpaceInfo;
  } catch (error) {
    console.error('Error reading space cache:', error);
    return null;
  }
}

/**
 * Refresh space info in cache
 */
async function refreshSpaceCache(userId: string): Promise<SpaceInfo | null> {
  try {
    console.log('Fetching fresh space info for user:', userId);
    
    // Check for spaces owned by the user
    const { data: ownedSpaces, error: ownedError } = await supabase
      .from('spaces')
      .select('id, name, subdomain, owner_id')
      .eq('owner_id', userId)
      .order('created_at', { ascending: false })
      .limit(1);
      
    if (ownedError) throw ownedError;
    
    // If user has an owned space, use it
    if (ownedSpaces && ownedSpaces.length > 0) {
      const spaceInfo: SpaceInfo = {
        ...ownedSpaces[0],
        last_updated: Date.now()
      };
      
      // Save to cache
      localStorage.setItem(`space_info_${userId}`, JSON.stringify(spaceInfo));
      return spaceInfo;
    }
    
    // Otherwise check joined spaces
    const { data: accessRecords, error: accessError } = await supabase
      .from('space_access')
      .select(`
        space_id,
        spaces:space_id(id, name, subdomain, owner_id)
      `)
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1);
      
    if (accessError) throw accessError;
    
    // If found an accessed space
    if (accessRecords && accessRecords.length > 0 && accessRecords[0].spaces) {
      const spaceDetails = accessRecords[0].spaces as any;
      
      const spaceInfo: SpaceInfo = {
        id: spaceDetails.id,
        subdomain: spaceDetails.subdomain,
        name: spaceDetails.name,
        owner_id: spaceDetails.owner_id,
        last_updated: Date.now()
      };
      
      // Save to cache
      localStorage.setItem(`space_info_${userId}`, JSON.stringify(spaceInfo));
      return spaceInfo;
    }
    
    // No spaces found
    return null;
  } catch (error) {
    console.error('Error refreshing space cache:', error);
    throw error;
  }
}
```

### 3. Update App.tsx Routes

```typescript
// src/App.tsx (partial update)

// Add these routes in the RouterProvider
<Routes>
  {/* ... existing routes ... */}
  
  {/* Auth callback routes - both paths point to the same handler */}
  <Route path="/auth/callback" element={<AuthCallbackHandler />} />
  <Route path="/auth-redirect" element={<AuthCallbackHandler />} />
  
  {/* ... existing routes ... */}
</Routes>
```

### 4. Update Login Component

```typescript
// src/pages/Login.tsx (partial update - just the onSubmit function)

const onSubmit = async (values: z.infer<typeof loginSchema>) => {
  setLoginError(null);
  setIsLoggingIn(true);
  
  try {
    const { error } = await signIn(values.email, values.password);
    
    if (error) {
      console.error('Login error:', error);
      setLoginError(
        typeof error === 'string' 
          ? error 
          : error.message || 'Sign in failed. Please check your credentials and try again.'
      );
    } else {
      console.log('Login: Sign-in successful');
      
      // Mark auth in progress
      sessionStorage.setItem('auth_in_progress', 'true');
      
      // Let the auth flow handle redirection
      // No additional redirection code here to avoid race conditions
    }
  } catch (err) {
    console.error('Login exception:', err);
    setLoginError('An unexpected error occurred. Please try again.');
  } finally {
    setIsLoggingIn(false);
  }
};
```

### 5. Create Direct Navigation Router

```typescript
// src/utils/directNavigationRouter.ts

import { NavigateFunction } from 'react-router-dom';
import { getUserSpaceInfo } from './spaceCache';

/**
 * Direct Space Navigation Router
 * Handles navigation to user's space based on best available information
 */
export async function navigateToUserSpace(
  userId: string,
  navigate: NavigateFunction,
  fallbackPath: string = '/discover'
): Promise<boolean> {
  if (!userId) {
    console.error('Cannot navigate: No user ID provided');
    return false;
  }

  console.log('DirectNavigationRouter: Finding space for user', userId);
  
  try {
    // Set a navigation timeout for safety
    const navigationTimeout = setTimeout(() => {
      console.warn('Navigation timeout reached, redirecting to fallback');
      navigate(fallbackPath, { replace: true });
    }, 5000);
    
    // Find user's space
    const spaceInfo = await getUserSpaceInfo(userId);
    
    // Clear the timeout since we got a response
    clearTimeout(navigationTimeout);
    
    if (spaceInfo?.subdomain) {
      console.log('DirectNavigationRouter: Navigating to space', spaceInfo.subdomain);
      
      // Record telemetry for successful space navigation
      try {
        const navigations = JSON.parse(sessionStorage.getItem('space_navigations') || '[]');
        navigations.push({
          timestamp: Date.now(),
          userId: userId,
          spaceId: spaceInfo.id,
          subdomain: spaceInfo.subdomain
        });
        sessionStorage.setItem('space_navigations', JSON.stringify(navigations));
      } catch (e) {
        console.error('Error saving navigation telemetry:', e);
      }
      
      // Navigate to the space
      navigate(`/space/${spaceInfo.subdomain}`, { replace: true });
      return true;
    } else {
      console.log('DirectNavigationRouter: No space found, using fallback');
      navigate(fallbackPath, { replace: true });
      return false;
    }
  } catch (error) {
    console.error('DirectNavigationRouter: Error during navigation:', error);
    navigate(fallbackPath, { replace: true });
    return false;
  }
}
```

### 6. Modify Auth Context (Modify, don't replace)

Update the Auth Context to remove redirection logic but keep auth state management:

```typescript
// src/contexts/AuthContext.tsx (partial update)

// In the onAuthStateChange event handler
case 'SIGNED_IN':
  console.log('✅ Auth event: User signed in:', newSession?.user?.email);
  
  if (newSession?.user) {
    // Reset routing flags at the start of a new session
    setHasRouted(false);
    setEarlyRedirectAttempted(false);
  
    // Check for redirect_after_login in sessionStorage first
    const redirectPath = sessionStorage.getItem('redirect_after_login');
    if (redirectPath) {
      console.log('➡️ Auth event: Found redirect path after login:', redirectPath);
      sessionStorage.removeItem('redirect_after_login');
      
      // Add a small delay to ensure state is updated
      setTimeout(() => {
        console.log('🔀 Auth event: Redirecting to explicit path:', redirectPath);
        navigate(redirectPath, { replace: true });
        setHasRouted(true);
        setRoutingInProgress(false);
      }, 300);
    } else {
      // Complete auth without redirection - let the components handle it
      console.log('✅ Auth event: Sign-in completed, setting routingInProgress to false');
      setRoutingInProgress(false);
    }
  }
  break;
```

## Technical Architecture

1. **User Journey**
   - User signs in → Auth state updated → AuthCallbackHandler → Direct Space Navigation

2. **Data Flow**
   - Auth tokens → Local storage → SpaceCache → DirectNavigationRouter → User's space

3. **Resilience Mechanisms**
   - Multiple sources for space information (owned/accessed)
   - Cache with TTL and background refresh
   - Timeouts and retries built into each step
   - Telemetry to track failures and success rates

## Testing Plan

### Unit Tests
- AuthCallbackHandler
- SpaceCache utility
- DirectNavigationRouter

### Integration Tests
- Full login flow with various user types
- Cache invalidation and refresh
- Multi-tab authentication

### Performance Tests
- Simulate concurrent users (500+)
- Test cache hit rates
- Measure redirection times

## Deployment Strategy

1. Deploy in phases:
   - Phase 1: Auth improvements and monitoring
   - Phase 2: Cache implementation
   - Phase 3: Full redirection system

2. Use feature flags to enable/disable components
3. Implement telemetry to measure performance
4. Add rollback capability for each phase

## Next Steps

After implementing this architecture, we can focus on:
1. Enhancing the Discover page load performance
2. Improving space creation workflow
3. Adding more sophisticated caching for space content 