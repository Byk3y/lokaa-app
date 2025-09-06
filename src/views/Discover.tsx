import { log } from '@/utils/logger';
import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { getSupabaseClient } from "@/integrations/supabase/client";
import { useOptimizedAuth } from '@/contexts/AuthContext';

import { Space } from "@/types/space";
import { toast } from "@/hooks/use-toast";
import MobileSpaceDrawer from "@/components/mobile/MobileSpaceDrawer";
import BottomNav from "@/components/mobile/BottomNav";
import DiscoverHeader from "@/components/discover/DiscoverHeader";
import DiscoverHero from "@/components/discover/DiscoverHero";
import CategoryFilters from "@/components/discover/CategoryFilters";
import SpacesGrid from "@/components/discover/SpacesGrid";
import "./UserSettingsStyles.css";
import { useBatchMemberCounts } from "@/hooks/useBatchMemberCounts";
import { aggressiveDiscoverOverride } from '@/utils/smartSpaceRedirect';
import { supabaseMobileFetch, MobileNetworkHandler } from '@/utils/mobileNetworkHandler';
import { shouldEnableMobileFeatures } from '@/utils/mobileDetection';
import { DISCOVER_CATEGORIES, getCategoryLabel } from '@/config/discoverCategories';
import { generateTags } from '@/utils/spaceTagGenerator';



interface DatabaseSpace {
  id: string;
  name: string;
  description: string;
  owner_id: string;
  subdomain: string;
  cover_image: string;
  primary_color: string;
  created_at: string;
  updated_at: string;
  pricing_type: 'free' | 'paid';
  price_per_month: number | null;
  member_count?: number;
  post_count?: number;
  instructor?: string;
  tags?: string[];
}





export default function Discover() {
  // EMERGENCY CIRCUIT BREAKER: Prevent API storms
  const requestTrackerRef = useRef(new Map<string, number>());
  const activeRequestsRef = useRef(0);
  const MAX_CONCURRENT_REQUESTS = 5;
  const REQUEST_THROTTLE_MS = 100;
  
  const throttledRequest = useCallback(async (
    requestKey: string,
    requestFn: () => Promise<any>
  ): Promise<any | null> => {
    const now = Date.now();
    const lastRequest = requestTrackerRef.current.get(requestKey);
    
    // Throttle identical requests
    if (lastRequest && now - lastRequest < REQUEST_THROTTLE_MS) {
      log.warn('Page', `🚨 [Discover] Request ${requestKey} throttled`);
      return null;
    }
    
    // Circuit breaker for concurrent requests
    if (activeRequestsRef.current >= MAX_CONCURRENT_REQUESTS) {
      log.warn('Page', `🚨 [Discover] Circuit breaker: too many concurrent requests (${activeRequestsRef.current})`);
      return null;
    }
    
    try {
      activeRequestsRef.current++;
      requestTrackerRef.current.set(requestKey, now);
      return await requestFn();
    } finally {
      activeRequestsRef.current--;
    }
  }, []);

  const { user, signOut } = useOptimizedAuth();

  const [spaces, setSpaces] = useState<Space[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredSpaces, setFilteredSpaces] = useState<Space[]>([]);

  const location = useLocation();
  const navigate = useNavigate();
  const [loadError, setLoadError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [spaceDrawerOpen, setSpaceDrawerOpen] = useState(false);

  const [authEnhancementComplete, setAuthEnhancementComplete] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  
  // Get spaceIds for batch fetching member counts
  const spaceIds = spaces.map(space => space.id);
  
  // Use the batch member counts hook for efficient fetching
  const { counts: memberCounts, loading: memberCountsLoading } = useBatchMemberCounts(spaceIds);

  const getUserInitials = () => {
    if (!user) return "A";
    
    if (user.user_metadata?.firstName && user.user_metadata?.lastName) {
      return `${user.user_metadata.firstName.charAt(0)}${user.user_metadata.lastName.charAt(0)}`;
    }
    
    if (user.email) {
      return user.email.charAt(0).toUpperCase();
    }
    
    return "A";
  };

  const createFetch = useCallback(async function createFetch<T>(fetchFunction: () => Promise<T>): Promise<T> {
    const isMobile = shouldEnableMobileFeatures();
    
    if (isMobile) {
      log.debug('Page', '📱 Using mobile-optimized fetch for better reliability');
      return await MobileNetworkHandler.safeFetch(fetchFunction, {
        maxRetries: 4,
        baseDelay: 2000,
        timeout: 20000,
        exponentialBackoff: true
      });
    } else {
      // Desktop - use simpler retry logic
      return await MobileNetworkHandler.safeFetch(fetchFunction, {
        maxRetries: 2,
        baseDelay: 1000,
        timeout: 10000
      });
    }
  }, []);

  useEffect(() => {
    // Auth debugging removed for production
    return () => {
      // Cleanup logic if needed
    };
  }, []);



  useEffect(() => {
    const fetchTimeoutId = setTimeout(() => {
      if (isLoading) {
        log.warn('Page', "Spaces fetch timeout reached - still loading after 15 seconds");
        setLoadError("Loading spaces is taking longer than expected. Please try again.");
        setIsLoading(false);
      }
    }, 15000);
    
    async function fetchSpaces() {
      try {
        setIsLoading(true);
        setLoadError(null);
        
        log.debug('Page', 'Current user in Discover:', user?.id);
        
        const timestamp = new Date().getTime();
        log.debug('Page', 'Fetching spaces with timestamp:', timestamp);
        
        let fetchedSpaces: DatabaseSpace[] = [];
        
        try {
          log.debug('Page', 'Fetching public spaces using RPC function');
          
          const rpcResponse = await createFetch(async () => {
            return await getSupabaseClient()?.rpc('get_public_spaces');
          });
          
          const { data: rpcData, error: rpcError } = rpcResponse || { data: null, error: null };
          
          if (rpcError) {
            log.error('Page', 'Error fetching spaces using RPC function:', rpcError);
          } else if (rpcData && Array.isArray(rpcData) && rpcData.length > 0) {
            log.debug('Page', 'Successfully fetched spaces using RPC function:', rpcData.length);
            fetchedSpaces = rpcData;
          }
        } catch (rpcException) {
          log.error('Page', 'Exception in RPC spaces fetch:', rpcException as Error);
        }
        
        if (fetchedSpaces.length === 0) {
          log.debug('Page', 'Falling back to direct query for spaces');
          
          try {
            const queryResponse = await createFetch(async () => {
              return await getSupabaseClient()
                ?.from('spaces')
                ?.select('*')
                ?.eq('is_private', false)
                ?.order('created_at', { ascending: false });
            });
            
            const { data: queryData, error: queryError } = queryResponse || { data: null, error: null };
              
            if (queryError) {
              log.error('Page', 'Error in fallback query:', queryError);
              
              throw queryError;
            }
            
            if (queryData && queryData.length > 0) {
              log.debug('Page', 'Successfully fetched spaces via fallback query:', queryData.length);
              fetchedSpaces = queryData;
            } else {
              log.debug('Page', 'No spaces found via fallback query, trying unrestricted query');
              
              const lastResortResponse = await createFetch(async () => {
                return await getSupabaseClient()
                  ?.from('spaces')
                  ?.select('*')
                  ?.order('created_at', { ascending: false });
              });
              
              const { data: lastResortData, error: lastResortError } = lastResortResponse || { data: null, error: null };
                
              if (lastResortError) {
                log.error('Page', 'Error in last resort query:', lastResortError);
                
                throw lastResortError;
              }
              
              if (lastResortData && lastResortData.length > 0) {
                log.debug('Page', 'Successfully fetched spaces via last resort query:', lastResortData.length);
                fetchedSpaces = lastResortData;
              }
            }
          } catch (queryException) {
            log.error('Page', 'Exception in fallback space query:', queryException as Error);
            throw queryException;
          }
        }
        
        if (fetchedSpaces.length === 0) {
          log.debug('Page', 'No spaces found after all attempts');
          setSpaces([]);
          setFilteredSpaces([]);
          return;
        }
        
        log.debug('Page', 'Processing fetched spaces:', fetchedSpaces.length);
        const processedSpaces = [];
        
        // Process spaces with default member count - the real counts will be updated later
        for (const space of fetchedSpaces) {
          try {
            if (!space || !space.id || !space.name) {
              log.warn('Page', 'Skipping invalid space:', space);
              continue;
            }
            
            // Use the existing member_count as a fallback value, to be updated by the hook
            const extendedSpace = {
              ...space,
              member_count: space.member_count || 0,
              post_count: 0,
              tags: generateTags(space),
            };
            
            processedSpaces.push(extendedSpace);
          } catch (spaceProcessError) {
            log.warn('Page', `Error processing space ${space.id}:`, spaceProcessError);
          }
        }
        
        log.debug('Page', 'Final processed spaces count:', processedSpaces.length);
        setSpaces(processedSpaces);
        setFilteredSpaces(processedSpaces);
      } catch (error) {
        log.error('Page', 'Error fetching spaces:', error as Error);
        let errorMessage = 'Failed to load spaces. Please try again later.';
        
        if (error instanceof Error) {
          log.error('Page', `Error details: ${error.message}`, error);
          
          if (error.message.includes('network')) {
            errorMessage = 'Network error. Please check your internet connection and try again.';
          } else if (error.message.includes('timeout')) {
            errorMessage = 'Request timed out. Server may be experiencing high load.';
          } else if (error.message.includes('permission') || error.message.includes('access')) {
            errorMessage = 'Permission error. You may not have access to view spaces.';
          }
        }
        
        setLoadError(errorMessage);
        log.debug('Page', 'Debug info:', { 
          userPresent: !!user, 
          authState: user ? 'authenticated' : 'unauthenticated',
          timestamp: new Date().toISOString(),
          retryCount
        });
      } finally {
        setIsLoading(false);
        clearTimeout(fetchTimeoutId);
      }
    }

    fetchSpaces();
    
    return () => clearTimeout(fetchTimeoutId);
  }, [user?.id, createFetch, retryCount]);

  // Effect to update spaces with real member counts from the hook
  useEffect(() => {
    if (!memberCountsLoading && Object.keys(memberCounts).length > 0) {
      setSpaces(currentSpaces => 
        currentSpaces.map(space => ({
          ...space,
          member_count: memberCounts[space.id]?.totalMembers || space.member_count || 0
        }))
      );
    }
  }, [memberCounts, memberCountsLoading]);

  useEffect(() => {
    let filtered = [...spaces];
    
    if (activeCategory !== 'all') {
      filtered = filtered.filter(space => 
        space.tags?.some(tag => tag.toLowerCase() === activeCategory.toLowerCase())
      );
    }
    
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(space => 
        space.name.toLowerCase().includes(query) || 
        (space.description && space.description.toLowerCase().includes(query))
      );
    }
    
    setFilteredSpaces(filtered);
  }, [activeCategory, searchQuery, spaces]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
  };

  const handleCreateSpace = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // User is always authenticated on discover page
    log.debug('Page', "Navigating to create space");
      navigate('/create-space', { replace: true });
  };

  const handleRetry = () => {
    try {
      setRetryCount(prev => prev + 1);
      toast({
        title: "Reloading page",
        description: "Refreshing data to resolve loading issues...",
        variant: "default"
      });
      log.debug('Page', `Retrying Discover page load (attempt ${retryCount + 1})`);
      setLoadError(null);
      setTimeout(() => window.location.reload(), 800);
    } catch (error) {
      log.error('Page', "Error during retry attempt:", error as Error);
      toast({
        title: "Retry failed",
        description: "Please try again or refresh the page manually",
        variant: "destructive"
      });
    }
  };

  // 🚀 PERFORMANCE: Progressive Authentication Enhancement (Background)
  // Guarded: only runs when actually on /discover to avoid background redirects from the shell
  useEffect(() => {
    // Ensure this effect only runs on the Discover route
    if (location.pathname !== '/discover') {
      return;
    }

    const enhanceWithAuth = async () => {
      // CRITICAL: Only run for authenticated users with valid session, and only once
      if (user?.id && !authEnhancementComplete && user.email) {
        log.debug('Page', '🚀 [Discover] Progressive auth enhancement starting...');
        try {
          // SAFETY: small delay to stabilize auth state
          await new Promise(resolve => setTimeout(resolve, 100));
          if (!user?.id || !user.email) {
            log.debug('Page', '🚀 [Discover] User state became invalid, skipping enhancement');
            setAuthEnhancementComplete(true);
            return;
          }
          // Background check: Should user be redirected to their space?
          const result = await aggressiveDiscoverOverride(user.id, navigate);
          if (result.redirected) {
            log.debug('Page', `🚀 [Discover] Background redirect applied: ${result.strategy}`);
            return; // User redirected, component may unmount
          }
          log.debug('Page', `🚀 [Discover] User legitimately belongs on discover: ${result.strategy}`);
          setAuthEnhancementComplete(true);
        } catch (error) {
          log.warn('Page', '🚀 [Discover] Background auth enhancement failed (non-critical):', error);
          setAuthEnhancementComplete(true);
        }
      } else if (!user) {
        setAuthEnhancementComplete(true);
      }
    };

    enhanceWithAuth();
  }, [user?.id, user?.email, navigate, authEnhancementComplete, location.pathname]);

  // 🚀 PUBLIC PAGE: No routing progress blocking needed
  // The page renders immediately for all users (public or authenticated)
  // Authentication enhancement happens in background without blocking UI

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
            <DiscoverHeader 
        user={user}
        isLoggingOut={isLoggingOut}
        onToggleSpaceDrawer={() => setSpaceDrawerOpen(true)}
      />

      {/* Mobile Space Drawer */}
      <MobileSpaceDrawer 
        isOpen={spaceDrawerOpen}
        onClose={() => setSpaceDrawerOpen(false)}
        currentSpaceSubdomain="_discover_"
        userId={user?.id || ''}
      />

      <main className="pb-16 sm:pb-0">
        <DiscoverHero 
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onSearchSubmit={handleSearch}
          onCreateSpace={handleCreateSpace}
        />

        <CategoryFilters 
          categories={DISCOVER_CATEGORIES}
          activeCategory={activeCategory}
          onCategoryChange={setActiveCategory}
        />

        <SpacesGrid 
          isLoading={isLoading}
          loadError={loadError}
          filteredSpaces={filteredSpaces}
          searchQuery={searchQuery}
          activeCategory={activeCategory}
          categories={DISCOVER_CATEGORIES}
          retryCount={retryCount}
          onRetry={handleRetry}
          onClearSearch={() => setSearchQuery('')}
          onSetActiveCategory={setActiveCategory}
        />
      </main>
      
      {/* Bottom Navigation */}
      <BottomNav />
    </div>
  );
}
