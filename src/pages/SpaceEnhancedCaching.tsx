// Enhanced caching implementation for Space component
// This file contains the caching enhancements that can be integrated into the Space.tsx file

import { useState, useEffect, useCallback } from "react";
import { useSpaceSettingsStore } from "@/hooks/useSpaceSettingsStore";

/**
 * Enhanced cache retrieval function for Space
 * @param subdomain The space subdomain
 * @returns The cached space data or null
 */
export function getSpaceFromCache(subdomain: string | undefined): { 
  space: any; 
  timestamp: number;
} | null {
  if (!subdomain) return null;
  
  try {
    const cacheKey = `space_data_${subdomain}`;
    const cachedData = sessionStorage.getItem(cacheKey);
    
    if (!cachedData) return null;
    
    const parsed = JSON.parse(cachedData);
    const cacheAge = Date.now() - parsed.timestamp;
    
    // Cache TTL: 5 minutes
    if (cacheAge > 5 * 60 * 1000) {
      console.log('[Space] Cache expired, will fetch fresh data');
      return null;
    }
    
    console.log('[Space] Retrieved from cache, age:', Math.round(cacheAge / 1000), 'seconds');
    return parsed;
  } catch (err) {
    console.warn('[Space] Failed to get from cache:', err);
    return null;
  }
}

/**
 * Enhanced cache storage function for Space
 * @param subdomain The space subdomain
 * @param data The space data to cache
 */
export function saveSpaceToCache(subdomain: string | undefined, data: any): void {
  if (!subdomain || !data) return;
  
  try {
    const cacheKey = `space_data_${subdomain}`;
    sessionStorage.setItem(cacheKey, JSON.stringify({
      space: data,
      timestamp: Date.now()
    }));
    console.log('[Space] Saved to cache');
  } catch (err) {
    console.warn('[Space] Failed to save to cache:', err);
  }
}

/**
 * Enhanced useEffect for quick recovery from cache
 * This can be added to the Space component
 */
export function useQuickRecoveryFromCache(
  subdomain: string | undefined,
  loadingSpace: boolean,
  setQuickRecoveryAttempted: (value: boolean) => void,
  quickRecoveryAttempted: boolean
): void {
  useEffect(() => {
    // Only attempt quick recovery once and only if we're in loading state
    if (!quickRecoveryAttempted && loadingSpace && subdomain) {
      setQuickRecoveryAttempted(true);
      
      const cachedData = getSpaceFromCache(subdomain);
      
      if (cachedData?.space) {
        console.log('[Space] Quick recovery from cache while fetching fresh data');
        // Load from cache (don't set loading to false yet - let the real fetch complete)
        useSpaceSettingsStore.setState({ 
          space: cachedData.space,
          loading: true // Keep loading true until the real fetch complete
        });
      }
    }
  }, [loadingSpace, subdomain, quickRecoveryAttempted, setQuickRecoveryAttempted]);
}

/**
 * Enhanced fetchInitialSpaceData with caching
 * This can replace the existing fetchInitialSpaceData in Space component
 */
export function createEnhancedSpaceDataFetcher(
  supabase: any,
  navigate: any,
  fetchSpaceSettings: any
) {
  return (
    subdomain: string | undefined, 
    user: any, 
    setLoadingSpace: (loading: boolean) => void
  ) => {
    const fetchInitialSpaceData = useCallback(async () => {
      if (!subdomain || !user) {
        setLoadingSpace(false);
        return;
      }
      
      setLoadingSpace(true);
      
      try {
        // Use existing Supabase query method
        console.log("Fetching space by subdomain:", subdomain);
        const { data: spaceData, error } = await supabase
          .from("spaces")
          .select("id, name, description, cover_image, icon_image, primary_color, member_count, pricing_type, price_per_month, subdomain, owner_id, is_private")
          .eq("subdomain", subdomain)
          .single();
              
        if (error) {
          console.error("Error fetching space data:", error);
          navigate('/discover');
          return;
        }
        
        if (spaceData) {
          // Cache the result for future quick recovery
          saveSpaceToCache(subdomain, {
            id: spaceData.id,
            name: spaceData.name,
            description: spaceData.description,
            about_description: null, // Set to null since it's not in the query
            cover_image: spaceData.cover_image,
            icon_image: spaceData.icon_image,
            subdomain: spaceData.subdomain,
            owner_id: spaceData.owner_id,
            is_private: spaceData.is_private,
            primary_color: spaceData.primary_color,
            member_count: spaceData.member_count,
            pricing_type: spaceData.pricing_type,
            price_per_month: spaceData.price_per_month
          });
          
          // Update the space in the store
          useSpaceSettingsStore.setState({ 
            space: {
              id: spaceData.id,
              name: spaceData.name,
              description: spaceData.description,
              about_description: null, // Set to null since it's not in the query
              cover_image: spaceData.cover_image,
              icon_image: spaceData.icon_image,
              subdomain: spaceData.subdomain,
              owner_id: spaceData.owner_id,
              is_private: spaceData.is_private
            }
          });
          
          // Also load space settings with full fields including about_description
          await fetchSpaceSettings(spaceData.id, user.id);
          
          // Update document title
          document.title = `${spaceData.name} | Lokaa`;
        } else {
          // Space not found, redirect to discover
          navigate('/discover');
        }
      } catch (error) {
        console.error('Error fetching space:', error);
        navigate('/discover');
      } finally {
        setLoadingSpace(false);
      }
    }, [subdomain, user, navigate, fetchSpaceSettings]);
    
    return fetchInitialSpaceData;
  };
}

/**
 * Enhanced loading state management
 * Prevents flickering of loading states for better UX
 */
export function useElegantLoadingState(
  loadingSpace: boolean
): {
  visibleLoading: boolean;
} {
  const [visibleLoading, setVisibleLoading] = useState(loadingSpace);
  const [loadStartTime, setLoadStartTime] = useState(0);
  
  useEffect(() => {
    if (loadingSpace && !visibleLoading) {
      // Started loading
      setVisibleLoading(true);
      setLoadStartTime(Date.now());
    } else if (!loadingSpace && visibleLoading) {
      // Finished loading - add a small delay for UX
      const loadingTime = Date.now() - loadStartTime;
      const minimumLoadingTime = 500; // ms
      
      if (loadingTime < minimumLoadingTime) {
        // If loading was too quick, keep showing loading state for a bit longer
        const remainingTime = minimumLoadingTime - loadingTime;
        setTimeout(() => setVisibleLoading(false), remainingTime);
      } else {
        setVisibleLoading(false);
      }
    }
  }, [loadingSpace, visibleLoading, loadStartTime]);
  
  return { visibleLoading };
}

/**
 * Asset preloading for Space images
 */
export function preloadSpaceImages(space: any): void {
  if (!space) return;
  
  const imagesToPreload = [
    space.cover_image,
    space.icon_image
  ].filter(Boolean);
  
  imagesToPreload.forEach(url => {
    if (typeof url === 'string') {
      console.log(`[Space] Preloading image: ${url.substring(0, 50)}...`);
      const img = new Image();
      img.onload = () => console.log(`[Space] Successfully preloaded: ${url.substring(0, 30)}...`);
      img.onerror = () => console.warn(`[Space] Failed to preload: ${url.substring(0, 30)}...`);
      img.src = url;
    }
  });
} 