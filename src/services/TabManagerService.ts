import React from 'react';
import { Loader2 } from "lucide-react";
import { type SpaceTab } from "@/utils/tabUtils";
import { getSpaceFallbackData } from '@/utils/spaceDataFallback';
import { globalTabComponentManager } from "@/utils/globalTabComponentManager";

// Import all tab components
import AboutTab from "@/components/space/AboutTab";
import FeedTab from "@/components/space/FeedTab";
import CalendarTab from "@/components/space/CalendarTab";
import MembersTab from "@/components/space/MembersTab";
import LeaderboardsTab from "@/components/space/LeaderboardsTab";
import ClassroomTab from "@/components/space/ClassroomTab";

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
  static createTabComponent(
    tabKey: SpaceTab,
    dependencies: TabDependencies
  ): TabCreationResult {
    const { user, permissions, spaceData, subdomain, hasInstantAccess, postInputRef } = dependencies;

    if (!user?.id || !subdomain) {
      return { component: null, cached: false, created: false };
    }

    // Try to get existing component from global manager first
    const existingComponent = globalTabComponentManager.getTabComponent(subdomain, tabKey, user.id);
    if (existingComponent) {
      return { component: existingComponent, cached: true, created: false };
    }

    // Create new component if it doesn't exist
    const effectiveSpaceData = spaceData || getSpaceFallbackData(subdomain);
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`🌐 [TabManagerService] Creating NEW ${tabKey} component for ${subdomain}`);
    }

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
          component = React.createElement(ClassroomTab, {
            space: {
              id: effectiveSpaceData.id,
              name: effectiveSpaceData.name,
              owner_id: effectiveSpaceData.owner_id || 'f6064ebb-564a-49d2-a146-fb8615fd7ae2',
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

    // Store in global manager for persistence across remounts
    if (component && effectiveSpaceData?.id) {
      globalTabComponentManager.setTabComponent(
        subdomain, 
        tabKey, 
        user.id, 
        effectiveSpaceData.id, 
        component
      );
      
      if (process.env.NODE_ENV === 'development') {
        console.log(`🌐 [TabManagerService] Stored ${tabKey} component globally`);
      }
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