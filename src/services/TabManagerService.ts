import React from 'react';
import { Loader2 } from "lucide-react";
import { type SpaceTab } from "@/utils/tabUtils";
import { getSpaceFallbackData } from '@/utils/spaceDataFallback';
import { globalTabComponentManager } from "@/utils/globalTabComponentManager";
import { devLogger } from '@/utils/developmentLogger';

// Import all tab components
import AboutTab from "@/components/space/AboutTab";
import FeedTab from "@/components/space/FeedTab";
import CalendarTab from "@/components/space/CalendarTab";
import MembersTab from "@/components/space/MembersTab";
import LeaderboardsTab from "@/components/space/LeaderboardsTab";
import { ClassroomTabRefactored as ClassroomTab } from "@/components/classroom/ClassroomTabRefactored";

// Dependencies required for tab creation
export interface TabDependencies {
  user: any;
  permissions: {
    isOwner: boolean;
    isAdmin: boolean;
  };
  spaceData: any;
  subdomain: string;
  hasInstantAccess: boolean;
  postInputRef?: React.RefObject<HTMLTextAreaElement | HTMLInputElement | null>;
}

// Global admin status cache to prevent race conditions across component instances
const globalAdminStatusCache = new Map<string, {
  isComprehensiveAdmin: boolean;
  timestamp: number;
  expires: number;
}>();

const ADMIN_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Determine and cache comprehensive admin status to prevent race conditions
 */
async function getComprehensiveAdminStatus(user: any, spaceData: any): Promise<boolean> {
  if (!user?.id || !spaceData?.id) {
    return false;
  }

  const cacheKey = `${user.id}_${spaceData.id}`;
  const now = Date.now();
  
  // Check cache first
  const cached = globalAdminStatusCache.get(cacheKey);
  if (cached && now < cached.expires) {
    if (process.env.NODE_ENV === 'development') {
      devLogger.log('TabManager', `🔐 [Admin Cache] Using cached admin status for ${user.id}: ${cached.isComprehensiveAdmin}`);
    }
    return cached.isComprehensiveAdmin;
  }

  if (process.env.NODE_ENV === 'development') {
    devLogger.log('TabManager', `🔐 [Admin Check] Determining admin status for user ${user.id} in space ${spaceData.id}`);
  }

  try {
    const { getSupabaseClient } = await import('@/integrations/supabase/client');
    const supabase = getSupabaseClient();
    
    // Check if user is a general admin
    const { data: userProfile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();
    
    const isGeneralAdmin = userProfile?.role === 'admin';
    
    // Check if user is a space admin
    let isSpaceAdmin = false;
    const { data: spaceMembership, error: membershipError } = await supabase
      .from('space_members')
      .select('role, status')
      .eq('space_id', spaceData.id)
      .eq('user_id', user.id)
      .single();
    
    if (membershipError && membershipError.code !== 'PGRST116') {
      console.error('Error checking space membership:', membershipError);
    }
    
    isSpaceAdmin = spaceMembership?.role === 'admin' && spaceMembership?.status === 'active';
    
    // Check if user is the space owner
    const isSpaceOwner = spaceData?.owner_id === user.id;
    
    // User is comprehensive admin if they're general admin OR space admin OR space owner
    const isComprehensiveAdmin = isGeneralAdmin || isSpaceAdmin || isSpaceOwner;
    
    // Cache the result
    globalAdminStatusCache.set(cacheKey, {
      isComprehensiveAdmin,
      timestamp: now,
      expires: now + ADMIN_CACHE_DURATION
    });
    
    if (process.env.NODE_ENV === 'development') {
      devLogger.log('TabManager', `🔐 [Admin Check] Determined admin status: ${isComprehensiveAdmin} (general: ${isGeneralAdmin}, space: ${isSpaceAdmin}, owner: ${isSpaceOwner})`);
    }
    
    return isComprehensiveAdmin;
  } catch (error) {
    console.error('Error checking comprehensive admin status:', error);
    return false;
  }
}

// Tab creation result
export interface TabCreationResult {
  component: JSX.Element | null;
  cached: boolean;
  created: boolean;
}

/**
 * TabManagerService - Centralized tab component creation and management
 * 
 * Extracts complex tab creation logic from SpaceTabContent.tsx
 * Handles 6 different tab types with their specific prop requirements
 */
export class TabManagerService {
  /**
   * Create a tab component with proper dependencies
   */
  static async createTabComponent(
    tabKey: SpaceTab,
    dependencies: TabDependencies
  ): Promise<TabCreationResult> {
    const { user, permissions, spaceData, subdomain, hasInstantAccess, postInputRef } = dependencies;

    if (!user?.id) {
      return { component: null, cached: false, created: false };
    }

    // Handle subdomain extraction with fallback for navigation transitions
    let effectiveSubdomain = subdomain;
    if (!effectiveSubdomain) {
      // Fallback: Extract subdomain from current URL during navigation transitions
      const pathSegments = window.location.pathname.split('/').filter(Boolean);
      effectiveSubdomain = pathSegments[0]; // First segment should be subdomain
      
      if (process.env.NODE_ENV === 'development') {
        devLogger.log('TabManager', `Subdomain fallback used: ${effectiveSubdomain} (original: ${subdomain})`);
      }
    }
    
    if (!effectiveSubdomain) {
      return { component: null, cached: false, created: false };
    }

    // Re-enabled: Component caching is now safe since Phase 1 moved state to Zustand stores.
    // Components get fresh data from stores rather than stale JSX state.
    // CRITICAL FIX: Try multiple cache lookups to handle subdomain timing issues
    
    let existingComponent = globalTabComponentManager.getTabComponent(effectiveSubdomain, tabKey, user.id);
    
    // If cache miss with effectiveSubdomain, try original subdomain as fallback
    if (!existingComponent && subdomain && subdomain !== effectiveSubdomain) {
      existingComponent = globalTabComponentManager.getTabComponent(subdomain, tabKey, user.id);
    }
    
    // If still no cache hit, try checking by partial key match for robustness
    if (!existingComponent) {
      // Try both possible subdomains from window.location for comprehensive fallback
      const currentPathSegments = window.location.pathname.split('/').filter(Boolean);
      const currentSubdomain = currentPathSegments[0];
      if (currentSubdomain && currentSubdomain !== effectiveSubdomain && currentSubdomain !== subdomain) {
        existingComponent = globalTabComponentManager.getTabComponent(currentSubdomain, tabKey, user.id);
      }
    }
    
    if (existingComponent) {
      return { component: existingComponent, cached: true, created: false };
    }

    // Create new component if it doesn't exist
    const effectiveSpaceData = spaceData || getSpaceFallbackData(effectiveSubdomain);
    

    let component: JSX.Element | null = null;

    switch (tabKey) {
      case 'feed':
        component = React.createElement(FeedTab, {
          user: user,
          isOwner: permissions.isOwner,
          isAdmin: permissions.isAdmin,
          postInputRef: postInputRef,
          hasInstantAccess: hasInstantAccess
        });
        break;
        
      case 'about':
        component = React.createElement(AboutTab);
        break;
        
      case 'calendar':
        component = React.createElement(CalendarTab, {
          space: {
            id: effectiveSpaceData.id,
            name: effectiveSpaceData.name,
            owner_id: effectiveSpaceData.owner_id || 'fallback-owner',
          }
        });
        break;
        
      case 'members':
        component = React.createElement(MembersTab);
        break;
        
      case 'classroom':
        
        if (effectiveSpaceData?.id) {
          // CRITICAL FIX: Determine admin status before creating component to prevent race condition
          const isComprehensiveAdmin = await getComprehensiveAdminStatus(user, effectiveSpaceData);
          
          
          component = React.createElement(ClassroomTab, {
            space: {
              id: effectiveSpaceData.id,
              name: effectiveSpaceData.name,
              owner_id: effectiveSpaceData.owner_id,
            },
            // Pass precomputed admin status to prevent race condition
            precomputedAdminStatus: {
              isComprehensiveAdmin,
              adminCheckCompleted: true
            }
          });
          
        } else {
          component = React.createElement('div', {
            className: "p-4 text-center"
          }, [
            React.createElement(Loader2, {
              key: 'loader',
              className: "h-6 w-6 animate-spin mx-auto mb-2"
            }),
            React.createElement('div', { key: 'text' }, 'Loading classroom...')
          ]);
        }
        break;
        
      case 'leaderboard':
        if (effectiveSpaceData?.id) {
          component = React.createElement(LeaderboardsTab, {
            spaceId: effectiveSpaceData.id,
            spaceName: effectiveSpaceData.name
          });
        } else {
          component = React.createElement('div', {
            className: "p-4 text-center"
          }, [
            React.createElement(Loader2, {
              key: 'loader',
              className: "h-6 w-6 animate-spin mx-auto mb-2"
            }),
            React.createElement('div', { key: 'text' }, 'Loading leaderboard...')
          ]);
        }
        break;
        
      default:
        return { component: null, cached: false, created: false };
    }

    // Re-enabled: Component caching with Zustand state management
    // Store in global manager for persistence across remounts
    if (component && effectiveSpaceData?.id) {
      globalTabComponentManager.setTabComponent(
        effectiveSubdomain, 
        tabKey, 
        user.id, 
        effectiveSpaceData.id, 
        component
      );
    }

    return { component, cached: false, created: true };
  }

  /**
   * Validate that all required dependencies are available for tab creation
   */
  static validateTabDependencies(tabKey: SpaceTab, dependencies: TabDependencies): boolean {
    const { user, subdomain, spaceData } = dependencies;
    
    // Basic requirements for all tabs
    if (!user?.id || !subdomain) {
      return false;
    }

    // Space-dependent tabs require valid space data
    if (['classroom', 'leaderboard', 'calendar'].includes(tabKey)) {
      const effectiveSpaceData = spaceData || getSpaceFallbackData(subdomain);
      return !!effectiveSpaceData?.id;
    }

    return true;
  }

  /**
   * Get display name for tab
   */
  static getTabDisplayName(tabKey: SpaceTab): string {
    switch (tabKey) {
      case 'feed': return 'Feed';
      case 'about': return 'About';
      case 'members': return 'Members';
      case 'classroom': return 'Classroom';
      case 'calendar': return 'Calendar';
      case 'leaderboard': return 'Leaderboard';
      default: return 'Unknown';
    }
  }

  /**
   * Check if a tab requires special permissions
   */
  static requiresSpecialPermissions(tabKey: SpaceTab): boolean {
    // Currently no tabs require special permissions
    // This can be extended in the future
    return false;
  }

  /**
   * Get tab priority for loading order
   */
  static getTabPriority(tabKey: SpaceTab): number {
    switch (tabKey) {
      case 'feed': return 1; // Highest priority
      case 'about': return 2;
      case 'members': return 3;
      case 'calendar': return 4;
      case 'classroom': return 5;
      case 'leaderboard': return 6;
      default: return 10;
    }
  }
} 