import { log } from '@/utils/logger';
import React, { createContext, useContext, useState, useEffect, ReactNode, useRef } from 'react';
import { getSupabaseClient } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { getProtectedCurrentUser } from '@/utils/protectedAuth';

// Define the user profile data structure
export interface UserProfile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  profile_url: string | null;
  avatar_url: string | null;
  bio: string | null;
  role: "member" | "creator" | null;
  activity_score: number | null;
  social_links: Record<string, string> | null;
  created_at: string;
  followers: number | null;
  following: number | null;
  contributions: number | null;
  country: string | null;
  full_name: string | null;
  last_joined_space_id: string | null;
  location: string | null;
  updated_at: string | null;
  wallet_balance: number | null;
}

// Define user activity data for timeline
export interface UserActivity {
  id: string;
  type: string;
  created_at: string;
  meta: any;
  ref_id: string | null;
}

// Define the context type
interface UserProfileContextType {
  profile: UserProfile | null;
  isLoading: boolean;
  error: string | null;
  isCurrentUser: boolean;
  recentActivity: UserActivity[];
  activityLoading: boolean;
  fetchProfileBySlug: (slug: string) => Promise<void>;
  calculateLevel: (score: number) => number;
  calculateProgress: (score: number) => number;
  pointsToNextLevel: (score: number) => number;
  refreshProfile: () => Promise<void>;
}

// Create the context
const UserProfileContext = createContext<UserProfileContextType | undefined>(undefined);

// Custom hook to use the user profile context - FIXED: const export for Fast Refresh
export const useUserProfile = () => {
  const context = useContext(UserProfileContext);
  if (context === undefined) {
    throw new Error('useUserProfile must be used within a UserProfileProvider');
  }
  return context;
}

// Helper function to debounce API calls
function useDebouncedFetch() {
  const fetchInProgress = useRef<Record<string, boolean>>({});
  const fetchTimers = useRef<Record<string, NodeJS.Timeout>>({});
  const fetchCache = useRef<Record<string, {timestamp: number, data: any}>>({});
  const CACHE_TTL = 30000; // 30 seconds cache
  
  const debouncedFetch = async (
    key: string,
    fetchFn: () => Promise<any>,
    debounceMs = 300
  ) => {
    // Check cache first
    const now = Date.now();
    const cachedItem = fetchCache.current[key];
    if (cachedItem && (now - cachedItem.timestamp < CACHE_TTL)) {
      // Use cached data if it's fresh
      return cachedItem.data;
    }
    
    // If a fetch for this key is already in progress, don't start another one
    if (fetchInProgress.current[key]) {
      return;
    }
    
    // Clear any existing timer for this key
    if (fetchTimers.current[key]) {
      clearTimeout(fetchTimers.current[key]);
    }
    
    // Set a new timer
    return new Promise<void>((resolve) => {
      fetchTimers.current[key] = setTimeout(async () => {
        try {
          fetchInProgress.current[key] = true;
          const result = await fetchFn();
          // Cache the result
          fetchCache.current[key] = {
            timestamp: Date.now(),
            data: result
          };
          return result;
        } finally {
          fetchInProgress.current[key] = false;
          delete fetchTimers.current[key];
          resolve();
        }
      }, debounceMs);
    });
  };
  
  return debouncedFetch;
}

// Provider component
export function UserProfileProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isCurrentUser, setIsCurrentUser] = useState<boolean>(false);
  const [recentActivity, setRecentActivity] = useState<UserActivity[]>([]);
  const [activityLoading, setActivityLoading] = useState<boolean>(false);
  const [currentSlug, setCurrentSlug] = useState<string | null>(null);
  const debouncedFetch = useDebouncedFetch();
  const lastFetchedSlug = useRef<string | null>(null);

  // Calculate level from activity score
  const calculateLevel = (score: number) => Math.floor(score / 100) + 1;
  
  // Calculate progress to next level
  const calculateProgress = (score: number) => {
    const currentLevel = calculateLevel(score);
    const pointsForCurrentLevel = (currentLevel - 1) * 100;
    const progress = ((score - pointsForCurrentLevel) / 100);
    return Math.min(progress, 1);
  };
  
  // Calculate points needed for next level
  const pointsToNextLevel = (score: number) => {
    const currentLevel = calculateLevel(score);
    const nextLevelPoints = currentLevel * 100;
    return nextLevelPoints - score;
  };

  // Fetch user profile by slug
  const fetchProfileBySlug = async (slug: string) => {
    if (!slug) {
      log.error('Context', 'UserProfileContext: No profile slug provided');
      setError('No profile identifier provided');
      setIsLoading(false);
      return;
    }

    // If we're already loading this same slug, don't start another fetch
    if (isLoading && slug === lastFetchedSlug.current) {
      log.debug('Context', `UserProfileContext: Already loading profile for slug ${slug}`);
      return;
    }

    // If the slug has changed, reset the state
    if (lastFetchedSlug.current && lastFetchedSlug.current !== slug) {
      log.debug('Context', `UserProfileContext: Slug changed from ${lastFetchedSlug.current} to ${slug}, resetting state`);
      setProfile(null);
      setError(null);
      setIsCurrentUser(false);
      setRecentActivity([]);
    }

    // Set loading state and update lastFetchedSlug before starting the fetch
    setIsLoading(true);
    setError(null);
    lastFetchedSlug.current = slug;
    setCurrentSlug(slug);
    
    log.debug('Context', `UserProfileContext: Fetching profile for slug "${slug}"`);
    
    // Use debounced fetch to prevent multiple API calls
    await debouncedFetch(`profile-${slug}`, async () => {
      try {
        // Remove @ prefix if present
        const cleanSlug = slug.startsWith('@') ? slug.substring(1) : slug;
        
        // First attempt to fetch by profile_url
        log.debug('Context', `UserProfileContext: First attempt - fetching profile by profile_url = "${cleanSlug}"`);
        
        // Add timeout to prevent hanging queries
        const queryTimeout = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Query timeout')), 5000);
        });
        
        const queryPromise = getSupabaseClient()
          .from('users')
          .select(`
            id, first_name, last_name, profile_url, avatar_url, bio, 
            role, activity_score, social_links, created_at, followers, 
            following, contributions, country, full_name, 
            last_joined_space_id, location, updated_at, wallet_balance
          `)
          .eq('profile_url', cleanSlug)
          .single();
        
        let { data, error } = await Promise.race([queryPromise, queryTimeout])
          .catch(err => {
            if (err.message === 'Query timeout') {
              log.error('Context', `UserProfileContext: Query timeout for profile_url = "${cleanSlug}"`);
              setError('Profile loading timed out. Please try again.');
              setIsLoading(false);
              return { data: null, error: { message: 'Timeout' } };
            }
            throw err;
          }) as any;
        
        log.debug('Context', `UserProfileContext: Query result for profile_url = "${cleanSlug}":`, { data: !!data, error: error?.message || null });
          
        // If not found by profile_url, try using user ID
        if (error && error.code === 'PGRST116') {
          log.debug('Context', `UserProfileContext: Profile not found by profile_url, trying by user ID`);
          
          // Try by user ID if the slug looks like a UUID
          const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
          if (uuidPattern.test(cleanSlug)) {
            log.debug('Context', `UserProfileContext: Attempting lookup by UUID: ${cleanSlug}`);
            const response = await getSupabaseClient()
              .from('users')
              .select(`
                id, first_name, last_name, profile_url, avatar_url, bio, 
                role, activity_score, social_links, created_at, followers, 
                following, contributions, country, full_name, 
                last_joined_space_id, location, updated_at, wallet_balance
              `)
              .eq('id', cleanSlug)
              .single();
              
            data = response.data;
            error = response.error;
            log.debug('Context', `UserProfileContext: UUID lookup result:`, { data: !!data, error: error?.message || null });
          } else {
            log.debug('Context', `UserProfileContext: Slug "${cleanSlug}" is not a valid UUID, cannot try ID lookup`);
          }
        }
          
        if (error) {
          // Check if it's a "not found" error
          if (error.code === 'PGRST116') {
            log.error('Context', `UserProfileContext: Profile not found for slug: ${cleanSlug}`);
            setError(`User profile "${cleanSlug}" not found`);
            setIsLoading(false);
            return;
          }
          
          log.error('Context', 'UserProfileContext: Database error fetching profile:', error);
          setError(`Database error: ${error.message}`);
          setIsLoading(false);
          return;
        }

        if (!data) {
          log.error('Context', `UserProfileContext: No data returned for slug: ${cleanSlug}`);
          setError('Profile not found');
          setIsLoading(false);
          return;
        }

        log.debug('Context', `UserProfileContext: Successfully found profile:`, {
          id: data.id,
          profile_url: data.profile_url,
          full_name: data.full_name
        });

        // Fetch contributions count
        const { count: contributionsCount, error: contribError } = await getSupabaseClient()
          .from('user_activity_log')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', data.id);
        
        if (contribError) {
          log.warn('Context', 'Could not fetch contributions count (this is optional):', contribError);
          // Don't fail the entire profile load for this optional data
        }

        // Check if this is the current user - PROTECTED with IndexedDB bridge
        const { data: { user } } = await getProtectedCurrentUser();
        const isCurrentUserProfile = user?.id === data.id;
        
        if (isCurrentUserProfile) {
          log.debug('Context', `UserProfileContext: This is the current user's profile (${data.full_name})`);
        }

        // Prepare all data before updating state to minimize re-renders
        const profileData = { 
          ...data, 
          contributions: contributionsCount ?? 0 
        } as UserProfile;

        // Now update all states at once
        setProfile(profileData);
        setIsCurrentUser(isCurrentUserProfile);

        // Fetch recent activity
        await fetchUserActivity(data.id);
        
        return profileData;
      } catch (error: any) {
        log.error('Context', 'UserProfileContext: Error fetching profile:', error);
        setError('Could not load user profile');
        toast({
          title: "Error loading profile",
          description: "Could not load this user profile.",
          variant: "destructive"
        });
        return null;
      } finally {
        setIsLoading(false);
      }
    });
  };

  // Fetch user activity
  const fetchUserActivity = async (userId: string) => {
    setActivityLoading(true);
    try {
      const { data, error } = await getSupabaseClient()
        .from('user_activity_log')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(10);
        
      if (error) {
        log.warn('Context', 'Could not fetch user activity (this is optional):', error);
        // Don't fail the entire profile load for this optional data
        setRecentActivity([]);
        return;
      }
      
      setRecentActivity(data || []);
    } catch (error) {
      log.warn('Context', 'Error fetching user activity (this is optional):', error);
      setRecentActivity([]);
    } finally {
      setActivityLoading(false);
    }
  };

  // Refresh the current profile
  const refreshProfile = async () => {
    if (currentSlug) {
      await fetchProfileBySlug(currentSlug);
    }
  };

  // Provide the context value
  const value = {
    profile,
    isLoading,
    error,
    isCurrentUser,
    recentActivity,
    activityLoading,
    fetchProfileBySlug,
    calculateLevel,
    calculateProgress,
    pointsToNextLevel,
    refreshProfile
  };

  return (
    <UserProfileContext.Provider value={value}>
      {children}
    </UserProfileContext.Provider>
  );
} 